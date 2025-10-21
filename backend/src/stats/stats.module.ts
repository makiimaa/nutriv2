/* eslint-disable @typescript-eslint/no-unused-vars */
// src/stats/stats.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregatedStat, AggregatedStatSchema } from './aggregated-stat.schema';
import { StatsService } from './stats.service';
import { StatsJob } from './stats.job';
import { StatsController } from './stats.controller';

import { Student, StudentSchema } from '../students/student.schema';
import { ClassEntity, ClassSchema } from '../classes/class.schema';
import {
  Measurement,
  MeasurementSchema,
} from '../measurements/measurement.schema';
import { Attendance, AttendanceSchema } from '../attendance/attendance.schema';
import { DailyIntake, DailyIntakeSchema } from '../intake/daily-intake.schema';
import { DailyHealth, DailyHealthSchema } from '../health/daily-health.schema';
import { FoodItem, FoodItemSchema } from '../food-items/food-item.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: AggregatedStat.name, schema: AggregatedStatSchema },

      { name: Student.name, schema: StudentSchema },
      { name: ClassEntity.name, schema: ClassSchema },

      { name: 'Measurement', schema: MeasurementSchema },
      { name: 'Attendance', schema: AttendanceSchema },
      { name: 'DailyIntake', schema: DailyIntakeSchema },
      { name: 'DailyHealth', schema: DailyHealthSchema },
      { name: FoodItem.name, schema: FoodItemSchema },
    ]),
  ],
  providers: [StatsService, StatsJob],
  controllers: [StatsController],
  exports: [StatsService],
})
export class StatsModule {}
