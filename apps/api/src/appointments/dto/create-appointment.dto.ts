import { IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  preferredDate!: string;

  @IsString()
  preferredTime!: string;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  service?: string;
}
