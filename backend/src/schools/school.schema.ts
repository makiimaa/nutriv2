import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type SchoolDocument = School & Document;

@Schema({ timestamps: true, collection: 'schools' })
export class School {
  @Prop({ required: true }) name: string;
  @Prop() address?: string;
  @Prop() phone?: string;
  @Prop() email?: string;
}
export const SchoolSchema = SchemaFactory.createForClass(School);
SchoolSchema.index({ name: 1 }, { unique: true });
