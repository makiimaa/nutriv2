/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AggregatedStat,
  AggregatedStatDocument,
} from './aggregated-stat.schema';
import { Student, StudentDocument } from '../students/student.schema';
import {
  Measurement,
  MeasurementDocument,
} from '../measurements/measurement.schema';
import { FoodItem, FoodItemDocument } from '../food-items/food-item.schema';

type AnthroLean = { height: number; weight: number; measurementDate: Date };

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(AggregatedStat.name)
    private aggModel: Model<AggregatedStatDocument>,
    @InjectModel(Measurement.name)
    private measModel: Model<MeasurementDocument>,
    @InjectModel('Attendance') private attModel: Model<any>,
    @InjectModel('DailyIntake') private intakeModel: Model<any>,
    @InjectModel('DailyHealth') private healthModel: Model<any>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(FoodItem.name) private foodModel: Model<FoodItemDocument>,
  ) {}

  private objId(id: string) {
    return new Types.ObjectId(id);
  }

  private async upsert(
    scope: 'class' | 'student',
    metricGroup: 'anthro' | 'attendance' | 'nutrition',
    period: 'day' | 'week' | 'month',
    periodStart: Date,
    periodEnd: Date,
    ids: { classId?: string; studentId?: string },
    values: Record<string, any>,
  ) {
    const query: any = { scope, metricGroup, period, periodStart };
    if (ids.classId) query.classId = this.objId(ids.classId);
    if (ids.studentId) query.studentId = this.objId(ids.studentId);
    await this.aggModel.updateOne(
      query,
      { $set: { periodEnd, values } },
      { upsert: true },
    );
  }

  async anthroClass(classId: string, start: Date, end: Date) {
    const sids: Types.ObjectId[] = await this.studentModel.distinct('_id', {
      classId: this.objId(classId),
      isActive: { $ne: false },
    });

    if (!sids.length)
      return { avgHeight: null, avgWeight: null, sampleSize: 0 };

    const rows = await this.measModel.aggregate([
      {
        $match: {
          studentId: { $in: sids },
          measurementDate: { $gte: start, $lt: end },
        },
      },
      { $sort: { studentId: 1, measurementDate: -1 } },
      {
        $group: {
          _id: '$studentId',
          height: { $first: '$height' },
          weight: { $first: '$weight' },
        },
      },
      {
        $group: {
          _id: null,
          avgHeight: { $avg: '$height' },
          avgWeight: { $avg: '$weight' },
          sampleSize: { $sum: 1 },
        },
      },
    ]);

    const v = rows[0] ?? { avgHeight: null, avgWeight: null, sampleSize: 0 };
    return {
      avgHeight: v.avgHeight,
      avgWeight: v.avgWeight,
      sampleSize: v.sampleSize,
    };
  }

  async anthroStudent(studentId: string, start: Date, end: Date) {
    const r = await this.measModel
      .findOne({
        studentId: this.objId(studentId),
        measurementDate: { $gte: start, $lt: end },
      })
      .sort({ measurementDate: -1 })
      .select({ height: 1, weight: 1, measurementDate: 1, _id: 0 })
      .lean<AnthroLean>();

    return r
      ? {
          latestHeight: r.height,
          latestWeight: r.weight,
          at: r.measurementDate,
        }
      : { latestHeight: null, latestWeight: null };
  }

  async attendanceClass(classId: string, start: Date, end: Date) {
    const docs = await this.attModel
      .find({ classId: this.objId(classId), date: { $gte: start, $lt: end } })
      .select('attendanceList date')
      .lean();

    if (!docs.length) {
      return {
        daysCount: 0,
        totalStudents: 0,
        present: 0,
        absent: 0,
        late: 0,
        earlyLeave: 0,
        ratePresent: 0,
      };
    }

    const totalStudents = await this.studentModel.countDocuments({
      classId: this.objId(classId),
      isActive: { $ne: false },
    });

    let totalDays = docs.length;
    let sumPresent = 0,
      sumAbsent = 0,
      sumLate = 0,
      sumEarly = 0;

    for (const d of docs) {
      for (const rec of d.attendanceList || []) {
        switch (rec.status) {
          case 'present':
            sumPresent++;
            break;
          case 'absent':
            sumAbsent++;
            break;
          case 'late':
            sumLate++;
            break;
          case 'early_leave':
            sumEarly++;
            break;
        }
      }
    }

    const totalExpected = totalStudents * totalDays;
    const ratePresent = totalExpected ? sumPresent / totalExpected : 0;

    return {
      daysCount: totalDays,
      totalStudents,
      present: sumPresent,
      absent: sumAbsent,
      late: sumLate,
      earlyLeave: sumEarly,
      ratePresent,
    };
  }

  async attendanceStudent(studentId: string, start: Date, end: Date) {
    const rows = await this.attModel.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $unwind: '$attendanceList' },
      { $match: { 'attendanceList.studentId': this.objId(studentId) } },
      { $group: { _id: '$attendanceList.status', count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(rows.map((x: any) => [x._id, x.count]));
    const total =
      (map.present || 0) +
      (map.absent || 0) +
      (map.late || 0) +
      (map.early_leave || 0);
    return {
      total,
      present: map.present || 0,
      absent: map.absent || 0,
      late: map.late || 0,
      earlyLeave: map.early_leave || 0,
      ratePresent: total ? (map.present || 0) / total : 0,
    };
  }

  private mealKeys = ['breakfast', 'lunch', 'snack'] as const;

  async nutritionClass(classId: string, start: Date, end: Date) {
    const attendanceDocs = await this.attModel
      .find({ classId: this.objId(classId), date: { $gte: start, $lt: end } })
      .select('attendanceList date')
      .lean();

    const presentStudentIds = new Set<string>();
    for (const a of attendanceDocs) {
      for (const rec of a.attendanceList || []) {
        if (['present', 'late'].includes(rec.status) && rec.studentId) {
          presentStudentIds.add(String(rec.studentId));
        }
      }
    }
    if (!presentStudentIds.size)
      return {
        meals: 0,
        totals: {},
        avgPerStudent: {},
        issues: 0,
        avgTemperature: null,
      };

    const intakeDocs = await this.intakeModel
      .find({
        classId: this.objId(classId),
        studentId: {
          $in: Array.from(presentStudentIds).map((id) => this.objId(id)),
        },
        date: { $gte: start, $lt: end },
      })
      .select('mealIntakes')
      .lean();

    if (!intakeDocs.length)
      return {
        meals: 0,
        totals: {},
        avgPerStudent: {},
        issues: 0,
        avgTemperature: null,
      };

    const allFoodIds = new Set<string>();
    for (const doc of intakeDocs) {
      for (const meal of ['breakfast', 'lunch', 'snack']) {
        const rows = doc.mealIntakes?.[meal]?.actualIntake || [];
        for (const r of rows)
          if (r.foodItemId) allFoodIds.add(String(r.foodItemId));
      }
    }

    const foodMap = new Map<string, any>();
    if (allFoodIds.size) {
      const items = await this.foodModel
        .find({
          _id: { $in: Array.from(allFoodIds).map((id) => this.objId(id)) },
        })
        .select('_id nutrition')
        .lean();
      items.forEach((f) => foodMap.set(String(f._id), f.nutrition || {}));
    }

    const totals: Record<string, number> = {};
    let mealsCount = 0;

    for (const doc of intakeDocs) {
      for (const meal of ['breakfast', 'lunch', 'snack']) {
        const actuals = doc.mealIntakes?.[meal]?.actualIntake || [];
        const adhocs = doc.mealIntakes?.[meal]?.adHocFoods || [];

        for (const it of actuals) {
          const nut = foodMap.get(String(it.foodItemId)) || {};
          const ratio = (it.actualQuantity || 0) / 100;
          for (const k of Object.keys(nut)) {
            totals[k] = (totals[k] || 0) + (nut[k] || 0) * ratio;
          }
        }

        for (const it of adhocs) {
          const nut = it.nutrition || {};
          const ratio = (it.quantity || 0) / 100;
          for (const k of Object.keys(nut)) {
            totals[k] = (totals[k] || 0) + (nut[k] || 0) * ratio;
          }
        }

        mealsCount++;
      }
    }

    for (const k of Object.keys(totals))
      totals[k] = Math.round(totals[k] * 100) / 100;

    const nStudents = presentStudentIds.size;
    const avgPerStudent: Record<string, number> = {};
    for (const k of Object.keys(totals))
      avgPerStudent[k] = Math.round((totals[k] / nStudents) * 100) / 100;

    const healthRows = await this.healthModel.aggregate([
      {
        $match: {
          classId: this.objId(classId),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          issues: { $sum: { $cond: ['$requiresAttention', 1, 0] } },
          avgTemp: { $avg: '$healthStatus.temperature' },
        },
      },
    ]);
    const H = healthRows[0] ?? { issues: 0, avgTemp: null };

    return {
      meals: mealsCount,
      totals,
      avgPerStudent,
      issues: H.issues,
      avgTemperature: H.avgTemp,
    };
  }

  async nutritionStudent(studentId: string, start: Date, end: Date) {
    const intakeDocs = await this.intakeModel
      .find({
        studentId: this.objId(studentId),
        date: { $gte: start, $lt: end },
      })
      .select('dailyTotalIntake mealIntakes')
      .lean();

    let mealsRecorded = 0;
    let cal = 0,
      pro = 0,
      fat = 0,
      carb = 0;

    for (const d of intakeDocs) {
      for (const k of this.mealKeys) {
        const v = d?.mealIntakes?.[k]?.totalNutritionIntake;
        if (v && Object.keys(v).length) mealsRecorded++;
      }
      const tdi = d?.dailyTotalIntake;
      if (tdi && Object.keys(tdi).length) {
        cal += tdi.calories || 0;
        pro += tdi.protein || 0;
        fat += tdi.fat || 0;
        carb += tdi.carbohydrate || 0;
      } else {
        for (const k of this.mealKeys) {
          const v = d?.mealIntakes?.[k]?.totalNutritionIntake || {};
          cal += v.calories || 0;
          pro += v.protein || 0;
          fat += v.fat || 0;
          carb += v.carbohydrate || 0;
        }
      }
    }

    const healthRows = await this.healthModel.aggregate([
      {
        $match: {
          studentId: this.objId(studentId),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          issues: { $sum: { $cond: ['$requiresAttention', 1, 0] } },
          avgTemp: { $avg: '$healthStatus.temperature' },
        },
      },
    ]);
    const H = healthRows[0] ?? { issues: 0, avgTemp: null };

    return {
      mealsRecorded,
      totals: { calories: cal, protein: pro, fat, carbohydrate: carb },
      issues: H.issues || 0,
      avgTemperature: H.avgTemp ?? null,
    };
  }

  async computeClass(
    classId: string,
    period: 'day' | 'week' | 'month',
    start: Date,
    end: Date,
  ) {
    const anthro = await this.anthroClass(classId, start, end);
    await this.upsert(
      'class',
      'anthro',
      period,
      start,
      end,
      { classId },
      anthro,
    );

    const att = await this.attendanceClass(classId, start, end);
    await this.upsert(
      'class',
      'attendance',
      period,
      start,
      end,
      { classId },
      att,
    );

    const nut = await this.nutritionClass(classId, start, end);
    await this.upsert(
      'class',
      'nutrition',
      period,
      start,
      end,
      { classId },
      nut,
    );
  }

  async computeStudent(
    studentId: string,
    period: 'day' | 'week' | 'month',
    start: Date,
    end: Date,
  ) {
    const a = await this.anthroStudent(studentId, start, end);
    await this.upsert(
      'student',
      'anthro',
      period,
      start,
      end,
      { studentId },
      a,
    );

    const att = await this.attendanceStudent(studentId, start, end);
    await this.upsert(
      'student',
      'attendance',
      period,
      start,
      end,
      { studentId },
      att,
    );

    const nut = await this.nutritionStudent(studentId, start, end);
    await this.upsert(
      'student',
      'nutrition',
      period,
      start,
      end,
      { studentId },
      nut,
    );
  }
}
