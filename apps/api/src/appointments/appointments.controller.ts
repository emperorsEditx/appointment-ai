import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  async create(@User() user: JwtPayload, @Body() dto: CreateAppointmentDto) {
    const result = await this.appointments.createFromIntent({
      tenantId: user.tenantId,
      userId: user.sub,
      preferredDate: dto.preferredDate,
      preferredTime: dto.preferredTime,
      startAt: dto.startAt,
      service: dto.service?.trim() || undefined,
    });

    return {
      appointment: result.appointment,
      alreadyExisted: result.alreadyExisted,
    };
  }

  @Get()
  async list(
    @User() user: JwtPayload,
    @Query('status') status?: 'CONFIRMED' | 'CANCELLED',
  ) {
    return this.appointments.listForUser(user.tenantId, user.sub, status);
  }

  @Get('available-dates')
  availableDates(@Query('days') days?: string) {
    return this.appointments.getAvailableDates(days ? Number(days) : 14);
  }

  @Get('available-slots')
  async availableSlots(
    @User() user: JwtPayload,
    @Query('date') date: string,
    @Query('service') service?: string,
  ) {
    return this.appointments.getAvailableSlots(user.tenantId, date, service);
  }
}
