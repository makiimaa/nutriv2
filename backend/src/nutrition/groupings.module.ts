import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupingsController } from './groupings.controller';
import { GroupingsService } from './groupings.service';
import {
  StudentGrouping,
  StudentGroupingSchema,
} from './student-grouping.schema';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    MongooseModule.forFeature([
      { name: StudentGrouping.name, schema: StudentGroupingSchema },
    ]),
  ],
  controllers: [GroupingsController],
  providers: [GroupingsService],
  exports: [GroupingsService],
})
export class GroupingsModule {}
