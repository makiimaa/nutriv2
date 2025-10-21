import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FoodItemDocument = HydratedDocument<FoodItem>;

@Schema({ timestamps: true, collection: 'food_items' })
export class FoodItem {
  @Prop({ required: true, unique: true }) name: string;
  @Prop({ required: true }) category: string;
  @Prop({ required: true }) unit: string;
  @Prop({ type: Number, default: 0, min: 0 })
  pricePerUnit: number;
  @Prop({ type: String, default: 'VND' })
  currency: string;
  @Prop({
    type: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      carbohydrate: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 },
      calcium: { type: Number, default: 0 },
      iron: { type: Number, default: 0 },
      vitaminA: { type: Number, default: 0 },
      vitaminC: { type: Number, default: 0 },
      vitaminD: { type: Number, default: 0 },
    },
    default: {},
  })
  nutrition: any;
  @Prop({ type: [String], default: [] }) allergens: string[];
  @Prop({ default: false }) isVegetarian: boolean;
  @Prop({ default: true }) isHalal: boolean;
  @Prop() storageCondition?: string;
  @Prop() shelfLife?: number;
  @Prop({ default: true }) isActive: boolean;
}
export const FoodItemSchema = SchemaFactory.createForClass(FoodItem);
FoodItemSchema.index({ name: 1 }, { unique: true });
