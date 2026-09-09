import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { User } from '@prisma/client';
import { google } from 'googleapis';
import { MailService } from '../mail/mail.service';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type PublicUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: User['role'];
};

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser } & TokenPair> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const saltRounds = Number(this.config.get('BCRYPT_SALT_ROUNDS', '10'));
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
      },
    });

    const tokens = await this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser } & TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const tokens = await this.issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  }

  async googleLogin(code: string): Promise<{ user: PublicUser } & TokenPair> {
    try {
      const client = new google.auth.OAuth2(
        this.config.get<string>('GOOGLE_CLIENT_ID'),
        this.config.get<string>('GOOGLE_CLIENT_SECRET'),
        'postmessage', // required for popup flow
      );

      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      const oauth2 = google.oauth2({ auth: client, version: 'v2' });
      const { data } = await oauth2.userinfo.get();
      
      const email = data.email;
      const name = data.name || email?.split('@')[0] || 'User';

      if (!email) {
        throw new UnauthorizedException('No email returned from Google.');
      }

      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            name,
            passwordHash: null,
          },
        });
      }

      // Only store/update the GoogleCalendarToken if the user actually granted calendar
      // access on this login — the Google button no longer requests it by default, so an
      // access token alone (always present) doesn't mean calendar access was granted.
      const grantedCalendarScope = (tokens.scope ?? '').includes(
        'https://www.googleapis.com/auth/calendar',
      );
      if (grantedCalendarScope) {
        await this.prisma.googleCalendarToken.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            accessToken: tokens.access_token ?? '',
            refreshToken: tokens.refresh_token ?? '',
            scope: tokens.scope ?? 'https://www.googleapis.com/auth/calendar.events',
            tokenType: tokens.token_type ?? 'Bearer',
            expiryDate: new Date(tokens.expiry_date ?? Date.now()),
            googleEmail: email,
          },
          update: {
            accessToken: tokens.access_token ?? '',
            ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
            ...(tokens.scope ? { scope: tokens.scope } : {}),
            ...(tokens.token_type ? { tokenType: tokens.token_type } : {}),
            ...(tokens.expiry_date ? { expiryDate: new Date(tokens.expiry_date) } : {}),
            googleEmail: email,
          },
        });

        // If they already have a professional profile, automatically set it as connected
        const profile = await this.prisma.professionalProfile.findUnique({
          where: { userId: user.id },
        });
        if (profile && !profile.googleCalendarConnected) {
          await this.prisma.professionalProfile.update({
            where: { id: profile.id },
            data: {
              googleCalendarConnected: true,
              googleCalendarEmail: email,
            },
          });
        }
      }

      const appTokens = await this.issueTokens(user);
      return { user: toPublicUser(user), ...appTokens };
    } catch (err) {
      console.error('Google login error:', err);
      throw new UnauthorizedException('Google authentication failed.');
    }
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(rawRefreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const matched = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!matched) {
      throw new UnauthorizedException(
        'Refresh token has been revoked or is unknown.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user);
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Refresh tokens are high-entropy JWTs, not low-entropy secrets like passwords — bcrypt is the
   * wrong tool here (it silently truncates input at 72 bytes). A plain SHA-256 digest is the
   * standard approach for storing lookup-able hashes of already-random tokens.
   */
  private hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async me(
    userId: string,
  ): Promise<PublicUser & { professionalProfileId: string | null }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { professionalProfile: true },
    });
    return {
      ...toPublicUser(user),
      professionalProfileId: user.professionalProfile?.id ?? null,
    };
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessExpiresInMs = this.parseExpiryMs(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );
    const refreshExpiresInMs = this.parseExpiryMs(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    );

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: Math.floor(accessExpiresInMs / 1000),
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: Math.floor(refreshExpiresInMs / 1000),
      },
    );

    const tokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + refreshExpiresInMs);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private parseExpiryMs(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry.trim());
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000;
    }
    const value = Number(match[1]);
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return value * unitMs[match[2]];
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return successfully even if user not found to prevent email enumeration
      return;
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    await this.mail.sendPasswordReset(user.email, token, frontendUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });
  }
}
