import { MailModule } from '../mail/mail.module';
import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsPublicController } from './bookings-public.controller';
import { BookingsCleanupService } from './bookings-cleanup.service';
import { PaystackService } from './paystack/paystack.service';
import { PaystackWebhookController } from './paystack/paystack-webhook.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [AvailabilityModule, IntegrationsModule, MailModule],
  controllers: [
    BookingsController,
    BookingsPublicController,
    PaystackWebhookController,
  ],
  providers: [BookingsService, BookingsCleanupService, PaystackService],
  exports: [PaystackService],
})
export class BookingsModule {}
