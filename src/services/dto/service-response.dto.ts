import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType } from '@prisma/client';

export class ServiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  professionalId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ description: 'Price in naira, e.g. 15000' })
  priceNaira!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  bufferMinutes!: number;

  @ApiProperty({ enum: LocationType })
  locationType!: LocationType;

  @ApiPropertyOptional({ nullable: true, type: String })
  meetingInstructions!: string | null;

  @ApiProperty()
  isActive!: boolean;
}
