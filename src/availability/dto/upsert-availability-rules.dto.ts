import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TimeRangeDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start must be HH:mm' })
  start!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end must be HH:mm' })
  end!: string;
}

export class AvailabilityRuleInputDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty()
  @IsBoolean()
  isEnabled!: boolean;

  @ApiProperty({ type: [TimeRangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  timeRanges!: TimeRangeDto[];
}

export class UpsertAvailabilityRulesDto {
  @ApiProperty({ type: [AvailabilityRuleInputDto] })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityRuleInputDto)
  rules!: AvailabilityRuleInputDto[];
}
