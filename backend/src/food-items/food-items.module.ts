import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodItem, FoodItemSchema } from './food-item.schema';
import { FoodItemsController } from './food-items.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FoodItem.name, schema: FoodItemSchema },
    ]),
  ],
  controllers: [FoodItemsController],
  exports: [MongooseModule],
})
export class FoodItemsModule {}
