import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateInquiryDto) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { username: dto.username.replace(/^@/, '').toLowerCase() },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Professional not found.');
    }

    const inquiry = await this.prisma.inquiry.create({
      data: {
        professionalId: profile.id,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        message: dto.message,
      },
      include: {
        professional: { include: { user: true } },
      }
    });

    await this.mail.sendSpecialInquiryEmail(inquiry);
    
    return { success: true };
  }

  async listMine(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    
    if (!profile) {
      return [];
    }

    return this.prisma.inquiry.findMany({
      where: { professionalId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
