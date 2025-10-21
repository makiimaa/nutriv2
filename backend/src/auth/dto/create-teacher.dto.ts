import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
export class CreateTeacherDto {
  @IsString() employeeId: string;
  @IsString() fullName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(4) password: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsIn(['teacher', 'admin']) role?: 'teacher' | 'admin';
  @IsOptional() @IsString() schoolId?: string;
}
