/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  Query,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Delete,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { DailyHealth, DailyHealthDocument } from './daily-health.schema';
import { Student, StudentDocument } from '../students/student.schema';
import { ClassEntity, ClassDocument } from '../classes/class.schema';
import { Parent, ParentDocument } from '../parents/parent.schema';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

function toObjectIdOrThrow(id: string, label = 'id') {
  const s = String(id || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!Types.ObjectId.isValid(s))
    throw new BadRequestException(`ID không hợp lệ: ${label}`);
  return new Types.ObjectId(s);
}
function dayRange(dateStr: string) {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('health')
export class DailyHealthController {
  constructor(
    @InjectModel(DailyHealth.name) private model: Model<DailyHealthDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(ClassEntity.name) private classModel: Model<ClassDocument>,
    @InjectModel(Parent.name) private parentModel: Model<ParentDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  private async assertParentOwnsStudent(req: any, sidRaw?: string) {
    const parentId = req.user?.sub || req.user?.userId;
    if (!parentId) throw new ForbiddenException('Không xác định phụ huynh');
    const parent = await this.parentModel
      .findById(new Types.ObjectId(parentId))
      .select('studentIds')
      .lean();
    if (!parent) throw new ForbiddenException('Parent not found');

    const sid = (sidRaw || req.user?.studentId || '').toString();
    if (!sid) throw new BadRequestException('Thiếu studentId');
    const sidObj = toObjectIdOrThrow(sid, 'studentId');

    const owned = (parent.studentIds || []).some(
      (x: any) => x.toString() === sidObj.toString(),
    );
    if (!owned) throw new ForbiddenException('Học sinh không thuộc phụ huynh');
    return sidObj;
  }

  @Roles('teacher', 'admin')
  @Get('dates')
  async listDates(
    @Req() req: any,
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (req.user.role === 'teacher' && !classId)
      throw new BadRequestException('Thiếu classId');

    const match: any = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = dayRange(from).start;
      if (to) match.date.$lte = dayRange(to).end;
    }
    if (classId) match.classId = toObjectIdOrThrow(classId, 'classId');

    const rows = await this.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    return rows.map((r) => ({ date: r._id as string, count: r.count }));
  }

  @Roles('teacher', 'admin')
  @Get('by-date/:date')
  async byDateAndClass(
    @Req() req: any,
    @Param('date') date: string,
    @Query('classId') classId?: string,
  ) {
    if (!date) throw new BadRequestException('Thiếu ngày');
    if (req.user.role === 'teacher' && !classId)
      throw new BadRequestException('Thiếu classId');
    if (!classId) throw new BadRequestException('Thiếu classId');

    const classObjId = toObjectIdOrThrow(classId, 'classId');
    const { start, end } = dayRange(date);

    const students = await this.studentModel
      .find({ classId: classObjId })
      .select('_id fullName studentId')
      .lean();

    const docs = await this.model
      .find({ classId: classObjId, date: { $gte: start, $lte: end } })
      .select(
        '_id studentId date healthStatus behaviorNotes activityLevel socialInteraction requiresAttention parentNotified',
      )
      .lean();

    const byStu = new Map<string, any>();
    for (const d of docs) byStu.set(String(d.studentId), d);

    return students.map((s: any) => {
      const d = byStu.get(String(s._id));
      return {
        student: { _id: s._id, name: s.fullName, studentId: s.studentId },
        hasRecord: !!d,
        doc: d || null,
      };
    });
  }

  @Roles('teacher', 'admin')
  @Post('bulk')
  async bulkCreate(
    @Req() req: any,
    @Body()
    body: {
      date: string;
      classId: string;
      healthStatus?: any;
      behaviorNotes?: string;
      activityLevel?: string;
      socialInteraction?: string;
      parentNotified?: boolean;
      requiresAttention?: boolean;
    },
  ) {
    if (!body?.date || !body?.classId)
      throw new BadRequestException('Thiếu date/classId');
    const { start, end } = dayRange(body.date);
    const classObjId = toObjectIdOrThrow(body.classId, 'classId');

    const attend = await this.connection
      .collection('attendance')
      .findOne({ classId: classObjId, date: { $gte: start, $lte: end } });

    if (!attend || !Array.isArray(attend.attendanceList))
      throw new BadRequestException('Chưa có điểm danh cho ngày này');

    const presentIds = (attend.attendanceList || [])
      .filter((a: any) => ['present', 'late'].includes(a.status))
      .map((a: any) => new Types.ObjectId(a.studentId));

    if (!presentIds.length)
      throw new BadRequestException('Không có học sinh có mặt trong ngày');

    const existing = await this.model
      .find({ classId: classObjId, date: { $gte: start, $lte: end } })
      .select('studentId');
    const existSet = new Set(existing.map((d) => String(d.studentId)));

    const toInsert = presentIds
      .filter((sid) => !existSet.has(String(sid)))
      .map((sid) => ({
        studentId: sid,
        classId: classObjId,
        date: new Date(body.date),
        healthStatus: body.healthStatus || {},
        behaviorNotes: body.behaviorNotes,
        activityLevel: body.activityLevel,
        socialInteraction: body.socialInteraction,
        parentNotified: !!body.parentNotified,
        requiresAttention: !!body.requiresAttention,
        recordedBy: new Types.ObjectId(req.user.sub || req.user.userId),
      }));

    if (!toInsert.length) return { inserted: 0, skipped: presentIds.length };

    await this.model.insertMany(toInsert);
    return {
      inserted: toInsert.length,
      skipped: presentIds.length - toInsert.length,
    };
  }

  @Roles('teacher', 'admin')
  @Put('bulk')
  async bulkUpdate(
    @Req() req: any,
    @Body()
    body: {
      date: string;
      classId: string;
      healthStatus?: any;
      behaviorNotes?: string;
      activityLevel?: string;
      socialInteraction?: string;
      parentNotified?: boolean;
      requiresAttention?: boolean;
    },
  ) {
    if (!body?.date || !body?.classId)
      throw new BadRequestException('Thiếu date/classId');
    const { start, end } = dayRange(body.date);
    const classObjId = toObjectIdOrThrow(body.classId, 'classId');

    const attend = await this.connection
      .collection('attendance')
      .findOne({ classId: classObjId, date: { $gte: start, $lte: end } });

    if (!attend || !Array.isArray(attend.attendanceList))
      throw new BadRequestException('Chưa có điểm danh cho ngày này');

    const presentIds = (attend.attendanceList || [])
      .filter((a: any) => ['present', 'late'].includes(a.status))
      .map((a: any) => new Types.ObjectId(a.studentId));

    if (!presentIds.length)
      throw new BadRequestException('Không có học sinh có mặt để cập nhật');

    const patch: any = {};
    if (body.healthStatus) patch.healthStatus = body.healthStatus;
    if (body.behaviorNotes !== undefined)
      patch.behaviorNotes = body.behaviorNotes;
    if (body.activityLevel !== undefined)
      patch.activityLevel = body.activityLevel;
    if (body.socialInteraction !== undefined)
      patch.socialInteraction = body.socialInteraction;
    if (body.parentNotified !== undefined)
      patch.parentNotified = !!body.parentNotified;
    if (body.requiresAttention !== undefined)
      patch.requiresAttention = !!body.requiresAttention;

    if (!Object.keys(patch).length)
      throw new BadRequestException('Không có dữ liệu để cập nhật');

    const r = await this.model.updateMany(
      {
        classId: classObjId,
        studentId: { $in: presentIds },
        date: { $gte: start, $lte: end },
      },
      { $set: patch },
    );

    return { matched: r.matchedCount, modified: r.modifiedCount };
  }

  @Roles('teacher', 'admin')
  @Post()
  async create(@Req() req: any, @Body() dto: any) {
    const studentId =
      req.user.role === 'parent' ? req.user.studentId : dto.studentId;
    if (!studentId) throw new BadRequestException('Thiếu studentId');

    let classId = dto.classId;
    if (!classId) {
      const stu = await this.studentModel
        .findById(new Types.ObjectId(studentId))
        .select('classId');
      classId = stu?.classId?.toString();
    }
    if (!classId) throw new BadRequestException('Không xác định được classId');

    return new this.model({
      studentId: new Types.ObjectId(studentId),
      date: new Date(dto.date),
      classId: new Types.ObjectId(classId),
      healthStatus: dto.healthStatus || {},
      behaviorNotes: dto.behaviorNotes,
      activityLevel: dto.activityLevel,
      socialInteraction: dto.socialInteraction,
      recordedBy: new Types.ObjectId(req.user.sub || req.user.userId),
      parentNotified: !!dto.parentNotified,
      requiresAttention: !!dto.requiresAttention,
    }).save();
  }

  @Roles('parent')
  @Get('dates/my')
  async myHealthDates(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const sid = req.user?.studentId;
    if (!sid) throw new BadRequestException('Không xác định được học sinh');
    const match: any = { studentId: new Types.ObjectId(sid) };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = dayRange(from).start;
      if (to) match.date.$lte = dayRange(to).end;
    }
    const rows = await this.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    return rows.map((r) => ({ date: r._id as string, count: r.count }));
  }

  @Roles('parent')
  @Get('by-date/:date/my')
  async myHealthByDate(@Req() req: any, @Param('date') date: string) {
    if (!date) throw new BadRequestException('Thiếu ngày');
    const sid = req.user?.studentId;
    if (!sid) throw new BadRequestException('Không xác định được học sinh');
    const { start, end } = dayRange(date);
    const doc = await this.model.findOne({
      studentId: new Types.ObjectId(sid),
      date: { $gte: start, $lte: end },
    });
    return {
      date,
      hasRecord: !!doc,
      doc: doc || null,
    };
  }

  @Roles('parent')
  @Get('dates-mine')
  async parentDates(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('studentId') studentId?: string,
  ) {
    const sid = await this.assertParentOwnsStudent(req, studentId);

    const match: any = { studentId: sid };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from + 'T00:00:00.000Z');
      if (to) match.date.$lte = new Date(to + 'T23:59:59.999Z');
    }
    const rows = await this.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    return rows.map((r) => ({ date: r._id, count: r.count }));
  }

  @Roles('parent')
  @Get('by-date-mine/:date')
  async parentByDate(
    @Req() req: any,
    @Param('date') dateStr: string,
    @Query('studentId') studentId?: string,
  ) {
    const sid = await this.assertParentOwnsStudent(req, studentId);
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');
    const doc = await this.model
      .findOne({ studentId: sid, date: { $gte: start, $lte: end } })
      .select(
        '_id studentId classId date healthStatus behaviorNotes activityLevel socialInteraction parentNotified requiresAttention recordedBy',
      );
    return { doc };
  }

  @Roles('teacher', 'admin', 'parent')
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Health record not found');
    return doc;
  }

  @Roles('teacher', 'admin')
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() patch: any) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Health record not found');
    if (req.user.role === 'parent') {
      if (doc.studentId.toString() !== req.user.studentId)
        throw new ForbiddenException('Không có quyền');
      if (doc.recordedBy.toString() !== (req.user.sub || req.user.userId))
        throw new ForbiddenException('Chỉ chỉnh bản ghi do bạn tạo');
    }
    if (req.user.role === 'teacher') {
      const stu = await this.studentModel
        .findById(doc.studentId)
        .select('classId');
      if (!stu?.classId) throw new ForbiddenException('No class bound');
      const tid = new Types.ObjectId(req.user.sub || req.user.userId);
      const owns = await this.classModel.exists({
        _id: new Types.ObjectId(stu.classId),
        $or: [{ teacherId: tid }, { assistantTeacherId: tid }],
      });
      if (!owns) throw new ForbiddenException('Không có quyền sửa bản ghi này');
    }

    const payload: any = { ...patch };
    if (patch.date) payload.date = new Date(patch.date);
    if (patch.classId) payload.classId = new Types.ObjectId(patch.classId);
    return this.model.findByIdAndUpdate(id, payload, { new: true });
  }

  @Roles('teacher', 'admin')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Health record not found');
    if (req.user.role === 'parent') {
      if (doc.studentId.toString() !== req.user.studentId)
        throw new ForbiddenException('Không có quyền');
      if (doc.recordedBy.toString() !== (req.user.sub || req.user.userId))
        throw new ForbiddenException('Chỉ xoá bản ghi do bạn tạo');
    }
    await this.model.deleteOne({ _id: doc._id });
    return { deleted: 1 };
  }
}
