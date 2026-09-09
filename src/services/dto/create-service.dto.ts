import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType, PricingType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @ApiProperty({ description: 'Price in naira, e.g. 15000' })
  @IsInt()
  @IsPositive()
  priceNaira!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutes?: number;

  @ApiProperty({ enum: LocationType })
  @IsEnum(LocationType)
  locationType!: LocationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingInstructions?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: PricingType })
  @IsOptional()
  @IsEnum(PricingType)
  pricingType?: PricingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variableName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  minVariable?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxVariable?: number;
}
