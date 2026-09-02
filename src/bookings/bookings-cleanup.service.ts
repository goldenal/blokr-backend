import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Dashboard hygiene only — NOT load-bearing for correctness. Expired HELD bookings are
 * already treated as free everywhere it matters (slot computation, hold creation, checkout
 * init) via lazy heldUntil checks. This sweep just keeps professionals' booking lists free
 * of stale HELD rows between those lazy checks.
 */
@Injectable()
export class BookingsCleanupService {
  private readonly logger = new Logger(BookingsCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweepExpiredHolds(): Promise<void> {
    const result = await this.prisma.booking.updateMany({
      where: { status: BookingStatus.HELD, heldUntil: { lte: new Date() } },
      data: { status: BookingStatus.EXPIRED },
    });
    if (result.count > 0) {
      this.logger.debug(`Swept ${result.count} expired hold(s).`);
    }
  }
}
