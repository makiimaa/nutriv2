import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ParentDocument = HydratedDocument<Parent>;

@Schema({ timestamps: true, collection: 'parents' })
export class Parent {
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Student' }],
    required: true,
    default: [],
  })
  studentIds: Types.ObjectId[];

  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true }) phone: string;
  @Prop({ required: true, unique: true, lowercase: true }) email: string;
  @Prop({ required: true }) password: string;

  @Prop({ default: 'parent' }) role: 'parent';
  @Prop({ default: true }) isActive: boolean;
}
export const ParentSchema = SchemaFactory.createForClass(Parent);
