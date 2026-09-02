import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComputedSlotDto {
  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '09:30' })
  endTime!: string;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty({ enum: ['AVAILABLE', 'HELD', 'BOOKED', 'BUSY_CALENDAR'] })
  status!: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BUSY_CALENDAR';

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  heldUntil?: string;
}
