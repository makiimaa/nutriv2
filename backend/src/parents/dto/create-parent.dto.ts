// src/parents/dto/create-parent.dto.ts
import {
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';
export class CreateParentDto {
  @IsArray()
  @IsMongoId({ each: true })
  studentIds: string[];
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsEmail() email: string;
  @IsString() @MinLength(4) password: string;
}
