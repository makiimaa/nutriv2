import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional()
  @IsString()
  schoolProvidedId?: string;
}
