import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Measurement, MeasurementSchema } from './measurement.schema';
import { MeasurementsService } from './measurements.service';
import { MeasurementsController } from './measurements.controller';
import { Parent, ParentSchema } from '../parents/parent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Measurement.name, schema: MeasurementSchema },
      { name: Parent.name, schema: ParentSchema },
    ]),
  ],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
})
export class MeasurementsModule {}
