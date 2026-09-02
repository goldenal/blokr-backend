import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListBookingsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
