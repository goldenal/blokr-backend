import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateHoldDto {
  @ApiProperty({ example: '2026-09-10' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  customerName!: string;

  @ApiProperty()
  @IsEmail()
  customerEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  customerPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  quantity?: number;
}
