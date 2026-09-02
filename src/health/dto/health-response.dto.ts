import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'connected' })
  db!: string;

  @ApiProperty({ example: '2026-08-31T12:00:00.000Z' })
  timestamp!: string;
}
