import { ApiProperty } from '@nestjs/swagger';

/** Shape produced by AllExceptionsFilter for every non-2xx response. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Resource not found.',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Not Found' })
  error!: string;

  @ApiProperty({ example: '/bookings/123' })
  path!: string;

  @ApiProperty({ example: '2026-08-31T12:00:00.000Z' })
  timestamp!: string;
}
