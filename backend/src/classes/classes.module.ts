import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { ClassEntity, ClassSchema } from './class.schema';
import { Student, StudentSchema } from '../students/student.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClassEntity.name, schema: ClassSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
