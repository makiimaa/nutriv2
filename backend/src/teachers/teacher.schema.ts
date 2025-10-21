import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, HydratedDocument } from 'mongoose';

export type TeacherDocument = HydratedDocument<Teacher>;

@Schema({ timestamps: true, collection: 'teachers' })
export class Teacher {
  @Prop({ required: true, unique: true }) employeeId: string;
  @Prop({ required: true }) fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true }) password: string;

  @Prop() phone?: string;
  @Prop() dateOfBirth?: Date;
  @Prop() address?: string;

  @Prop({ type: Types.ObjectId, ref: 'School', required: false })
  schoolId?: Types.ObjectId;

  @Prop({ enum: ['teacher', 'admin'], default: 'teacher' })
  role: 'teacher' | 'admin';

  @Prop({ default: true }) isActive: boolean;
}
export const TeacherSchema = SchemaFactory.createForClass(Teacher);
TeacherSchema.index({ email: 1 }, { unique: true });
TeacherSchema.index({ employeeId: 1 }, { unique: true });
