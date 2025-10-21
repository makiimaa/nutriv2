import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from './attendance.schema';
import { AttendanceController } from './attendance.controller';
import { ClassEntity, ClassSchema } from '../classes/class.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: ClassEntity.name, schema: ClassSchema },
    ]),
  ],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
