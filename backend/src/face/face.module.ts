import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FaceService } from './face.service';
import { FaceController } from './face.controller';
import { Student, StudentSchema } from '../students/student.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Student.name, schema: StudentSchema }]),
  ],
  controllers: [FaceController],
  providers: [FaceService],
  exports: [FaceService],
})
export class FaceModule {}
