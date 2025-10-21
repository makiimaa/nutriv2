import { IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMeasurementDto {
  @IsMongoId() studentId: string;
  @IsNumber() height: number;
  @IsNumber() weight: number;
  @IsString() measurementDate: string;
  @IsOptional() @IsString() notes?: string;
}
