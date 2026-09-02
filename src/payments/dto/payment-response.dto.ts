import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentChannel, PaymentStatus } from '@prisma/client';

export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ format: 'uuid' })
  professionalId!: string;

  @ApiProperty()
  paystackReference!: string;

  @ApiProperty({ description: 'Amount in naira, e.g. 15000' })
  amountNaira!: number;

  @ApiProperty()
  currency!: string;

  @ApiPropertyOptional({ nullable: true, enum: PaymentChannel })
  channel!: PaymentChannel | null;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  paidAt!: Date | null;

  @ApiProperty()
  customerName!: string;

  @ApiProperty()
  serviceName!: string;
}
