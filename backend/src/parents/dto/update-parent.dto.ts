// src/parents/dto/update-parent.dto.ts
import {
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';
export class UpdateParentDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  studentIds?: string[];
  @IsOptional() @IsMongoId() studentId?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(4) password?: string;
  @IsOptional() isActive?: boolean;
}
