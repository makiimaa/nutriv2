import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AggregatedStatDocument = HydratedDocument<AggregatedStat>;
type Scope = 'class' | 'student';
type MetricGroup = 'anthro' | 'attendance' | 'nutrition';
type Period = 'day' | 'week' | 'month';

@Schema({ timestamps: true, collection: 'aggregated_stats' })
export class AggregatedStat {
  @Prop({ enum: ['class', 'student'], required: true }) scope: Scope;
  @Prop({ enum: ['anthro', 'attendance', 'nutrition'], required: true })
  metricGroup: MetricGroup;
  @Prop({ enum: ['day', 'week', 'month'], required: true }) period: Period;

  @Prop({ type: Date, required: true }) periodStart: Date;
  @Prop({ type: Date, required: true }) periodEnd: Date;

  @Prop({ type: Types.ObjectId, ref: 'ClassEntity' }) classId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Student' }) studentId?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  values: Record<string, any>;
}
export const AggregatedStatSchema =
  SchemaFactory.createForClass(AggregatedStat);

AggregatedStatSchema.index(
  {
    scope: 1,
    metricGroup: 1,
    period: 1,
    periodStart: 1,
    classId: 1,
    studentId: 1,
  },
  { unique: true },
);
