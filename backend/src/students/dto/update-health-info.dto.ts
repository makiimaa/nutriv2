/* eslint-disable @typescript-eslint/no-unused-vars */

import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  ValidateNested,
} from 'class-validator';

export class UpdateHealthInfoDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  foodRestrictions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialNeeds?: string;
}
