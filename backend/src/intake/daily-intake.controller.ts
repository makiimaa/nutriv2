/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { DailyIntake, DailyIntakeDocument } from './daily-intake.schema';
import { FoodItem, FoodItemDocument } from '../food-items/food-item.schema';
import { Student, StudentDocument } from '../students/student.schema';
import { ObjectIdPipe } from '../common/objectid.pipe';
import { Parent, ParentDocument } from '../parents/parent.schema';

function toObjectIdOrThrow(id: string, label = 'id') {
  const s = String(id || '').trim();

  const cleaned = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!Types.ObjectId.isValid(cleaned)) {
    console.warn('[intake/dates] invalid ObjectId', {
      label,
      raw: id,
      cleaned,
    });
    throw new BadRequestException('ID không hợp lệ');
  }
  return new Types.ObjectId(cleaned);
}

function dayRange(dateStr: string) {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function currentUserId(req: any) {
  return new Types.ObjectId(req.user?.sub || req.user?.userId);
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('intake')
export class DailyIntakeController {
  constructor(
    @InjectModel(DailyIntake.name) private model: Model<DailyIntakeDocument>,
    @InjectModel(FoodItem.name) private foodModel: Model<FoodItemDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
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

  private async computeMeal(meal: any) {
    const totals: any = {};

    const rows = meal?.actualIntake || [];
    if (rows.length) {
      const ids = rows.map((i: any) => new Types.ObjectId(i.foodItemId));
      const map = new Map<string, any>();
      (await this.foodModel.find({ _id: { $in: ids } })).forEach((fi) =>
        map.set(fi._id.toString(), fi),
      );
      for (const it of rows) {
        const fi = map.get(String(it.foodItemId));
        if (!fi) continue;
        const ratioPlan = (it.plannedQuantity || 0) / 100;
        const ratioAct = (it.actualQuantity || 0) / 100;
        it.consumptionRate =
          ratioPlan > 0 ? Math.round((ratioAct / ratioPlan) * 100) : undefined;
        for (const k of Object.keys(fi.nutrition || {})) {
          totals[k] = (totals[k] || 0) + (fi.nutrition[k] || 0) * ratioAct;
        }
      }
    }

    const adhoc = meal?.adHocFoods || [];
    for (const it of adhoc) {
      const nut = it?.nutrition || {};
      const ratioAct = (it?.quantity || 0) / 100;
      for (const k of Object.keys(nut)) {
        totals[k] = (totals[k] || 0) + (nut[k] || 0) * ratioAct;
      }
    }

    Object.keys(totals).forEach(
      (k) => (totals[k] = Math.round(totals[k] * 100) / 100),
    );
    return { ...meal, totalNutritionIntake: totals };
  }

  private async computeDayTotals(mealIntakes: any) {
    const dayTotals: any = {};
    for (const part of [
      mealIntakes?.breakfast?.totalNutritionIntake,
      mealIntakes?.lunch?.totalNutritionIntake,
      mealIntakes?.snack?.totalNutritionIntake,
    ]) {
      for (const k of Object.keys(part || {}))
        dayTotals[k] = (dayTotals[k] || 0) + (part[k] || 0);
    }
    Object.keys(dayTotals).forEach(
      (k) => (dayTotals[k] = Math.round(dayTotals[k] * 100) / 100),
    );
    return dayTotals;
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

    const mealIntakes = {
      breakfast: await this.computeMeal(dto.mealIntakes?.breakfast || {}),
      lunch: await this.computeMeal(dto.mealIntakes?.lunch || {}),
      snack: await this.computeMeal(dto.mealIntakes?.snack || {}),
    };
    const dayTotals = await this.computeDayTotals(mealIntakes);

    return new this.model({
      studentId: new Types.ObjectId(studentId),
      date: new Date(dto.date),
      classId: new Types.ObjectId(classId),
      mealIntakes,
      dailyTotalIntake: dayTotals,
      notes: dto.notes,
      recordedBy: new Types.ObjectId(req.user.sub || req.user.userId),
    }).save();
  }

  @Roles('teacher', 'admin', 'parent')
  @Get('student/:studentId')
  list(
    @Req() req: any,
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (req.user.role === 'parent' && req.user.studentId !== studentId) {
      throw new ForbiddenException('Không có quyền');
    }
    const q: any = { studentId: new Types.ObjectId(studentId) };
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    return this.model.find(q).sort({ date: -1, _id: -1 });
  }

  @Roles('teacher', 'admin')
  @Get('dates')
  async listDates(
    @Req() req: any,
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (req.user.role === 'teacher' && !classId) {
      throw new BadRequestException('Thiếu classId');
    }

    const match: any = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = dayRange(from).start;
      if (to) match.date.$lte = dayRange(to).end;
    }

    if (classId) {
      const classObjId = toObjectIdOrThrow(classId, 'classId');
      match.classId = classObjId;
    }

    console.log('[intake/dates] match=', JSON.stringify(match));

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

  @Roles('teacher', 'admin')
  @Get('by-date/:date')
  async listByDateAndClass(
    @Req() req: any,
    @Param('date') dateStr: string,
    @Query('classId') classId?: string,
  ) {
    if (!dateStr) throw new BadRequestException('Thiếu ngày');
    if (req.user.role === 'teacher' && !classId)
      throw new BadRequestException('Thiếu classId');

    if (!classId) throw new BadRequestException('Thiếu classId');

    const classObjId = toObjectIdOrThrow(classId, 'classId');
    const { start: dayStart, end: dayEnd } = dayRange(dateStr);

    const students = await this.studentModel
      .find({ classId: classObjId })
      .select('_id fullName studentId')
      .lean();

    const docs = await this.model
      .find({
        classId: classObjId,
        date: { $gte: dayStart, $lte: dayEnd },
      })
      .select('_id studentId date mealIntakes dailyTotalIntake notes');

    const byStu = new Map<string, any>();
    docs.forEach((d) => byStu.set(d.studentId.toString(), d));

    return students.map((s: any) => {
      const d = byStu.get(s._id.toString());
      return {
        student: {
          _id: s._id,
          name: s.fullName,
          studentId: s.studentId,
        },
        hasRecord: !!d,
        doc: d || null,
      };
    });
  }

  @Roles('parent')
  @Get('dates/my')
  async myDates(
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
  async myByDate(@Req() req: any, @Param('date') date: string) {
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
  async intakeDatesMine(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('studentId') studentId?: string,
  ) {
    const sid = await this.assertParentOwnsStudent(req, studentId);
    const match: any = { studentId: sid };
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
  @Get('by-date-mine/:date')
  async intakeByDateMine(
    @Req() req: any,
    @Param('date') dateStr: string,
    @Query('studentId') studentId?: string,
  ) {
    if (!dateStr) throw new BadRequestException('Thiếu ngày');
    const sid = await this.assertParentOwnsStudent(req, studentId);
    const { start, end } = dayRange(dateStr);

    const doc = await this.model
      .findOne({ studentId: sid, date: { $gte: start, $lte: end } })
      .select(
        '_id studentId classId date mealIntakes dailyTotalIntake notes recordedBy',
      );

    if (!doc) return { date: dateStr, hasRecord: true, doc };

    const ids = new Set<string>();
    const meals: Array<'breakfast' | 'lunch' | 'snack'> = [
      'breakfast',
      'lunch',
      'snack',
    ];
    for (const k of meals) {
      const rows = (doc as any)?.mealIntakes?.[k]?.actualIntake || [];
      for (const r of rows) {
        if (r?.foodItemId) ids.add(String(r.foodItemId));
      }
    }

    let fmap = new Map<string, { name: string; unit?: string }>();
    if (ids.size) {
      const arr = Array.from(ids).map((id) => new Types.ObjectId(id));
      const items = await this.foodModel
        .find({ _id: { $in: arr } })
        .select('_id name unit')
        .lean();
      fmap = new Map(
        items.map((it) => [String(it._id), { name: it.name, unit: it.unit }]),
      );
    }

    const enrich = (rows: any[] = []) =>
      rows.map((r) => ({
        ...r,
        foodInfo: fmap.get(String(r.foodItemId)) || null,
      }));

    const mealIntakes = {
      breakfast: {
        ...(doc as any).mealIntakes?.breakfast,
        actualIntake: enrich((doc as any).mealIntakes?.breakfast?.actualIntake),
      },
      lunch: {
        ...(doc as any).mealIntakes?.lunch,
        actualIntake: enrich((doc as any).mealIntakes?.lunch?.actualIntake),
      },
      snack: {
        ...(doc as any).mealIntakes?.snack,
        actualIntake: enrich((doc as any).mealIntakes?.snack?.actualIntake),
      },
    };

    return {
      date: dateStr,
      hasRecord: true,
      doc: {
        ...(doc.toObject ? doc.toObject() : doc),
        mealIntakes,
      },
    };
  }

  @Roles('teacher', 'admin', 'parent')
  @Get(':id')
  async getOne(@Req() req: any, @Param('id', ObjectIdPipe) id: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Intake not found');
    if (
      req.user.role === 'parent' &&
      doc.studentId.toString() !== req.user.studentId
    ) {
      throw new ForbiddenException('Không có quyền');
    }
    return doc;
  }

  @Roles('teacher', 'admin')
  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id', ObjectIdPipe) id: string,
    @Body() body: any,
  ) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Intake not found');
    if (req.user.role === 'parent') {
      if (doc.studentId.toString() !== req.user.studentId)
        throw new ForbiddenException('Không có quyền');
      if (doc.recordedBy.toString() !== (req.user.sub || req.user.userId))
        throw new ForbiddenException('Chỉ chỉnh bản ghi do bạn tạo');
    }

    const patch: any = {};
    if (body.notes !== undefined) patch.notes = body.notes;

    if (body.mealIntakes) {
      const breakfast = await this.computeMeal(
        body.mealIntakes.breakfast ?? doc.mealIntakes?.breakfast ?? {},
      );
      const lunch = await this.computeMeal(
        body.mealIntakes.lunch ?? doc.mealIntakes?.lunch ?? {},
      );
      const snack = await this.computeMeal(
        body.mealIntakes.snack ?? doc.mealIntakes?.snack ?? {},
      );
      patch.mealIntakes = { breakfast, lunch, snack };
      patch.dailyTotalIntake = await this.computeDayTotals(patch.mealIntakes);
    }

    return this.model.findByIdAndUpdate(id, patch, { new: true });
  }

  @Roles('teacher', 'admin')
  @Post('bulk')
  async bulkCreate(
    @Req() req: any,
    @Body()
    body: {
      date: string;
      classId: string;
      notes?: string;
      mealIntakes?: any;
    },
  ) {
    if (!body?.date || !body?.classId)
      throw new BadRequestException('Thiếu date/classId');

    const { start: dayStart, end: dayEnd } = dayRange(body.date);
    const classObjId = toObjectIdOrThrow(body.classId, 'classId');

    const attend = await this.connection
      .collection('attendance')
      .findOne({ classId: classObjId, date: { $gte: dayStart, $lte: dayEnd } });

    if (!attend || !Array.isArray(attend.attendanceList))
      throw new BadRequestException('Chưa có điểm danh cho ngày này');

    const presentIds = (attend.attendanceList || [])
      .filter((a: any) => ['present', 'late'].includes(a.status))
      .map((a: any) => new Types.ObjectId(a.studentId));

    if (!presentIds.length)
      throw new BadRequestException('Không có học sinh có mặt trong ngày');

    const existing = await this.model
      .find({ classId: classObjId, date: { $gte: dayStart, $lte: dayEnd } })
      .select('studentId');
    const existSet = new Set(existing.map((d) => d.studentId.toString()));

    const mealIntakes = {
      breakfast: await this.computeMeal(body.mealIntakes?.breakfast || {}),
      lunch: await this.computeMeal(body.mealIntakes?.lunch || {}),
      snack: await this.computeMeal(body.mealIntakes?.snack || {}),
    };
    const dayTotals = await this.computeDayTotals(mealIntakes);

    const toInsert = presentIds
      .filter((sid) => !existSet.has(sid.toString()))
      .map((sid) => ({
        studentId: sid,
        classId: classObjId,
        date: new Date(body.date),
        notes: body.notes,
        mealIntakes,
        dailyTotalIntake: dayTotals,
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
      notes?: string;
      mealIntakes?: any;
    },
  ) {
    if (!body?.date || !body?.classId)
      throw new BadRequestException('Thiếu date/classId');

    const { start: dayStart, end: dayEnd } = dayRange(body.date);
    const classObjId = toObjectIdOrThrow(body.classId, 'classId');

    const attend = await this.connection
      .collection('attendance')
      .findOne({ classId: classObjId, date: { $gte: dayStart, $lte: dayEnd } });

    if (!attend || !Array.isArray(attend.attendanceList))
      throw new BadRequestException('Chưa có điểm danh cho ngày này');

    const presentIds = (attend.attendanceList || [])
      .filter((a: any) => ['present', 'late'].includes(a.status))
      .map((a: any) => new Types.ObjectId(a.studentId));

    if (!presentIds.length)
      throw new BadRequestException('Không có học sinh có mặt để cập nhật');

    const patch: any = {};
    if (body.notes !== undefined) patch.notes = body.notes;

    if (body.mealIntakes) {
      const breakfast = await this.computeMeal(
        body.mealIntakes.breakfast || {},
      );
      const lunch = await this.computeMeal(body.mealIntakes.lunch || {});
      const snack = await this.computeMeal(body.mealIntakes.snack || {});
      patch.mealIntakes = { breakfast, lunch, snack };
      patch.dailyTotalIntake = await this.computeDayTotals(patch.mealIntakes);
    }

    if (!Object.keys(patch).length)
      throw new BadRequestException('Không có dữ liệu để cập nhật');

    const r = await this.model.updateMany(
      {
        classId: classObjId,
        studentId: { $in: presentIds },
        date: { $gte: dayStart, $lte: dayEnd },
      },
      { $set: patch },
    );

    return { matched: r.matchedCount, modified: r.modifiedCount };
  }

  @Roles('teacher', 'admin')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id', ObjectIdPipe) id: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Intake not found');

    if (req.user.role === 'parent') {
      if (doc.studentId.toString() !== req.user.studentId)
        throw new ForbiddenException('Không có quyền');
      if (doc.recordedBy.toString() !== (req.user.sub || req.user.userId))
        throw new ForbiddenException('Chỉ xoá bản ghi do bạn tạo');
    }
    await this.model.deleteOne({ _id: doc._id });
    return { deleted: true };
  }
}
