import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type NutriRecoDocument = HydratedDocument<NutriReco>;

@Schema({ collection: 'nutritional_recommendations', timestamps: true })
export class NutriReco {
  @Prop() type?: string;
  @Prop({ type: Types.ObjectId }) classId?: Types.ObjectId;
  @Prop({ type: Object }) studentGroup?: any;
  @Prop({ type: Date }) date?: Date;
  @Prop({ type: Object }) meals?: any;
  @Prop() aiModel?: string;
  @Prop({ default: false }) appliedToMenu: boolean;
}
export const NutriRecoSchema = SchemaFactory.createForClass(NutriReco);
