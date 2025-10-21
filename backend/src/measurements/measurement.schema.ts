import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MeasurementDocument = HydratedDocument<Measurement>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'physical_measurements',
})
export class Measurement {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;
  @Prop({ type: Number, required: true }) height: number;
  @Prop({ type: Number, required: true }) weight: number;
  @Prop({ type: Number, required: true }) bmi: number;
  @Prop({ type: Date, required: true }) measurementDate: Date;
  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  measuredBy: Types.ObjectId;
  @Prop({ type: String }) notes?: string;
}
export const MeasurementSchema = SchemaFactory.createForClass(Measurement);
MeasurementSchema.index({ studentId: 1, measurementDate: 1 }, { unique: true });
