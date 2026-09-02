import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityPublicController } from './availability-public.controller';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [ProfessionalsModule],
  controllers: [AvailabilityController, AvailabilityPublicController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
