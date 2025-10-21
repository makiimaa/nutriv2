import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Teacher, TeacherSchema } from './teacher.schema';
import { TeachersController } from './teachers.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Teacher.name, schema: TeacherSchema }]),
  ],
  controllers: [TeachersController],
  exports: [MongooseModule],
})
export class TeachersModule {}
