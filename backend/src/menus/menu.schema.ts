import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MenuDocument = HydratedDocument<Menu>;

@Schema({ timestamps: true, collection: 'menus' })
export class Menu {
  @Prop({ type: Types.ObjectId, ref: 'School', required: true })
  schoolId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ClassEntity', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ enum: ['regular', 'vegetarian', 'allergy_free'], default: 'regular' })
  menuType: string;

  @Prop() targetAgeGroup?: string;

  @Prop({ type: Object, default: {} })
  meals: any;

  @Prop({ type: Object, default: {} })
  dailyTotalNutrition: any;

  @Prop() specialNotes?: string;

  @Prop() groupName?: string;

  @Prop({ type: Types.ObjectId, ref: 'Teacher' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  createdBy: Types.ObjectId;
}

export const MenuSchema = SchemaFactory.createForClass(Menu);

MenuSchema.index(
  { schoolId: 1, classId: 1, date: 1, groupName: 1 },
  { unique: true },
);

MenuSchema.index({ classId: 1, date: -1 });
