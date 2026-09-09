import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  LocationType,
  PaymentChannel,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AvailabilityService } from '../availability/availability.service';
import { PaystackService } from './paystack/paystack.service';
import { GoogleCalendarService } from '../integrations/google-calendar.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { koboToNaira } from '../common/constants/money';
import { minutesToTime, timeToMinutes } from '../availability/slot-math';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { Booking, ProfessionalProfile, Service } from '@prisma/client';

const HOLD_DURATION_MS = 10 * 60 * 1000;
const REFERENCE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReference(): string {
  let ref = 'BLK-';
  for (let i = 0; i < 6; i++) {
    ref += REFERENCE_CHARS.charAt(randomInt(REFERENCE_CHARS.length));
  }
  return ref;
}

const toBookingResponse = (booking: Booking) => ({
  id: booking.id,
  reference: booking.reference,
  professionalId: booking.professionalId,
  serviceId: booking.serviceId,
  customerName: booking.customerName,
  customerEmail: booking.customerEmail,
  customerPhone: booking.customerPhone,
  customerNotes: booking.customerNotes,
  date: booking.date.toISOString().split('T')[0],
  startTime: booking.startTime,
  endTime: booking.endTime,
  status: booking.status,
  heldUntil: booking.heldUntil?.toISOString() ?? null,
  paymentStatus: booking.paymentStatus,
  amountNaira: koboToNaira(booking.amountKobo),
  calendarEventId: booking.calendarEventId,
  meetingLink: booking.meetingLink,
  createdAt: booking.createdAt,
});

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly paystack: PaystackService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly mail: MailService,
  ) {}

  async createHold(username: string, serviceId: string, dto: CreateHoldDto) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { username: username.replace(/^@/, '').toLowerCase() },
    });
    if (!profile) throw new NotFoundException('Professional not found.');

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, professionalId: profile.id, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found.');

    const startMinutes = timeToMinutes(dto.startTime);
    const endTime = minutesToTime(startMinutes + service.durationMinutes);

    const quantity = dto.quantity ?? 1;
    if (service.pricingType === 'VARIABLE') {
      const min = service.minVariable ?? 1;
      const max = service.maxVariable ?? 10;
      if (quantity < min || quantity > max) {
        throw new ConflictException(`Quantity must be between ${min} and ${max}`);
      }
    } else {
      if (quantity !== 1) {
        throw new ConflictException('Quantity cannot be set for a FIXED price service.');
      }
    }

    const amountKobo = service.priceKobo * quantity;

    const booking = await this.attemptHold(
      profile.id,
      service.id,
      dto,
      endTime,
      amountKobo,
      true,
      quantity,
    );
    return {
      booking: toBookingResponse(booking),
      expiresInSeconds: HOLD_DURATION_MS / 1000,
    };
  }

  /**
   * Concurrency-safe hold creation. The DB-level guarantee is a partial unique index on
   * bookings (professional_id, date, start_time) WHERE status IN
   * ('HELD','PENDING_PAYMENT','CONFIRMED') (added via hand-edited migration SQL). This
   * transaction re-checks slot availability, then attempts the insert; a P2002 conflict is
   * either a genuinely taken slot, or a stale expired HELD row that gets reclaimed and
   * retried exactly once.
   */
  private async attemptHold(
    professionalId: string,
    serviceId: string,
    dto: CreateHoldDto,
    endTime: string,
    amountKobo: number,
    allowRetry: boolean,
    quantity: number,
  ): Promise<Booking> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const slots = await this.availability.computeAvailableSlots(
          professionalId,
          serviceId,
          dto.date,
          tx,
        );
        const slot = slots.find((s) => s.startTime === dto.startTime);
        if (!slot || !slot.isAvailable) {
          throw new ConflictException('This slot is not available.');
        }

        return tx.booking.create({
          data: {
            reference: generateReference(),
            professionalId,
            serviceId,
            customerName: dto.customerName,
            customerEmail: dto.customerEmail,
            customerPhone: dto.customerPhone,
            customerNotes: dto.customerNotes,
            quantity,
            date: new Date(dto.date),
            startTime: dto.startTime,
            endTime,
            status: BookingStatus.HELD,
            heldUntil: new Date(Date.now() + HOLD_DURATION_MS),
            amountKobo,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        allowRetry
      ) {
        const reclaimed = await this.reclaimExpiredHold(
          professionalId,
          dto.date,
          dto.startTime,
        );
        if (reclaimed) {
          return this.attemptHold(
            professionalId,
            serviceId,
            dto,
            endTime,
            amountKobo,
            false,
            quantity,
          );
        }
        throw new ConflictException(
          'This slot was just taken — please pick another time.',
        );
      }
      throw error;
    }
  }

  private async reclaimExpiredHold(
    professionalId: string,
    dateString: string,
    startTime: string,
  ): Promise<boolean> {
    const result = await this.prisma.booking.updateMany({
      where: {
        professionalId,
        date: new Date(dateString),
        startTime,
        status: BookingStatus.HELD,
        heldUntil: { lte: new Date() },
      },
      data: { status: BookingStatus.EXPIRED },
    });
    return result.count > 0;
  }

  async initCheckout(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { professional: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (
      booking.status !== BookingStatus.HELD ||
      !booking.heldUntil ||
      booking.heldUntil <= new Date()
    ) {
      throw new GoneException('This hold has expired — please start again.');
    }

    const reference = `pstk_${randomUUID()}`;
    const result = await this.paystack.initializeTransaction({
      email: booking.customerEmail,
      amountKobo: booking.amountKobo,
      reference,
      subaccountCode: booking.professional.paystackSubaccountCode,
    });

    await this.prisma.paystackTransaction.create({
      data: {
        bookingId: booking.id,
        reference: result.reference,
        authorizationUrl: result.authorizationUrl,
        accessCode: result.accessCode,
        amountKobo: booking.amountKobo,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
    };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ received: boolean }> {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid Paystack webhook signature.');
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      data: { reference: string; channel?: string };
    };

    const transaction = await this.prisma.paystackTransaction.findUnique({
      where: { reference: payload.data.reference },
      include: { booking: { include: { professional: true, service: true } } },
    });
    if (!transaction) {
      return { received: true };
    }

    if (payload.event === 'charge.success') {
      if (transaction.status !== PaymentStatus.SUCCESS) {
        const booking = transaction.booking;
        const stillHeld =
          booking.status === BookingStatus.HELD &&
          booking.heldUntil &&
          booking.heldUntil > new Date();

        if (!stillHeld) {
          // Payment cleared after the hold had already expired — don't confirm a stale
          // slot; flag the transaction for manual reconciliation/refund instead.
          await this.prisma.paystackTransaction.update({
            where: { id: transaction.id },
            data: {
              status: PaymentStatus.ABANDONED,
              rawWebhookPayload: payload,
            },
          });
          return { received: true };
        }

        const channel = this.mapChannel(payload.data.channel);
        await this.prisma.$transaction([
          this.prisma.paystackTransaction.update({
            where: { id: transaction.id },
            data: {
              status: PaymentStatus.SUCCESS,
              paidAt: new Date(),
              channel,
              rawWebhookPayload: payload,
            },
          }),
          this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.CONFIRMED,
              paymentStatus: PaymentStatus.SUCCESS,
            },
          }),
        ]);

        await this.pushToGoogleCalendar(booking);
        await this.mail.sendBookingConfirmation(booking.id);
      }
    } else if (payload.event === 'charge.failed') {
      await this.prisma.paystackTransaction.update({
        where: { id: transaction.id },
        data: { status: PaymentStatus.FAILED, rawWebhookPayload: payload },
      });
      await this.prisma.booking.update({
        where: { id: transaction.bookingId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
    }

    return { received: true };
  }

  private async pushToGoogleCalendar(
    booking: Booking & { professional: ProfessionalProfile; service: Service },
  ): Promise<void> {
    const event = await this.googleCalendar.createBookingEvent({
      professionalUserId: booking.professional.userId,
      summary: `${booking.service.name} with ${booking.customerName}`,
      description: booking.customerNotes ?? undefined,
      date: booking.date.toISOString().split('T')[0],
      startTime: booking.startTime,
      endTime: booking.endTime,
      attendeeEmail: booking.customerEmail,
      createMeetLink: booking.service.locationType === LocationType.GOOGLE_MEET,
    });
    if (!event) return;

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        calendarEventId: event.eventId,
        meetingLink: event.meetingLink,
      },
    });
  }

  private mapChannel(channel: string | undefined): PaymentChannel | undefined {
    const valid: PaymentChannel[] = [
      'card',
      'bank_transfer',
      'ussd',
      'apple_pay',
    ];
    return valid.includes(channel as PaymentChannel)
      ? (channel as PaymentChannel)
      : undefined;
  }

  async getByReference(reference: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { reference },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return toBookingResponse(booking);
  }

  async list(
    userId: string,
    pagination: PaginationDto,
    status?: BookingStatus,
  ) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    if (!profile)
      throw new NotFoundException('No professional profile for this account.');

    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 20;

    const where = { professionalId: profile.id, ...(status ? { status } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items: items.map(toBookingResponse), total, page, pageSize };
  }

  async findOneOwned(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { professional: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.professional.userId !== userId) {
      throw new ForbiddenException('You do not own this booking.');
    }
    return toBookingResponse(booking);
  }

  async cancel(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { professional: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.professional.userId !== userId) {
      throw new ForbiddenException('You do not own this booking.');
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
    
    await this.mail.sendCancellation(id);
    
    return toBookingResponse(updated);
  }
}
