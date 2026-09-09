import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// The platform only operates in Nigeria today; ProfessionalProfile.timezone is a free-text
// display string (e.g. "Africa/Lagos (WAT)"), not a valid IANA zone, so it can't be passed
// straight through to the Calendar API.
const CALENDAR_TIMEZONE = 'Africa/Lagos';

export type CreateBookingEventParams = {
  professionalUserId: string;
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  attendeeEmail: string;
  createMeetLink: boolean;
};

export type CreatedBookingEvent = {
  eventId: string;
  meetingLink: string | null;
};

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isConfigured(): boolean {
    const id = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    return !!id && !id.includes('REPLACE_ME');
  }

  private buildClient() {
    return new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      this.config.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  buildConsentUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google Calendar is not configured yet — set GOOGLE_CLIENT_ID/SECRET.',
      );
    }
    const client = this.buildClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state,
    });
  }

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    scope: string;
    tokenType: string;
    expiryDate: Date;
    googleEmail: string;
  }> {
    const client = this.buildClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: 'v2' });
    const { data } = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token ?? '',
      refreshToken: tokens.refresh_token ?? '',
      scope: tokens.scope ?? SCOPES.join(' '),
      tokenType: tokens.token_type ?? 'Bearer',
      expiryDate: new Date(tokens.expiry_date ?? Date.now()),
      googleEmail: data.email ?? '',
    };
  }

  /**
   * Creates an event on the professional's primary Google Calendar for a confirmed booking.
   * Returns null (rather than throwing) when the professional hasn't connected Google
   * Calendar or the API call fails — a calendar push failure must never block payment
   * confirmation for the booking itself.
   */
  async createBookingEvent(
    params: CreateBookingEventParams,
  ): Promise<CreatedBookingEvent | null> {
    const token = await this.prisma.googleCalendarToken.findUnique({
      where: { userId: params.professionalUserId },
    });
    if (!token) return null;

    const client = this.buildClient();
    client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiryDate.getTime(),
      scope: token.scope,
      token_type: token.tokenType,
    });
    client.on('tokens', (refreshed) => {
      this.prisma.googleCalendarToken
        .update({
          where: { userId: params.professionalUserId },
          data: {
            ...(refreshed.access_token
              ? { accessToken: refreshed.access_token }
              : {}),
            ...(refreshed.refresh_token
              ? { refreshToken: refreshed.refresh_token }
              : {}),
            ...(refreshed.expiry_date
              ? { expiryDate: new Date(refreshed.expiry_date) }
              : {}),
          },
        })
        .catch((error) =>
          this.logger.warn(`Failed to persist refreshed Google token: ${error}`),
        );
    });

    try {
      const calendar = google.calendar({ version: 'v3', auth: client });
      const { data } = await calendar.events.insert({
        calendarId: 'primary',
        sendUpdates: 'all',
        conferenceDataVersion: params.createMeetLink ? 1 : 0,
        requestBody: {
          summary: params.summary,
          description: params.description,
          start: {
            dateTime: `${params.date}T${params.startTime}:00`,
            timeZone: CALENDAR_TIMEZONE,
          },
          end: {
            dateTime: `${params.date}T${params.endTime}:00`,
            timeZone: CALENDAR_TIMEZONE,
          },
          attendees: [{ email: params.attendeeEmail }],
          ...(params.createMeetLink
            ? {
                conferenceData: {
                  createRequest: {
                    requestId: randomUUID(),
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                  },
                },
              }
            : {}),
        },
      });

      if (!data.id) return null;
      return {
        eventId: data.id,
        meetingLink: data.hangoutLink ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Google Calendar event for booking: ${error}`,
      );
      return null;
    }
  }
}
