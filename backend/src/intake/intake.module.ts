import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyIntake, DailyIntakeSchema } from './daily-intake.schema';
import { DailyIntakeController } from './daily-intake.controller';
import { FoodItem, FoodItemSchema } from '../food-items/food-item.schema';
import { Student, StudentSchema } from '../students/student.schema';
import { ClassEntity, ClassSchema } from '../classes/class.schema';
import { Parent, ParentSchema } from '../parents/parent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyIntake.name, schema: DailyIntakeSchema },
      { name: FoodItem.name, schema: FoodItemSchema },
      { name: Student.name, schema: StudentSchema },
      { name: ClassEntity.name, schema: ClassSchema },
      { name: Parent.name, schema: ParentSchema },
    ]),
  ],
  controllers: [DailyIntakeController],
})
export class IntakeModule {}
