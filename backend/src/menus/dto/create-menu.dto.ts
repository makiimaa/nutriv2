import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class MenuItemDto {
  @IsIn(['breakfast', 'lunch', 'snack'])
  mealType: 'breakfast' | 'lunch' | 'snack';

  @IsString()
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  name: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMenuDto {
  @IsDateString({}, { message: 'date phải là định dạng ISO (YYYY-MM-DD)' })
  date: string;

  @IsArray({ message: 'items phải là mảng' })
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 món' })
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items: MenuItemDto[];
}
