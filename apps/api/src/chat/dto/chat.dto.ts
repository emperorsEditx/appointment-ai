import { IsOptional, IsString, IsNumber } from 'class-validator';

export class ChatDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  clientTz?: string;

  @IsOptional()
  @IsNumber()
  tzOffsetMinutes?: number;

  @IsOptional()
  @IsString()
  clientNow?: string;
}
