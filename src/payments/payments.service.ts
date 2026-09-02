import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { koboToNaira } from '../common/constants/money';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, pagination: PaginationDto) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('No professional profile for this account.');
    }

    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 20;

    const where = {
      status: PaymentStatus.SUCCESS,
      booking: { professionalId: profile.id },
    };

    const [transactions, total] = await Promise.all([
      this.prisma.paystackTransaction.findMany({
        where,
        include: { booking: { include: { service: true } } },
        orderBy: { paidAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.paystackTransaction.count({ where }),
    ]);

    const items = transactions.map((tx) => ({
      id: tx.id,
      bookingId: tx.bookingId,
      professionalId: tx.booking.professionalId,
      paystackReference: tx.reference,
      amountNaira: koboToNaira(tx.amountKobo),
      currency: 'NGN',
      channel: tx.channel,
      status: tx.status,
      paidAt: tx.paidAt,
      customerName: tx.booking.customerName,
      serviceName: tx.booking.service.name,
    }));

    return { items, total, page, pageSize };
  }
}
