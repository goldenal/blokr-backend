import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus } from '@prisma/client';

export class BookingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  reference!: string;

  @ApiProperty({ format: 'uuid' })
  professionalId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceId!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty()
  customerEmail!: string;

  @ApiProperty()
  customerPhone!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  customerNotes!: string | null;

  @ApiProperty({ example: '2026-09-10' })
  date!: string;

  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '09:30' })
  endTime!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  heldUntil!: string | null;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ description: 'Amount in naira, e.g. 15000' })
  amountNaira!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  calendarEventId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  meetingLink!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class HoldResponseDto {
  @ApiProperty({ type: BookingResponseDto })
  booking!: BookingResponseDto;

  @ApiProperty({ example: 600 })
  expiresInSeconds!: number;
}

export class CheckoutInitResponseDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  authorizationUrl!: string | null;

  @ApiProperty()
  reference!: string;
}

export class WebhookAckResponseDto {
  @ApiProperty()
  received!: boolean;
}
