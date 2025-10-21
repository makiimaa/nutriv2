/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { FoodItem, FoodItemDocument } from './food-item.schema';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('food-items')
export class FoodItemsController {
  constructor(
    @InjectModel(FoodItem.name) private model: Model<FoodItemDocument>,
  ) {}

  @Roles('admin', 'teacher', 'parent')
  @Get()
  list() {
    return this.model.find({}).sort({ createdAt: -1 });
  }

  @Roles('admin')
  @Post()
  create(@Body() body: any) {
    return new this.model(body).save();
  }

  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.model.findByIdAndUpdate(id, body, { new: true });
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.model.findByIdAndDelete(id);
  }
}
