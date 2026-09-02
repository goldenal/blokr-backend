import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, GoogleCalendarService],
})
export class IntegrationsModule {}
