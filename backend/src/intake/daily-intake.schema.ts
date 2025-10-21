import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type DailyIntakeDocument = HydratedDocument<DailyIntake>;

@Schema({ timestamps: true, collection: 'daily_food_intake' })
export class DailyIntake {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'ClassEntity', required: true })
  classId: Types.ObjectId;

  @Prop({
    type: {
      breakfast: {
        actualIntake: { type: Array, default: [] },
        adHocFoods: {
          type: [
            {
              name: String,
              quantity: Number,
              nutrition: Object,
            },
          ],
          default: [],
        },
        totalNutritionIntake: { type: Object, default: {} },
      },
      lunch: {
        actualIntake: { type: Array, default: [] },
        adHocFoods: {
          type: [{ name: String, quantity: Number, nutrition: Object }],
          default: [],
        },
        totalNutritionIntake: { type: Object, default: {} },
      },
      snack: {
        actualIntake: { type: Array, default: [] },
        adHocFoods: {
          type: [{ name: String, quantity: Number, nutrition: Object }],
          default: [],
        },
        totalNutritionIntake: { type: Object, default: {} },
      },
    },
    default: {},
  })
  mealIntakes: any;

  @Prop({ type: Object, default: {} })
  dailyTotalIntake: any;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  recordedBy: Types.ObjectId;
}

export const DailyIntakeSchema = SchemaFactory.createForClass(DailyIntake);
DailyIntakeSchema.index({ studentId: 1, date: 1 }, { unique: true });
DailyIntakeSchema.index({ classId: 1, date: 1 });
