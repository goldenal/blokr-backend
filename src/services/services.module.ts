import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServicesPublicController } from './services-public.controller';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [ProfessionalsModule],
  controllers: [ServicesController, ServicesPublicController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
