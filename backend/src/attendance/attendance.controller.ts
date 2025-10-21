/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './attendance.schema';
import { ClassEntity, ClassDocument } from '../classes/class.schema';

function normalizeDate(date?: string) {
  const dstr =
    (date || new Date().toISOString().slice(0, 10)) + 'T00:00:00.000Z';
  const d = new Date(dstr);
  d.setHours(0, 0, 0, 0);
  return d;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    @InjectModel(Attendance.name) private model: Model<AttendanceDocument>,
    @InjectModel(ClassEntity.name) private classModel: Model<ClassDocument>,
  ) {}

  private async assertOwnsClass(req: any, classId: string) {
    const tid = new Types.ObjectId(req.user.sub || req.user.userId);
    const cls = await this.classModel
      .findById(classId)
      .select('_id teacherId assistantTeacherIds');
    if (!cls) throw new ForbiddenException('Class không tồn tại');

    const owns =
      req.user.role === 'admin' ||
      cls.teacherId?.equals(tid) ||
      (Array.isArray(cls.assistantTeacherIds) &&
        cls.assistantTeacherIds.some((x: Types.ObjectId) => x?.equals(tid)));

    if (!owns) throw new ForbiddenException('Không có quyền lớp này');
    return cls;
  }

  private recomputeTotals(list: Attendance['attendanceList']) {
    const present = list.filter(
      (i) => i.status === 'present' || i.status === 'late',
    ).length;
    const absent = list.filter((i) => i.status === 'absent').length;
    return { present, absent };
  }

  private tagByTime(row: any, cls: any) {
    if (!cls?.schedule) return row;
    const { startTime, endTime } = cls.schedule;
    const arrive = row.arrivalTime ? new Date(row.arrivalTime) : null;
    const leave = row.departureTime ? new Date(row.departureTime) : null;

    let isOnTime = false,
      isLate = false,
      isLeftEarly = false;

    if (arrive && startTime && arrive > new Date(startTime)) {
      isLate = true;
    } else if (arrive) {
      isOnTime = true;
    }

    if (leave && endTime && leave < new Date(endTime)) {
      isLeftEarly = true;
    }

    return { ...row, isOnTime, isLate, isLeftEarly };
  }

  @Roles('teacher', 'admin')
  @Post()
  async upsert(
    @Req() req: any,
    @Body()
    body: {
      classId: string;
      date?: string;
      rows: Array<{
        studentId: string;
        status?: 'present' | 'absent' | 'late' | 'early_leave';
        note?: string;
        recognitionConfidence?: number;
        arrivalTime?: string;
        departureTime?: string;
      }>;
    },
  ) {
    const cls = await this.assertOwnsClass(req, body.classId);
    const tid = new Types.ObjectId(req.user.sub || req.user.userId);
    const date = normalizeDate(body.date);

    let attendanceList = (body.rows || []).map((r) => ({
      studentId: new Types.ObjectId(r.studentId),
      status: r.status || 'present',
      notes: r.note,
      recognitionConfidence: r.recognitionConfidence,
      arrivalTime: r.arrivalTime ? new Date(r.arrivalTime) : undefined,
      departureTime: r.departureTime ? new Date(r.departureTime) : undefined,
    }));

    attendanceList = attendanceList.map((row) => this.tagByTime(row, cls));

    const totals = this.recomputeTotals(attendanceList);
    return this.model.findOneAndUpdate(
      { classId: cls._id, date },
      {
        $set: {
          classId: cls._id,
          date,
          attendanceList,
          teacherId: tid,
          totalPresent: totals.present,
          totalAbsent: totals.absent,
        },
      },
      { upsert: true, new: true },
    );
  }

  @Roles('teacher', 'admin')
  @Post('merge')
  async merge(
    @Req() req: any,
    @Body()
    body: {
      classId: string;
      date?: string;
      rows: Array<{
        studentId: string;
        status?: 'present' | 'absent' | 'late' | 'early_leave';
        note?: string;
        recognitionConfidence?: number;
        arrivalTime?: string;
        departureTime?: string;
      }>;
    },
  ) {
    const cls = await this.assertOwnsClass(req, body.classId);
    const tid = new Types.ObjectId(req.user.sub || req.user.userId);
    const date = normalizeDate(body.date);

    let doc = await this.model.findOne({ classId: cls._id, date });
    if (!doc) {
      doc = new this.model({
        classId: cls._id,
        date,
        teacherId: tid,
        attendanceList: [],
        totalPresent: 0,
        totalAbsent: 0,
      });
    }

    const cur = new Map<string, any>();
    for (const row of doc.attendanceList || []) {
      cur.set(String(row.studentId), row);
    }

    for (const r of body.rows || []) {
      const sid = String(r.studentId);
      const exist = cur.get(sid);
      const patch = {
        status: r.status ?? (exist?.status || 'present'),
        notes: r.note ?? exist?.notes,
        recognitionConfidence:
          Math.max(
            Number(r.recognitionConfidence ?? 0),
            Number(exist?.recognitionConfidence ?? 0),
          ) || undefined,
        arrivalTime: (() => {
          const a = r.arrivalTime ? new Date(r.arrivalTime) : undefined;
          if (!exist?.arrivalTime) return a;
          if (!a) return exist.arrivalTime;
          return a < exist.arrivalTime ? a : exist.arrivalTime;
        })(),
        departureTime: (() => {
          const d = r.departureTime ? new Date(r.departureTime) : undefined;
          if (!exist?.departureTime) return d;
          if (!d) return exist.departureTime;
          return d > exist.departureTime ? d : exist.departureTime;
        })(),
      };

      if (exist) {
        cur.set(sid, { ...exist, ...patch });
      } else {
        cur.set(sid, {
          studentId: new Types.ObjectId(sid),
          ...patch,
        });
      }
    }

    const mergedList = Array.from(cur.values());
    const taggedList = mergedList.map((r) => this.tagByTime(r, cls));
    const totals = this.recomputeTotals(taggedList);

    doc.attendanceList = taggedList;
    doc.teacherId = tid;
    doc.totalPresent = totals.present;
    doc.totalAbsent = totals.absent;
    await doc.save();

    return doc;
  }

  @Roles('teacher', 'admin')
  @Get('class/:classId')
  async byClassDate(
    @Req() req: any,
    @Param('classId') classId: string,
    @Query('date') date?: string,
  ) {
    const cls = await this.assertOwnsClass(req, classId);
    const d = normalizeDate(date);
    return this.model.findOne({ classId: cls._id, date: d });
  }
}
