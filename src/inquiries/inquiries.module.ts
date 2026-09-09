import { Module } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './inquiries.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
