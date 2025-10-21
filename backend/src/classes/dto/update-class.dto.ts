import {
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateClassDto {
  @IsOptional() @IsMongoId() @Type(() => String) schoolId?: string;
  @IsOptional() @IsString() @Type(() => String) name?: string;
  @IsOptional() @IsString() @Type(() => String) ageGroup?: string;
  @IsOptional() @IsMongoId() @Type(() => String) teacherId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.filter(Boolean).map(String) : [],
  )
  assistantTeacherIds?: string[];

  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() currentStudents?: number;
  @IsOptional() @IsString() @Type(() => String) academicYear?: string;

  @IsOptional() @IsString() @Type(() => String) startTime?: string;
  @IsOptional() @IsString() @Type(() => String) endTime?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
}
