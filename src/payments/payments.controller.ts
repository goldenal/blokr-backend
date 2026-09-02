import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('payments-history')
@ApiBearerAuth()
@Roles(Role.PROFESSIONAL)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiPaginatedResponse(PaymentResponseDto)
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.list(user.id, pagination);
  }
}
