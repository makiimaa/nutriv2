/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AggregatedStat } from './aggregated-stat.schema';
import {
  dayRangeBangkok,
  weekRangeBangkok,
  monthRangeBangkok,
} from './date-range.util';
import { StatsService } from './stats.service';

type P = 'day' | 'week' | 'month';
type G = 'anthro' | 'attendance' | 'nutrition';

@Controller('stats')
export class StatsController {
  constructor(
    @InjectModel(AggregatedStat.name) private aggModel: Model<any>,
    private readonly statsService: StatsService,
  ) {}

  private range(period: P) {
    const now = new Date();
    if (period === 'day') return dayRangeBangkok(now);
    if (period === 'week') return weekRangeBangkok(now);
    return monthRangeBangkok(now);
  }

  @Get('class')
  async classStat(
    @Query('classId') classId: string,
    @Query('period') period: P = 'day',
    @Query('group') metricGroup: G = 'attendance',
  ) {
    const { start, end } = this.range(period);
    return this.aggModel
      .findOne({
        scope: 'class',
        metricGroup,
        period,
        periodStart: { $gte: start, $lt: end },
        classId: new Types.ObjectId(classId),
      })
      .lean();
  }

  @Get('class/overview')
  async classOverview(
    @Query('classId') classId: string,
    @Query('period') period: P = 'day',
  ) {
    const { start, end } = this.range(period);
    const base = {
      scope: 'class',
      period,
      periodStart: { $gte: start, $lt: end },
      classId: new Types.ObjectId(classId),
    };
    const [anthro, attendance, nutrition] = await Promise.all([
      this.aggModel.findOne({ ...base, metricGroup: 'anthro' }).lean(),
      this.aggModel.findOne({ ...base, metricGroup: 'attendance' }).lean(),
      this.aggModel.findOne({ ...base, metricGroup: 'nutrition' }).lean(),
    ]);
    return { anthro, attendance, nutrition };
  }

  @Get('student')
  async studentStat(
    @Query('studentId') studentId: string,
    @Query('period') period: P = 'day',
    @Query('group') metricGroup: G = 'attendance',
  ) {
    const { start, end } = this.range(period);
    return this.aggModel
      .findOne({
        scope: 'student',
        metricGroup,
        period,
        periodStart: { $gte: start, $lt: end },
        studentId: new Types.ObjectId(studentId),
      })
      .lean();
  }

  @Get('student/overview')
  async studentOverview(
    @Query('studentId') studentId: string,
    @Query('period') period: P = 'day',
  ) {
    const { start, end } = this.range(period);
    const base = {
      scope: 'student',
      period,
      periodStart: { $gte: start, $lt: end },
      studentId: new Types.ObjectId(studentId),
    };
    const [anthro, attendance, nutrition] = await Promise.all([
      this.aggModel.findOne({ ...base, metricGroup: 'anthro' }).lean(),
      this.aggModel.findOne({ ...base, metricGroup: 'attendance' }).lean(),
      this.aggModel.findOne({ ...base, metricGroup: 'nutrition' }).lean(),
    ]);
    return { anthro, attendance, nutrition };
  }

  private compareAnthro(student: any, classAvg: any, who: any) {
    if (!student) return null;
    return {
      height: {
        value: student.latestHeight ?? null,
        diffClass: classAvg
          ? (student.latestHeight ?? 0) - (classAvg.avgHeight ?? 0)
          : null,
        diffWHO: who ? (student.latestHeight ?? 0) - who.height : null,
        percentile: who?.percentileHeight ?? null,
      },
      weight: {
        value: student.latestWeight ?? null,
        diffClass: classAvg
          ? (student.latestWeight ?? 0) - (classAvg.avgWeight ?? 0)
          : null,
        diffWHO: who ? (student.latestWeight ?? 0) - who.weight : null,
        percentile: who?.percentileWeight ?? null,
      },
    };
  }

  private compareAttendance(student: any, classAvg: any) {
    if (!student) return null;
    const rateStu = student.ratePresent ?? 0;
    const rateCls = classAvg?.ratePresent ?? 0;
    return {
      ratePresent: rateStu,
      diffClass: rateStu - rateCls,
    };
  }

  private compareNutrition(student: any, classAvg: any) {
    if (!student) return null;
    const s = student.totals ?? {};
    const c = classAvg?.avgPerStudent ?? {};
    return {
      calories: {
        value: s.calories,
        diffClass: (s.calories ?? 0) - (c.calories ?? 0),
      },
      protein: {
        value: s.protein,
        diffClass: (s.protein ?? 0) - (c.protein ?? 0),
      },
      fat: { value: s.fat, diffClass: (s.fat ?? 0) - (c.fat ?? 0) },
      carbohydrate: {
        value: s.carbohydrate,
        diffClass: (s.carbohydrate ?? 0) - (c.carbohydrate ?? 0),
      },
    };
  }
}
