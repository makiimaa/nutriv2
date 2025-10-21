/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMenuDto } from './create-menu.dto';

export class UpdateMenuDto {
  @IsOptional()
  @IsDateString()
  date?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => (CreateMenuDto as any).prototype.constructor)
  items?: CreateMenuDto['items'];
}
