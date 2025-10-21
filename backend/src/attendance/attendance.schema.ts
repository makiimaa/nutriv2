import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AttendanceDocument = HydratedDocument<Attendance>;

@Schema({ timestamps: true, collection: 'attendance' })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'ClassEntity', required: true })
  classId: Types.ObjectId;
  @Prop({ type: Date, required: true }) date: Date;

  @Prop({
    type: [
      {
        studentId: { type: Types.ObjectId, ref: 'Student', required: true },
        status: {
          type: String,
          enum: ['present', 'absent', 'late', 'early_leave'],
          default: 'present',
        },
        isOnTime: { type: Boolean, default: false },
        isLate: { type: Boolean, default: false },
        isLeftEarly: { type: Boolean, default: false },

        arrivalTime: Date,
        departureTime: Date,
        notes: String,
        recognitionConfidence: Number,
      },
    ],
    default: [],
  })
  attendanceList: Array<{
    studentId: Types.ObjectId;
    status: 'present' | 'absent' | 'late' | 'early_leave';
    arrivalTime?: Date;
    departureTime?: Date;
    notes?: string;
    recognitionConfidence?: number;
    isOnTime?: boolean;
    isLate?: boolean;
    isLeftEarly?: boolean;
  }>;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Types.ObjectId;

  @Prop({ default: 0 }) totalPresent: number;
  @Prop({ default: 0 }) totalAbsent: number;
}
export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ classId: 1, date: 1 }, { unique: true });
