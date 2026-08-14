import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';

import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { UpdateSessionTitleDto } from './dto/update-session-title.dto';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

type ChatResult = {
  message: string;
  sessionId?: string;
  type: 'TEXT' | 'ACTION' | 'CHOICE';
  error?: {
    message: string;
    code?: string;
  };
};

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async postMessage(
    @User() user: JwtPayload,
    @Body() dto: ChatDto,
  ): Promise<ChatResult> {
    const userId = user.sub;
    const tenantId = user.tenantId;

    return this.chatService.handleMessage(userId, tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getUserSessions(@User() user: JwtPayload) {
    return this.chatService.getUserSessions(user.sub, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/latest')
  async getLatestSession(@User() user: JwtPayload) {
    return this.chatService.getSessionMessages(user.sub, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/:id')
  async getSessionById(@User() user: JwtPayload, @Param('id') id: string) {
    return this.chatService.getSessionMessages(user.sub, user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('session')
  async createSession(@User() user: JwtPayload) {
    return this.chatService.startNewSession(user.sub, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('session/:id/title')
  async updateSessionTitle(
    @User() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSessionTitleDto,
  ) {
    return this.chatService.updateSessionTitle(
      user.sub,
      user.tenantId,
      id,
      dto.title,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('session/:id')
  async deleteSession(@User() user: JwtPayload, @Param('id') id: string) {
    return this.chatService.deleteSession(user.sub, user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async getLogs(@User() user: JwtPayload) {
    return this.chatService.getLogs(user.sub, user.tenantId, 100);
  }
}
