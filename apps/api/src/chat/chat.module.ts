import { Module } from '@nestjs/common';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [AuthModule, AiModule, AppointmentsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
