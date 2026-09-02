import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('bookings')
@ApiBearerAuth()
@Roles(Role.PROFESSIONAL)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiPaginatedResponse(BookingResponseDto)
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.list(user.id, query, query.status);
  }

  @ApiOkResponse({ type: BookingResponseDto })
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.findOneOwned(id, user.id);
  }

  @ApiOkResponse({ type: BookingResponseDto })
  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingsService.cancel(id, user.id);
  }
}
