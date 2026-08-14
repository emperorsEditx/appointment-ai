import { Injectable, Logger } from '@nestjs/common';
import { Mistral } from '@mistralai/mistralai';
import { z } from 'zod';

export type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

export type AppointmentIntent = {
  intent:
    | 'BOOK_APPOINTMENT'
    | 'CONFIRM_BOOKING'
    | 'CHANGE_BOOKING'
    | 'CANCEL_APPOINTMENT'
    | 'ASK_INFO'
    | 'UNCLEAR';

  service?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;

  missingFields: string[];

  replyToUser: string;
};

export type MistralExtractionResult = {
  intent: AppointmentIntent;
  raw: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
};

type MistralChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type MistralChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
};

const SYSTEM_PROMPT = (currentDate: string) => `
You are an appointment booking assistant.

Today's date is: ${currentDate}

Your job is to understand the user's LATEST message using the conversation history as context.

IMPORTANT RULES:

1. The latest user message is the primary input.
2. Use previous messages only when necessary to understand references such as:
   - "yes"
   - "go ahead"
   - "book it"
   - "that one"
   - "same time"
   - "cancel it"
   - "change it"
3. NEVER invent dates, times, services, or appointment details.
4. If the user confirms a previously discussed/pending appointment, use CONFIRM_BOOKING.
5. If the user wants to change the pending appointment, use CHANGE_BOOKING.
6. If the user wants to cancel an appointment, use CANCEL_APPOINTMENT.
7. A simple "thanks", "ok", "cool", "great", etc. is ASK_INFO.
8. If the user asks about available services or general business information, use ASK_INFO.
9. If you cannot determine the user's intention, use UNCLEAR.
10. Do not treat a previously completed booking as a new booking.
11. Do not return BOOK_APPOINTMENT merely because the conversation previously contained a booking request.
12. Only use BOOK_APPOINTMENT when the latest user message is actually requesting a new appointment.

INTENTS:

BOOK_APPOINTMENT
The user wants to create a NEW appointment.

CONFIRM_BOOKING
The user is confirming a previously discussed/pending appointment.

Examples:
"yes"
"yes please"
"go ahead"
"book it"
"confirm"
"that's fine"
"that works"
"yes, that's good"

CHANGE_BOOKING
The user wants to change the date, time, or service of a pending appointment.

Examples:
"change it to 11"
"make it 2pm instead"
"no, tomorrow"
"choose another time"
"I want a different slot"

CANCEL_APPOINTMENT
The user wants to cancel an existing or pending appointment.

Examples:
"cancel it"
"cancel my appointment"
"I don't want it anymore"

ASK_INFO
The user is asking a general question, greeting, thanking, or asking about services.

UNCLEAR
The intent cannot be determined.

DATE RULES:

- Return dates as YYYY-MM-DD when the date is explicitly known.
- Resolve relative dates using the current date provided by the application.
- Never guess a date when it cannot be determined.

TIME RULES:

- Normalize times when possible and prefer 12-hour output.
- "10 AM" -> "10:00 AM"
- "2 PM" -> "2:00 PM"
- "half past 3" -> "3:30 PM"

Return ONLY valid JSON:

{
  "intent": "BOOK_APPOINTMENT" | "CONFIRM_BOOKING" | "CHANGE_BOOKING" | "CANCEL_APPOINTMENT" | "ASK_INFO" | "UNCLEAR",
  "service": string or null,
  "preferredDate": string or null,
  "preferredTime": string or null,
  "missingFields": string[],
  "replyToUser": string
}

For CONFIRM_BOOKING, CHANGE_BOOKING and CANCEL_APPOINTMENT,
use the conversation context to determine which appointment the user is referring to.

Do not put markdown around the JSON.
`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Accept either 24-hour `HH:MM` or 12-hour `h:MM AM/PM` formats
const TIME_RE = /^(?:\d{2}:\d{2}|\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))$/;

const AppointmentIntentSchema = z.object({
  intent: z.enum([
    'BOOK_APPOINTMENT',
    'CONFIRM_BOOKING',
    'CHANGE_BOOKING',
    'CANCEL_APPOINTMENT',
    'ASK_INFO',
    'UNCLEAR',
  ]),

  service: z.string().nullable().optional(),
  preferredDate: z
    .string()
    .nullable()
    .optional()
    .refine((v) => v == null || DATE_RE.test(v), {
      message: 'preferredDate must be YYYY-MM-DD or null',
    }),
  preferredTime: z
    .string()
    .nullable()
    .optional()
    .refine((v) => v == null || TIME_RE.test(v), {
      message: 'preferredTime must be HH:MM or null',
    }),

  // Accept any strings from the model, we'll normalize them below to canonical names
  missingFields: z.array(z.string()),

  replyToUser: z.string(),
});

