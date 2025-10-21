import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { School, SchoolSchema } from './school.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]),
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [MongooseModule],
})
export class SchoolsModule {}
