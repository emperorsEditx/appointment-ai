import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BUSINESS_HOURS } from '../../utils/business-hours.config';

const DEFAULT_DURATION_MINUTES = 30;

export type BookingInput = {
  tenantId: string;
  userId: string;
  preferredDate: string;
  preferredTime: string;
  service?: string;
};

function format12Hour(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Find an appointment for a user by optional service and date context.
  // If date is provided (YYYY-MM-DD) we match appointments on that date.
  // Otherwise return the next upcoming confirmed appointment for the user.
  async findAppointmentByContext(
    tenantId: string,
    userId: string,
    opts?: { service?: string | null; date?: string | null },
  ) {
    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      userId,
      status: 'CONFIRMED',
    };
    if (opts?.service) {
      where.notes = opts.service;
    }

    if (opts?.date) {
      const dayStart = new Date(`${opts.date}T00:00:00`);
      const dayEnd = new Date(`${opts.date}T23:59:59`);
      return this.prisma.appointment.findFirst({
        where: { ...where, startAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { startAt: 'asc' },
      });
    }

    // fallback: next upcoming appointment
    return this.prisma.appointment.findFirst({
      where: { ...where, startAt: { gte: new Date() } },
      orderBy: { startAt: 'asc' },
    });
  }

  // Update appointment times (and optionally service). Validates conflicts.
  async updateAppointment(
    tenantId: string,
    appointmentId: string,
    newDate: string,
    newTime: string,
    service?: string | null,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });
    if (!appointment) throw new BadRequestException('Appointment not found');

    const startAt = this.parseDateTime(newDate, newTime);
    const endAt = new Date(
      startAt.getTime() + DEFAULT_DURATION_MINUTES * 60_000,
    );
    if (startAt.getTime() < Date.now()) {
      throw new BadRequestException('Requested time is in the past');
    }

    // conflict check excluding the appointment being updated
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        status: 'CONFIRMED',
        id: { not: appointmentId },
        notes: service ?? null,
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      },
    });
    if (conflict)
      throw new ConflictException(
        'Time slot conflicts with an existing appointment',
      );

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { startAt, endAt, notes: service ?? null },
    });

    return updated;
  }

  // Cancel an appointment (mark as CANCELLED)
  async cancelAppointment(tenantId: string, appointmentId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });
    if (!appt) throw new BadRequestException('Appointment not found');
    if (appt.status === 'CANCELLED') return appt;
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });
  }

  async createFromIntent(input: BookingInput) {
    const startAt = this.parseDateTime(
      input.preferredDate,
      input.preferredTime,
    );
    const endAt = new Date(
      startAt.getTime() + DEFAULT_DURATION_MINUTES * 60_000,
    );

    if (startAt.getTime() < Date.now()) {
      throw new BadRequestException('Requested time is in the past');
    }

    const serviceLabel = input.service ?? null;

    // dedup check now also matches on service — same slot, different service, is NOT the same appointment
    const exact = await this.prisma.appointment.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        status: 'CONFIRMED',
        startAt,
        endAt,
      },
    });
    if (exact) return { appointment: exact, alreadyExisted: true };

    // conflict check scoped per service (treat each service as its own resource/calendar)
    // dentist and barber can be booked at the same time — they don't compete for the same slot
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        tenantId: input.tenantId,
        status: 'CONFIRMED',
        notes: serviceLabel,
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      },
    });
    if (conflict)
      throw new ConflictException(
        'Time slot conflicts with an existing appointment',
      );

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        startAt,
        endAt,
        notes: serviceLabel,
      },
    });

    return { appointment, alreadyExisted: false };
  }

  async listForUser(
    tenantId: string,
    userId: string,
    status?: 'CONFIRMED' | 'CANCELLED',
  ) {
    return this.prisma.appointment.findMany({
      where: { tenantId, userId, ...(status ? { status } : {}) },
      orderBy: { startAt: 'asc' },
    });
  }

  getAvailableDates(days = 14): { date: string; available: boolean }[] {
    const result: { date: string; available: boolean }[] = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      result.push({
        date: iso,
        available: !BUSINESS_HOURS.closedWeekdays.includes(d.getDay()),
      });
    }
    return result;
  }

  async getAvailableSlots(
    tenantId: string,
    date: string,
    service?: string,
  ): Promise<string[]> {
    const day = new Date(`${date}T00:00:00`);
    if (Number.isNaN(day.getTime()))
      throw new BadRequestException('Invalid date');
    if (BUSINESS_HOURS.closedWeekdays.includes(day.getDay())) return [];

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const existing = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        status: 'CONFIRMED',
        notes: service ?? null,
        startAt: { gte: dayStart, lte: dayEnd },
      },
      select: { startAt: true, endAt: true },
    });

    const slots: string[] = [];
    const { startHour, endHour, slotMinutes } = BUSINESS_HOURS;

    for (let mins = startHour * 60; mins < endHour * 60; mins += slotMinutes) {
      const slotStart = new Date(`${date}T00:00:00`);
      slotStart.setMinutes(mins);
      const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
      if (slotStart.getTime() < Date.now()) continue;

      const overlaps = existing.some(
        (a) => slotStart < a.endAt && slotEnd > a.startAt,
      );
      if (!overlaps) slots.push(format12Hour(slotStart));
    }

    return slots;
  }

  private parseDateTime(date: string, time: string): Date {
    // Accept either 24-hour `HH:MM` or 12-hour `h:MM AM/PM` time strings.
    const normalized = this.normalizeTimeTo24(time);
    const combined = new Date(`${date}T${normalized}`);
    if (Number.isNaN(combined.getTime())) {
      throw new BadRequestException('Could not parse appointment date/time');
    }
    return combined;
  }

  private normalizeTimeTo24(time: string): string {
    // If already in HH:MM 24-hour format, return as-is
    const hhmm = /^\d{2}:\d{2}$/;
    if (hhmm.test(time)) return time;

    // Match 12-hour format like "2:00 PM" or "02:00PM"
    const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/);
    if (!m) {
      // Try to coerce simple 'H:MM' into 'HH:MM' (assume 24h)
      const simple = time.match(/^(\d{1,2}):(\d{2})$/);
      if (simple) return simple[1].padStart(2, '0') + ':' + simple[2];
      throw new BadRequestException('Invalid time format');
    }

    let hour = Number(m[1]);
    const minute = m[2];
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }
}
