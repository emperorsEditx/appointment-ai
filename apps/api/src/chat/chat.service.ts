import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MistralService, ChatHistoryItem } from '../ai/mistral.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ChatDto } from './dto/chat.dto';

export type ChatResponse = {
  message: string;
  sessionId?: string;
  type: 'TEXT' | 'ACTION' | 'CHOICE';
  error?: {
    message: string;
    code?: string;
    raw?: unknown;
  };
  meta?: {
    component: 'calendar';
    service?: string;
  };
};

const HISTORY_LIMIT = 10;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mistral: MistralService,
    private readonly appointments: AppointmentsService,
  ) {}

  async handleMessage(
    userId: string,
    tenantId: string,
    dto: ChatDto,
  ): Promise<ChatResponse> {
    const existing = dto.sessionId
      ? await this.prisma.chatSession.findFirst({
          where: { id: dto.sessionId, tenantId },
        })
      : null;

    const session =
      existing ??
      (await this.prisma.chatSession.create({
        data: { userId, tenantId },
      }));

    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'USER', content: dto.message },
    });

    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });

    recentMessages.reverse();

    const history: ChatHistoryItem[] = recentMessages.map((m) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      throw new BadRequestException(
        'Conversation history must end with a user message',
      );
    }

    let reply: string;
    let responseType: ChatResponse['type'] = 'TEXT';
    let meta: ChatResponse['meta'] | undefined;
    let errorObj: { message: string; code?: string; raw?: unknown } | undefined;

    try {
      // helper: format datetimes in 12-hour form for user-facing replies
      const fmt = (d: Date) =>
        d.toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

      const result = await this.mistral.extractAppointmentIntent(history);
      const { intent } = result;

      await this.prisma.aiInteractionLog.create({
        data: {
          tenantId,
          userId,
          sessionId: session.id,
          model: result.model,
          input: JSON.stringify(history),
          output: result.raw,
          status: 'SUCCESS',
          latencyMs: result.latencyMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      });

      reply = intent.replyToUser;

      const missingDateOrTime = !intent.preferredDate || !intent.preferredTime;

      // Default response type
      responseType =
        intent.missingFields.length > 0 || intent.intent === 'UNCLEAR'
          ? 'ACTION'
          : 'TEXT';

      switch (intent.intent) {
        case 'BOOK_APPOINTMENT': {
          if (missingDateOrTime) {
            responseType = 'CHOICE';
            meta = {
              component: 'calendar',
              service: intent.service ?? undefined,
            };
            break;
          }

          try {
            const { appointment, alreadyExisted } =
              await this.appointments.createFromIntent({
                tenantId,
                userId,
                preferredDate: intent.preferredDate!,
                preferredTime: intent.preferredTime!,
                service: intent.service ?? undefined,
              });

            // Prefer the stored appointment's service or notes when reporting existing bookings.
            const bookedService =
              (appointment.notes as string | undefined) ?? intent.service;
            reply = alreadyExisted
              ? `You're already booked${bookedService ? ` for ${bookedService}` : ''} on ${fmt(new Date(appointment.startAt))} — anything else?`
              : `You're booked${bookedService ? ` for ${bookedService}` : ''} on ${fmt(new Date(appointment.startAt))}.`;
            responseType = 'TEXT';
            meta = undefined;
          } catch (bookingErr) {
            if (bookingErr instanceof ConflictException) {
              reply =
                "That time's already taken — could you pick another slot?";
            } else if (bookingErr instanceof BadRequestException) {
              reply =
                "I couldn't book that time — could you confirm the date and time again?";
            } else {
              this.logger.error(
                'Appointment creation failed',
                bookingErr instanceof Error ? bookingErr.stack : bookingErr,
              );
              reply = 'Something went wrong booking that — please try again.';
            }
            responseType = 'ACTION';
          }

          break;
        }

        case 'CONFIRM_BOOKING': {
          // If AI provided required fields, create the appointment.
          if (intent.missingFields.length > 0 || missingDateOrTime) {
            responseType = 'CHOICE';
            meta = {
              component: 'calendar',
              service: intent.service ?? undefined,
            };
            break;
          }

          try {
            const { appointment, alreadyExisted } =
              await this.appointments.createFromIntent({
                tenantId,
                userId,
                preferredDate: intent.preferredDate!,
                preferredTime: intent.preferredTime!,
                service: intent.service ?? undefined,
              });

            const bookedService2 =
              (appointment.notes as string | undefined) ?? intent.service;
            reply = alreadyExisted
              ? `You're already booked${bookedService2 ? ` for ${bookedService2}` : ''} on ${fmt(new Date(appointment.startAt))} — anything else?`
              : `You're booked${bookedService2 ? ` for ${bookedService2}` : ''} on ${fmt(new Date(appointment.startAt))}.`;
            responseType = 'TEXT';
            meta = undefined;
          } catch (bookingErr) {
            if (bookingErr instanceof ConflictException) {
              reply =
                "That time's already taken — could you pick another slot?";
            } else if (bookingErr instanceof BadRequestException) {
              reply =
                "I couldn't book that time — could you confirm the date and time again?";
            } else {
              this.logger.error(
                'Appointment creation failed',
                bookingErr instanceof Error ? bookingErr.stack : bookingErr,
              );
              reply = 'Something went wrong booking that — please try again.';
            }
            responseType = 'ACTION';
          }

          break;
        }

        case 'CHANGE_BOOKING': {
          // Need new preferredDate and preferredTime to change
          if (!intent.preferredDate || !intent.preferredTime) {
            responseType = 'ACTION';
            reply =
              'Okay — which date and time should I change the appointment to?';
            break;
          }

          // Resolve target appointment by context
          const target = await this.appointments.findAppointmentByContext(
            tenantId,
            userId,
            {
              service: intent.service ?? null,
              date: null,
            },
          );

          if (!target) {
            responseType = 'ACTION';
            reply = 'Which appointment would you like to change?';
            break;
          }

          try {
            const updated = await this.appointments.updateAppointment(
              tenantId,
              target.id,
              intent.preferredDate,
              intent.preferredTime,
              intent.service ?? target.notes,
            );

            reply = `Updated your appointment to ${fmt(new Date(updated.startAt))}.`;
            responseType = 'TEXT';
          } catch (updateErr) {
            if (updateErr instanceof ConflictException) {
              reply =
                "That time's already taken — could you pick another slot?";
            } else if (updateErr instanceof BadRequestException) {
              reply =
                "I couldn't change that appointment — please check the date/time.";
            } else {
              this.logger.error(
                'Appointment update failed',
                updateErr instanceof Error ? updateErr.stack : updateErr,
              );
              reply = 'Something went wrong changing that — please try again.';
            }
            responseType = 'ACTION';
          }

          break;
        }

        case 'CANCEL_APPOINTMENT': {
          // Resolve target appointment by context
          const target = await this.appointments.findAppointmentByContext(
            tenantId,
            userId,
            {
              service: intent.service ?? null,
              date: intent.preferredDate ?? null,
            },
          );

          if (!target) {
            responseType = 'ACTION';
            reply = 'Which appointment would you like to cancel?';
            break;
          }

          try {
            await this.appointments.cancelAppointment(tenantId, target.id);
            reply = `Cancelled your appointment on ${fmt(new Date(target.startAt))}.`;
            responseType = 'TEXT';
          } catch (cancelErr) {
            this.logger.error(
              'Appointment cancellation failed',
              cancelErr instanceof Error ? cancelErr.stack : cancelErr,
            );
            reply =
              'I could not cancel that appointment — please try again or contact support.';
            responseType = 'ACTION';
          }

          break;
        }

        case 'ASK_INFO': {
          responseType = 'TEXT';
          reply = intent.replyToUser;
          break;
        }

        case 'UNCLEAR': {
          responseType = 'ACTION';
          reply = intent.replyToUser;
          break;
        }
      }
    } catch (err) {
      this.logger.error(
        'Mistral call failed',
        err instanceof Error ? err.stack : err,
      );

      reply =
        "Sorry, I'm having trouble processing that right now. Could you fill in the appointment details using the form below?";
      responseType = 'ACTION';

      await this.prisma.aiInteractionLog.create({
        data: {
          tenantId,
          userId,
          sessionId: session.id,
          model: 'mistral-small-latest',
          input: JSON.stringify(history),
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        },
      });

      // include structured error for frontend consumption (do not leak raw internals)
      errorObj =
        err instanceof Error
          ? { message: err.message }
          : { message: String(err) };
    }

    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'ASSISTANT', content: reply },
    });

    const result: ChatResponse = {
      message: reply,
      sessionId: session.id,
      type: responseType,
      meta,
    };
    if (errorObj) result.error = errorObj;
    return result;
  }

  // Return messages for a session. If sessionId is not provided, return the latest session for the user.
  async getSessionMessages(
    userId: string,
    tenantId: string,
    sessionId?: string,
  ): Promise<{
    sessionId: string;
    messages: { id: string; text: string; from: 'user' | 'ai' }[];
  } | null> {
    type ChatSessionRecord = {
      id: string;
      tenantId: string;
      userId: string;
      title?: string | null;
      createdAt: Date;
      updatedAt: Date;
    };

    let session: ChatSessionRecord | null = null;

    if (sessionId) {
      const candidate = (await this.prisma.chatSession.findFirst({
        where: { id: sessionId, tenantId },
      })) as ChatSessionRecord | null;
      session = candidate;
    } else {
      const candidate = (await this.prisma.chatSession.findFirst({
        where: { tenantId, userId },
        orderBy: { updatedAt: 'desc' },
      })) as ChatSessionRecord | null;
      session = candidate;
    }

    if (!session) return null;

    const msgs = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      sessionId: session.id,
      messages: msgs.map((m) => ({
        id: m.id,
        text: m.content,
        from: m.role === 'USER' ? 'user' : ('ai' as const),
      })),
    };
  }

  async getUserSessions(userId: string, tenantId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const sessionIds = sessions.map((session) => session.id);
    const lastMessages = sessionIds.length
      ? await this.prisma.chatMessage.findMany({
          where: { sessionId: { in: sessionIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const latestMessageBySession = new Map<string, string>();
    for (const message of lastMessages) {
      if (!latestMessageBySession.has(message.sessionId)) {
        latestMessageBySession.set(message.sessionId, message.content);
      }
    }

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      lastMessage: latestMessageBySession.get(session.id) ?? 'No messages yet',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }

  async updateSessionTitle(
    userId: string,
    tenantId: string,
    sessionId: string,
    title: string,
  ) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId },
    });

    if (!session) {
      return null;
    }

    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: title.trim().slice(0, 255) || null },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async startNewSession(userId: string, tenantId: string) {
    const session = await this.prisma.chatSession.create({
      data: { userId, tenantId },
    });
    return { sessionId: session.id };
  }

  async deleteSession(userId: string, tenantId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId },
    });
    if (!session) {
      // do nothing if not found or not owner
      return { deleted: false };
    }

    await this.prisma.chatMessage.deleteMany({ where: { sessionId } });
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
    return { deleted: true };
  }

  async getLogs(userId: string, tenantId: string, take = 50) {
    const logs = await this.prisma.aiInteractionLog.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return logs.map((l) => ({
      id: l.id,
      model: l.model,
      status: l.status,
      latencyMs: l.latencyMs,
      inputTokens: l.inputTokens,
      outputTokens: l.outputTokens,
      createdAt: l.createdAt,
      reply: (() => {
        try {
          const parsed: unknown =
            typeof l.output === 'string' ? JSON.parse(l.output) : l.output;
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'replyToUser' in parsed &&
            typeof parsed.replyToUser === 'string'
          ) {
            return parsed.replyToUser;
          }
          return null;
        } catch {
          return null;
        }
      })(),
    }));
  }
}
