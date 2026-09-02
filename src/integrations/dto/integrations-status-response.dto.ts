import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleCalendarStatusDto {
  @ApiProperty()
  connected!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  email!: string | null;
}

export class WhatsAppStatusDto {
  @ApiProperty()
  remindersEnabled!: boolean;
}

export class PaystackStatusDto {
  @ApiProperty()
  subaccountConfigured!: boolean;
}

export class IntegrationsStatusResponseDto {
  @ApiProperty({ type: GoogleCalendarStatusDto })
  googleCalendar!: GoogleCalendarStatusDto;

  @ApiProperty({ type: WhatsAppStatusDto })
  whatsapp!: WhatsAppStatusDto;

  @ApiProperty({ type: PaystackStatusDto })
  paystack!: PaystackStatusDto;
}
