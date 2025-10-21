import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type StudentGroupingDocument = HydratedDocument<StudentGrouping>;

@Schema({ collection: 'student_groupings', timestamps: true })
export class StudentGrouping {
  @Prop({ type: Types.ObjectId, ref: 'ClassEntity', required: true })
  classId: Types.ObjectId;

  @Prop({ default: '' }) name: string;
  @Prop({ enum: ['gemini', 'ollama'], default: 'gemini' })
  engine: 'gemini' | 'ollama';

  @Prop({ default: 0 }) groupCount: number;
  @Prop({ default: '' }) teacherHint?: string;

  @Prop({
    type: [
      {
        key: String,
        name: String,
        description: String,
        criteriaSummary: Object,
        studentIds: [Types.ObjectId],
      },
    ],
    default: [],
  })
  groups: Array<{
    key: string;
    name: string;
    description?: string;
    criteriaSummary?: any;
    studentIds: Types.ObjectId[];
  }>;

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  createdBy?: Types.ObjectId;
}
export const StudentGroupingSchema =
  SchemaFactory.createForClass(StudentGrouping);
StudentGroupingSchema.index({ classId: 1, createdAt: -1 });
