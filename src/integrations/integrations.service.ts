import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from './google-calendar.service';
import { UpdateWhatsAppDto } from './dto/update-whatsapp.dto';

const STATE_TTL_SECONDS = 600;

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async getProfile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: { googleCalendarToken: true },
    });
    if (!profile) {
      throw new NotFoundException('No professional profile for this account.');
    }
    return profile;
  }

  async getStatus(userId: string) {
    const profile = await this.getProfile(userId);
    return {
      googleCalendar: {
        connected: profile.googleCalendarConnected,
        email: profile.googleCalendarEmail,
      },
      whatsapp: { remindersEnabled: profile.whatsappRemindersEnabled },
      paystack: { subaccountConfigured: !!profile.paystackSubaccountCode },
    };
  }

  async getGoogleConnectUrl(userId: string): Promise<{ url: string }> {
    const profile = await this.getProfile(userId);
    const state = await this.jwt.signAsync(
      { professionalId: profile.id },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: STATE_TTL_SECONDS,
      },
    );
    return { url: this.googleCalendar.buildConsentUrl(state) };
  }

  async handleGoogleCallback(code: string, state: string): Promise<string> {
    let payload: { professionalId: string };
    try {
      payload = await this.jwt.verifyAsync<{ professionalId: string }>(state, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired OAuth state.');
    }

    const tokens = await this.googleCalendar.exchangeCode(code);

    await this.prisma.$transaction([
      this.prisma.googleCalendarToken.upsert({
        where: { professionalId: payload.professionalId },
        create: { professionalId: payload.professionalId, ...tokens },
        update: tokens,
      }),
      this.prisma.professionalProfile.update({
        where: { id: payload.professionalId },
        data: {
          googleCalendarConnected: true,
          googleCalendarEmail: tokens.googleEmail,
        },
      }),
    ]);

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    return `${frontendUrl}/dashboard/integrations?googleCalendar=connected`;
  }

  async disconnectGoogle(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    await this.prisma.$transaction([
      this.prisma.googleCalendarToken.deleteMany({
        where: { professionalId: profile.id },
      }),
      this.prisma.professionalProfile.update({
        where: { id: profile.id },
        data: { googleCalendarConnected: false, googleCalendarEmail: null },
      }),
    ]);
  }

  async updateWhatsApp(userId: string, dto: UpdateWhatsAppDto) {
    const profile = await this.getProfile(userId);
    return this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { whatsappRemindersEnabled: dto.remindersEnabled },
    });
  }
}
