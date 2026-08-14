import { IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
