import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, DayOfWeek, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { UpsertAvailabilityRulesDto } from './dto/upsert-availability-rules.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import {
  ComputedSlot,
  TimeRange,
  getDayOfWeekFromDate,
  minutesToTime,
  timeToMinutes,
} from './slot-math';

/** Prisma client or an in-flight $transaction callback client — both share this interface. */
type Db = PrismaService | Prisma.TransactionClient;

const SLOT_INTERVAL_MINUTES = 30;

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async getRules(userId: string) {
    const profile = await this.professionalsService.getMine(userId);
    return this.prisma.availabilityRule.findMany({
      where: { professionalId: profile.id },
    });
  }

  async upsertRules(userId: string, dto: UpsertAvailabilityRulesDto) {
    const profile = await this.professionalsService.getMine(userId);
    return this.prisma.$transaction(
      dto.rules.map((rule) =>
        this.prisma.availabilityRule.upsert({
          where: {
            professionalId_dayOfWeek: {
              professionalId: profile.id,
              dayOfWeek: rule.dayOfWeek,
            },
          },
          create: {
            professionalId: profile.id,
            dayOfWeek: rule.dayOfWeek,
            isEnabled: rule.isEnabled,
            timeRanges: rule.timeRanges as unknown as Prisma.InputJsonValue,
          },
          update: {
            isEnabled: rule.isEnabled,
            timeRanges: rule.timeRanges as unknown as Prisma.InputJsonValue,
          },
        }),
      ),
    );
  }

  async listOverrides(userId: string, from?: string, to?: string) {
    const profile = await this.professionalsService.getMine(userId);
    return this.prisma.availabilityOverride.findMany({
      where: {
        professionalId: profile.id,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  async createOverride(userId: string, dto: CreateOverrideDto) {
    const profile = await this.professionalsService.getMine(userId);
    return this.prisma.availabilityOverride.upsert({
      where: {
        professionalId_date: {
          professionalId: profile.id,
          date: new Date(dto.date),
        },
      },
      create: {
        professionalId: profile.id,
        date: new Date(dto.date),
        isAvailable: dto.isAvailable,
        timeRanges: dto.timeRanges as unknown as Prisma.InputJsonValue,
        reason: dto.reason,
      },
      update: {
        isAvailable: dto.isAvailable,
        timeRanges: dto.timeRanges as unknown as Prisma.InputJsonValue,
        reason: dto.reason,
      },
    });
  }

  async removeOverride(userId: string, id: string) {
    const profile = await this.professionalsService.getMine(userId);
    const override = await this.prisma.availabilityOverride.findUnique({
      where: { id },
    });
    if (!override || override.professionalId !== profile.id) {
      throw new NotFoundException('Availability override not found.');
    }
    await this.prisma.availabilityOverride.delete({ where: { id } });
  }

  /* eslint-disable @typescript-eslint/no-unused-vars -- stub keeps the signature a real
     Google Calendar freebusy lookup will need; see doc comment below. */
  /**
   * Extension point for real Google Calendar freebusy lookups. Returns [] in v1 — the
   * professional's GoogleCalendarToken (when connected) is the integration point a future
   * pass wires up here; slot computation already has a BUSY_CALENDAR status ready for it.
   * Takes the same (professionalId, dayOfWeek) a real implementation will need.
   */
  private getCalendarBusyEvents(
    professionalId: string,
    dayOfWeek: DayOfWeek,
  ): TimeRange[] {
    return [];
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  /**
   * Server-side port of the blokr frontend's lib/availabilityEngine.ts computeAvailableSlots.
   * Accepts an optional transactional `db` client so callers holding a booking-hold
   * transaction can re-check availability against the same transaction (see
   * BookingsService.createHold).
   */
  async computeAvailableSlots(
    professionalId: string,
    serviceId: string,
    dateString: string,
    db: Db = this.prisma,
  ): Promise<ComputedSlot[]> {
    const service = await db.service.findFirst({
      where: { id: serviceId, professionalId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    const targetDate = new Date(`${dateString}T00:00:00`);
    const dayOfWeek = getDayOfWeekFromDate(targetDate);

    const override = await db.availabilityOverride.findUnique({
      where: {
        professionalId_date: { professionalId, date: new Date(dateString) },
      },
    });
    if (override && !override.isAvailable) {
      return [];
    }

    const rule = await db.availabilityRule.findUnique({
      where: { professionalId_dayOfWeek: { professionalId, dayOfWeek } },
    });
    const timeRanges = (rule?.timeRanges as unknown as TimeRange[]) ?? [];
    if (!rule || !rule.isEnabled || timeRanges.length === 0) {
      return [];
    }

    const duration = service.durationMinutes;
    const buffer = service.bufferMinutes || 0;
    const candidateSlots: ComputedSlot[] = [];

    const now = new Date();
    const isToday = targetDate.toDateString() === now.toDateString();
    const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();

    const dateBookings = await db.booking.findMany({
      where: {
        professionalId,
        date: new Date(dateString),
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] },
      },
    });

    const calendarBusyEvents = this.getCalendarBusyEvents(
      professionalId,
      dayOfWeek,
    );

    for (const range of timeRanges) {
      const rangeStartMin = timeToMinutes(range.start);
      const rangeEndMin = timeToMinutes(range.end);

      for (
        let slotStartMin = rangeStartMin;
        slotStartMin + duration <= rangeEndMin;
        slotStartMin += SLOT_INTERVAL_MINUTES
      ) {
        const slotEndMin = slotStartMin + duration;
        const startTime = minutesToTime(slotStartMin);
        const endTime = minutesToTime(slotEndMin);

        if (isToday && slotStartMin <= currentMinutesFromMidnight + 15) {
          continue;
        }

        let isAvailable = true;
        let slotStatus: ComputedSlot['status'] = 'AVAILABLE';
        let heldUntilStr: string | undefined;

        for (const booking of dateBookings) {
          const bookingStartMin = timeToMinutes(booking.startTime);
          const bookingEndMin = timeToMinutes(booking.endTime) + buffer;

          if (slotStartMin < bookingEndMin && slotEndMin > bookingStartMin) {
            if (booking.status === BookingStatus.HELD) {
              // Lazy expiry: a HELD row past its heldUntil is treated as if it doesn't
              // exist. This is the correctness mechanism, not the cleanup cron.
              if (booking.heldUntil && booking.heldUntil > now) {
                isAvailable = false;
                slotStatus = 'HELD';
                heldUntilStr = booking.heldUntil.toISOString();
                break;
              }
            } else if (
              booking.status === BookingStatus.CONFIRMED ||
              booking.status === BookingStatus.PENDING_PAYMENT
            ) {
              isAvailable = false;
              slotStatus = 'BOOKED';
              break;
            }
          }
        }

        if (isAvailable) {
          for (const busy of calendarBusyEvents) {
            const busyStartMin = timeToMinutes(busy.start);
            const busyEndMin = timeToMinutes(busy.end);
            if (slotStartMin < busyEndMin && slotEndMin > busyStartMin) {
              isAvailable = false;
              slotStatus = 'BUSY_CALENDAR';
              break;
            }
          }
        }

        candidateSlots.push({
          startTime,
          endTime,
          isAvailable,
          status: slotStatus,
          heldUntil: heldUntilStr,
        });
      }
    }

    return candidateSlots;
  }
}