@Injectable()
export class MistralService {
  private readonly logger = new Logger(MistralService.name);
  private readonly client: Mistral;
  private readonly model = 'mistral-small-latest';

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      this.logger.warn('MISTRAL_API_KEY not set — AI calls will fail');
    }
    this.client = new Mistral({ apiKey });
  }

  private static overrideIntentFromUserText(
    history: ChatHistoryItem[],
    intent: AppointmentIntent,
  ): AppointmentIntent {
    const latestUserMessage =
      [...history].reverse().find((message) => message.role === 'user')
        ?.content ?? '';
    const normalized = latestUserMessage.toLowerCase();

    const isRescheduleIntent =
      /\b(change|modify|move|reschedul|shift|update|switch|different|instead|earlier|later|new time)\b/i.test(
        normalized,
      );
    const isCancelIntent = /\b(cancel|cancell|remove|delete|drop|stop)\b/i.test(
      normalized,
    );

    if (isRescheduleIntent && intent.intent === 'BOOK_APPOINTMENT') {
      return { ...intent, intent: 'CHANGE_BOOKING' };
    }

    if (isCancelIntent && intent.intent === 'BOOK_APPOINTMENT') {
      return { ...intent, intent: 'CANCEL_APPOINTMENT' };
    }

    return intent;
  }

  async extractAppointmentIntent(
    history: ChatHistoryItem[],
  ): Promise<MistralExtractionResult> {
    const start = Date.now();

    // Defensive: ensure the final message sent to the model is a user message.
    // Some call sites may include trailing assistant messages; truncate history
    // to the last user message so the model receives a user-final sequence.
    const lastUserIdx = history.map((h) => h.role).lastIndexOf('user');
    const safeHistory =
      lastUserIdx >= 0 ? history.slice(0, lastUserIdx + 1) : history;

    const messages: MistralChatMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT(new Date().toISOString().split('T')[0]),
      },
      ...safeHistory.map((h) =>
        h.role === 'user'
          ? { role: 'user' as const, content: h.content }
          : { role: 'assistant' as const, content: h.content },
      ),
    ];

    let response: MistralChatCompletion;
    try {
      response = (await this.client.chat.complete({
        model: this.model,
        responseFormat: { type: 'json_object' },
        messages,
      })) as unknown as MistralChatCompletion;
    } catch (err: unknown) {
      this.logger.error(
        'Mistral API error',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }

    const latencyMs = Date.now() - start;
    const raw = response.choices?.[0]?.message?.content;
    const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw);

    let intent: AppointmentIntent;
    try {
      const parsed: unknown = JSON.parse(rawText);

      const validated = AppointmentIntentSchema.safeParse(parsed);

      if (!validated.success) {
        this.logger.warn(
          `Invalid Mistral response: ${validated.error.message}`,
        );

        intent = {
          intent: 'UNCLEAR',
          service: null,
          preferredDate: null,
          preferredTime: null,
          missingFields: [],
          replyToUser:
            "Sorry, I didn't quite catch that. Could you tell me what you'd like to book?",
        };
      } else {
        // Normalize missingFields to canonical names we expect in the system
        const raw = validated.data;
        const normalize = (vals: string[]) => {
          const out = new Set<string>();
          for (const v of vals) {
            if (!v) continue;
            const low = v.toLowerCase();
            if (low.includes('service') || low === 'service')
              out.add('service');
            else if (low.includes('date')) out.add('preferredDate');
            else if (low.includes('time')) out.add('preferredTime');
          }
          return Array.from(out);
        };

        intent = MistralService.overrideIntentFromUserText(history, {
          ...raw,
          missingFields: normalize(raw.missingFields || []),
        });
      }
    } catch {
      intent = {
        intent: 'UNCLEAR',
        missingFields: [],
        replyToUser:
          "Sorry, I didn't quite catch that. Could you tell me what service you'd like to book and when?",
      };
    }

    return {
      intent,
      raw: rawText,
      model: this.model,
      latencyMs,
      inputTokens: response.usage?.promptTokens,
      outputTokens: response.usage?.completionTokens,
    };
  }
}
