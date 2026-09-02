import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimeRangeDto } from './upsert-availability-rules.dto';

export class CreateOverrideDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsBoolean()
  isAvailable!: boolean;

  @ApiPropertyOptional({ type: [TimeRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  timeRanges?: TimeRangeDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
