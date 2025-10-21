import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyHealth, DailyHealthSchema } from './daily-health.schema';
import { DailyHealthController } from './daily-health.controller';
import { Student, StudentSchema } from '../students/student.schema';
import { ClassEntity, ClassSchema } from '../classes/class.schema';
import { Parent, ParentSchema } from '../parents/parent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyHealth.name, schema: DailyHealthSchema },
      { name: Student.name, schema: StudentSchema },
      { name: ClassEntity.name, schema: ClassSchema },
      { name: Parent.name, schema: ParentSchema },
    ]),
  ],
  controllers: [DailyHealthController],
})
export class HealthModule {}
