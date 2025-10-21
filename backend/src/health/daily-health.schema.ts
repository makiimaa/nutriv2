import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type DailyHealthDocument = HydratedDocument<DailyHealth>;

@Schema({ timestamps: true, collection: 'daily_health_status' })
export class DailyHealth {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;
  @Prop({ type: Date, required: true }) date: Date;
  @Prop({ type: Types.ObjectId, ref: 'ClassEntity', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Object, default: {} }) healthStatus: any;
  @Prop() behaviorNotes?: string;
  @Prop() activityLevel?: string;
  @Prop() socialInteraction?: string;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  recordedBy: Types.ObjectId;
  @Prop({ default: false }) parentNotified: boolean;
  @Prop({ default: false }) requiresAttention: boolean;
}
export const DailyHealthSchema = SchemaFactory.createForClass(DailyHealth);
DailyHealthSchema.index({ studentId: 1, date: 1 }, { unique: true });
