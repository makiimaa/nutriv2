import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { MenusModule } from './menus/menus.module';
import { TeachersModule } from './teachers/teachers.module';
import { SchoolsModule } from './schools/schools.module';
import { ClassesModule } from './classes/classes.module';
import { FoodItemsModule } from './food-items/food-items.module';
import { IntakeModule } from './intake/intake.module';
import { HealthModule } from './health/health.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { ParentsModule } from './parents/parents.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FaceModule } from './face/face.module';
import { StatsModule } from './stats/stats.module';

import { NutritionModule } from './nutrition/nutrition.module';
import { GroupingsModule } from './nutrition/groupings.module';
import { ConversationsModule } from './conversations/conversations.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nuv2',
    ),
    AuthModule,
    StudentsModule,
    FoodItemsModule,
    MenusModule,
    IntakeModule,
    HealthModule,
    TeachersModule,
    SchoolsModule,
    ClassesModule,
    MeasurementsModule,
    ParentsModule,
    AttendanceModule,
    FaceModule,

    NutritionModule,
    GroupingsModule,
    ConversationsModule,
    StatsModule,

    ServeStaticModule.forRoot({
      rootPath: process.env.UPLOADS_DIR || join(process.cwd(), 'uploads'),
      serveRoot: '/static',
    }),
  ],
})
export class AppModule {}
