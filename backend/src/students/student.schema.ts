import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StudentDocument = HydratedDocument<Student>;

@Schema({ timestamps: true, collection: 'students' })
export class Student {
  @Prop() studentId?: string;
  @Prop({ required: true, unique: true })
  schoolProvidedId: string;
  @Prop({ required: true }) fullName: string;
  @Prop({ type: Date, required: true }) dateOfBirth: Date;
  @Prop({ enum: ['male', 'female'], required: true }) gender: 'male' | 'female';

  @Prop({ type: Types.ObjectId, ref: 'ClassEntity', required: true })
  classId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  schoolId: Types.ObjectId;

  @Prop({
    type: {
      allergies: { type: [String], default: [] },
      foodRestrictions: { type: [String], default: [] },
      medicalHistory: { type: String, default: '' },
      specialNeeds: { type: String, default: '' },
    },
    default: {},
  })
  healthInfo: {
    allergies: string[];
    foodRestrictions: string[];
    medicalHistory?: string;
    specialNeeds?: string;
  };

  @Prop({
    type: [
      {
        name: String,
        relationship: String,
        phone: String,
        email: String,
        isEmergencyContact: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  parents: Array<{
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    isEmergencyContact?: boolean;
  }>;

  @Prop({
    type: [
      {
        imageUrl: String,
        encodedFace: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  faceImages: Array<{
    imageUrl?: string;
    encodedFace?: string;
    uploadedAt: Date;
  }>;

  @Prop({ type: Date }) enrollmentDate?: Date;
  @Prop({ default: true }) isActive: boolean;
  @Prop({ type: Number, default: 0 }) latestHeight?: number;
  @Prop({ type: Number, default: 0 }) latestWeight?: number;
}
export const StudentSchema = SchemaFactory.createForClass(Student);
StudentSchema.index({ classId: 1 });
StudentSchema.index({ schoolId: 1 });
