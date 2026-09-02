import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import {
  BookingResponseDto,
  CheckoutInitResponseDto,
  HoldResponseDto,
} from './dto/booking-response.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('bookings-public')
@Controller()
export class BookingsPublicController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiCreatedResponse({ type: HoldResponseDto })
  @Public()
  @Post('public/professionals/:username/services/:serviceId/bookings/hold')
  createHold(
    @Param('username') username: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: CreateHoldDto,
  ) {
    return this.bookingsService.createHold(username, serviceId, dto);
  }

  @ApiOkResponse({ type: CheckoutInitResponseDto })
  @Public()
  @Post('bookings/:id/checkout/init')
  initCheckout(@Param('id') id: string) {
    return this.bookingsService.initCheckout(id);
  }

  @ApiOkResponse({ type: BookingResponseDto })
  @Public()
  @Get('bookings/reference/:reference')
  getByReference(@Param('reference') reference: string) {
    return this.bookingsService.getByReference(reference);
  }
}
