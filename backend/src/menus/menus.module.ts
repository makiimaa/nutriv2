import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { Menu, MenuSchema } from './menu.schema';
import { FoodItem, FoodItemSchema } from '../food-items/food-item.schema';
import { ClassEntity, ClassSchema } from '../classes/class.schema';
import { NutriReco, NutriRecoSchema } from '../nutrition/nutri-reco.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Menu.name, schema: MenuSchema },

      { name: FoodItem.name, schema: FoodItemSchema },
      { name: ClassEntity.name, schema: ClassSchema },
      { name: NutriReco.name, schema: NutriRecoSchema },
    ]),
  ],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
