import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateProfessionalDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  businessName!: string;

  @ApiProperty({
    description: 'Booking slug, e.g. blokr.me/@john-consulting',
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'username may only contain lowercase letters, numbers, and hyphens',
  })
  username!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappRemindersEnabled?: boolean;
}
