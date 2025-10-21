import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NutritionService } from './nutrition.service';
import { NutritionController } from './nutrition.controller';
import { GroupingsController } from './groupings.controller';
import { GroupingsService } from './groupings.service';

@Module({
  imports: [HttpModule.register({ timeout: 30000 })],
  controllers: [NutritionController, GroupingsController],
  providers: [NutritionService, GroupingsService],
})
export class NutritionModule {}
