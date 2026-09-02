import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BankDetailsDto {
  @ApiProperty()
  bankName!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  accountName!: string;
}

export class ProfessionalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  bio!: string | null;

  @ApiProperty()
  category!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  avatarUrl!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  location!: string | null;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  paystackSubaccount!: string | null;

  @ApiPropertyOptional({ nullable: true, type: BankDetailsDto })
  bankDetails!: BankDetailsDto | null;

  @ApiProperty()
  googleCalendarConnected!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  googleCalendarEmail!: string | null;

  @ApiProperty()
  whatsappRemindersEnabled!: boolean;

  @ApiProperty()
  rating!: number;

  @ApiProperty()
  reviewsCount!: number;
}
