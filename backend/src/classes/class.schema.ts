import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type ClassDocument = ClassEntity & Document;

@Schema({ timestamps: true, collection: 'classes' })
export class ClassEntity {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  schoolId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  ageGroup?: string;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Teacher' }], default: [] })
  assistantTeacherIds: Types.ObjectId[];

  @Prop({ default: 30 })
  capacity: number;

  @Prop({ default: 0 })
  currentStudents: number;

  @Prop()
  academicYear?: string;

  @Prop({
    type: {
      startTime: { type: String, required: false },
      endTime: { type: String, required: false },
    },
    default: {},
  })
  schedule?: { startTime?: string; endTime?: string };

  @Prop({ default: true })
  isActive: boolean;
}

export const ClassSchema = SchemaFactory.createForClass(ClassEntity);
ClassSchema.index({ schoolId: 1, name: 1, academicYear: 1 }, { unique: true });
