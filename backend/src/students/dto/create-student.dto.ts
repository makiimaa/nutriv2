import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  schoolProvidedId: string;
  @IsString() fullName: string;
  @IsDateString() dateOfBirth: string;
  @IsIn(['male', 'female']) gender: 'male' | 'female';
  @IsMongoId() classId: string;
  @IsOptional()
  @IsMongoId()
  schoolId?: string;

  @IsOptional() healthInfo?: {
    allergies?: string[];
    foodRestrictions?: string[];
    medicalHistory?: string;
    specialNeeds?: string;
  };
  @IsOptional() parents?: Array<{
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    isEmergencyContact?: boolean;
  }>;
  @IsOptional() enrollmentDate?: string;
}
