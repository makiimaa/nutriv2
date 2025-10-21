import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Parent, ParentSchema } from './parent.schema';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Parent.name, schema: ParentSchema }]),
  ],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
