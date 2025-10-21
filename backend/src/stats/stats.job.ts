/* eslint-disable @typescript-eslint/no-unused-vars */
// src/stats/stats.job.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatsService } from './stats.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClassEntity } from '../classes/class.schema';
import {
  dayRangeBangkok,
  weekRangeBangkok,
  monthRangeBangkok,
} from './date-range.util';
import { Student } from '../students/student.schema';

@Injectable()
export class StatsJob {
  private readonly logger = new Logger(StatsJob.name);
  constructor(
    private stats: StatsService,
    @InjectModel(ClassEntity.name) private classModel: Model<any>,
    @InjectModel(Student.name) private studentModel: Model<any>,
  ) {}

  @Cron('0 */2 * * * *') // mỗi 2 phút
  // @Cron(CronExpression.EVERY_5_MINUTES)
  // @Cron('0 0 */2 * * *') // mỗi 2 giờ
  async runEvery2Minutes() {
    const now = new Date();
    const d = dayRangeBangkok(now);
    const w = weekRangeBangkok(now);
    const m = monthRangeBangkok(now);

    const classes = await this.classModel
      .find({ isActive: { $ne: false } })
      .select('_id')
      .lean();
    for (const c of classes) {
      const classId = String(c._id);
      await this.stats.computeClass(classId, 'day', d.start, d.end);
      await this.stats.computeClass(classId, 'week', w.start, w.end);
      await this.stats.computeClass(classId, 'month', m.start, m.end);

      const students = await this.studentModel
        .find({ classId: c._id, isActive: { $ne: false } })
        .select('_id')
        .lean();
      for (const s of students) {
        const sid = String(s._id);
        await this.stats.computeStudent(sid, 'day', d.start, d.end);
        await this.stats.computeStudent(sid, 'week', w.start, w.end);
        await this.stats.computeStudent(sid, 'month', m.start, m.end);
      }
    }
    this.logger.log(
      `Stats cron finished for ${classes.length} classes @ ${now.toISOString()}`,
    );
  }
}
