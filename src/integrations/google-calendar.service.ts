import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

@Injectable()
export class GoogleCalendarService {
  constructor(private readonly config: ConfigService) {}

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
}
