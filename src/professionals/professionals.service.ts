import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../bookings/paystack/paystack.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import type { ProfessionalProfile } from '@prisma/client';

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  async create(userId: string, dto: CreateProfessionalDto) {
    const existing = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException(
        'A professional profile already exists for this account.',
      );
    }

    const googleToken = await this.prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    return this.prisma.professionalProfile.create({
      data: {
        userId,
        name: dto.name,
        businessName: dto.businessName,
        username: dto.username.toLowerCase(),
        bio: dto.bio,
        category: dto.category,
        avatarUrl: dto.avatarUrl,
        timezone: dto.timezone ?? 'Africa/Lagos (WAT)',
        location: dto.location,
        phone: dto.phone,
        whatsappRemindersEnabled: dto.whatsappRemindersEnabled ?? true,
        ...(googleToken ? {
          googleCalendarConnected: true,
          googleCalendarEmail: googleToken.googleEmail,
        } : {}),
      },
    });
  }

  async getMine(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('No professional profile for this account.');
    }
    return profile;
  }

  async updateMine(userId: string, dto: UpdateProfessionalDto) {
    const profile = await this.getMine(userId);
    return this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: dto,
    });
  }

  async updatePayout(userId: string, dto: UpdatePayoutDto) {
    const profile = await this.getMine(userId);

    const { subaccountCode } = await this.paystack.createOrUpdateSubaccount({
      existingSubaccountCode: profile.paystackSubaccountCode,
      businessName: profile.businessName,
      bankCode: dto.bankCode,
      accountNumber: dto.bankAccountNumber,
    });

    return this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankAccountName: dto.bankAccountName,
        paystackSubaccountCode: subaccountCode,
      },
    });
  }

  async isUsernameAvailable(userId: string, username: string) {
    const cleaned = username.toLowerCase();
    const existing = await this.prisma.professionalProfile.findUnique({
      where: { username: cleaned },
    });
    return { available: !existing || existing.userId === userId };
  }

  async getPublicByUsername(username: string) {
    const cleaned = username.replace(/^@/, '').toLowerCase();
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { username: cleaned },
      include: { services: { where: { isActive: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Professional not found.');
    }
    // Allowlist, not a denylist — settlement fields (paystackSubaccountCode, bankName,
    // bankAccountNumber, bankAccountName) are never listed here, so any new sensitive
    // field added to the model later is excluded by default rather than leaked.
    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      businessName: profile.businessName,
      username: profile.username,
      bio: profile.bio,
      category: profile.category,
      avatarUrl: profile.avatarUrl,
      timezone: profile.timezone,
      location: profile.location,
      phone: profile.phone,
      googleCalendarConnected: profile.googleCalendarConnected,
      googleCalendarEmail: profile.googleCalendarEmail,
      whatsappRemindersEnabled: profile.whatsappRemindersEnabled,
      rating: profile.rating,
      reviewsCount: profile.reviewsCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      services: profile.services,
    };
  }

  async assertOwnedByUser(
    professionalId: string,
    userId: string,
  ): Promise<ProfessionalProfile> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id: professionalId },
    });
    if (!profile) {
      throw new NotFoundException('Professional not found.');
    }
    if (profile.userId !== userId) {
      throw new ForbiddenException('You do not own this professional profile.');
    }
    return profile;
  }
}
