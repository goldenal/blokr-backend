import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsPublicController } from './professionals-public.controller';
import { PaystackService } from '../bookings/paystack/paystack.service';

@Module({
  controllers: [ProfessionalsController, ProfessionalsPublicController],
  providers: [ProfessionalsService, PaystackService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
