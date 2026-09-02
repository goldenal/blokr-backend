import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdatePayoutDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  bankName!: string;

  @ApiProperty({
    description:
      "Paystack bank code (from Paystack's GET /bank list) — required to create the settlement subaccount, distinct from the display-only bankName.",
  })
  @IsString()
  @MinLength(1)
  bankCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  bankAccountNumber!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  bankAccountName!: string;
}
