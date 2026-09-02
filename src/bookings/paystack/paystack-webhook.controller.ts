import {
  Controller,
  Headers,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BookingsService } from '../bookings.service';
import { WebhookAckResponseDto } from '../dto/booking-response.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments/paystack')
export class PaystackWebhookController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiOkResponse({
    type: WebhookAckResponseDto,
    description:
      'Always acknowledges receipt, regardless of processing outcome.',
  })
  @Public()
  @Post('webhook')
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.bookingsService.handleWebhook(rawBody, signature);
  }
}
