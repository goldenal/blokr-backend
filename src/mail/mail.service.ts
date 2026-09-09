import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor(private prisma: PrismaService) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendBookingConfirmation(bookingId: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          professional: { include: { user: true } },
          service: true,
        },
      });

      if (!booking) return;

      const dateStr = booking.date.toISOString().split('T')[0];
      const timeStr = `${booking.startTime} - ${booking.endTime}`;

      // 1. Email to Customer
      const customerResult = await this.resend.emails.send({
        from: 'Blokr <info@useblokr.com>',
        to: booking.customerEmail,
        subject: `Booking Confirmed: ${booking.service.name}`,
        html: `
          <h1>Your booking is confirmed!</h1>
          <p>Hi ${booking.customerName},</p>
          <p>Your appointment for <strong>${booking.service.name}</strong> with <strong>${booking.professional.name}</strong> has been successfully confirmed.</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Time:</strong> ${timeStr}</p>
          ${booking.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${booking.meetingLink}">${booking.meetingLink}</a></p>` : ''}
          <p>Thank you for using Blokr!</p>
        `,
      });
      if (customerResult.error) {
        this.logger.error(
          `Failed to send confirmation email to customer for booking ${bookingId}`,
          customerResult.error,
        );
      }

      // 2. Email to Professional
      const professionalResult = await this.resend.emails.send({
        from: 'Blokr <info@useblokr.com>',
        to: booking.professional.user.email,
        subject: `New Booking: ${booking.service.name}`,
        html: `
          <h1>New Booking Received</h1>
          <p>Hi ${booking.professional.name},</p>
          <p>You have a new booking from <strong>${booking.customerName}</strong> (${booking.customerEmail}).</p>
          <p><strong>Service:</strong> ${booking.service.name}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
          <p><strong>Time:</strong> ${timeStr}</p>
          <p><strong>Notes:</strong> ${booking.customerNotes || 'None'}</p>
          <p>Please check your calendar for details.</p>
        `,
      });
      if (professionalResult.error) {
        this.logger.error(
          `Failed to send confirmation email to professional for booking ${bookingId}`,
          professionalResult.error,
        );
      }

      if (!customerResult.error && !professionalResult.error) {
        this.logger.log(`Confirmation emails sent for booking ${bookingId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send emails for booking ${bookingId}`, error);
    }
  }

  async sendCancellation(bookingId: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          professional: { include: { user: true } },
          service: true,
        },
      });

      if (!booking) return;

      const dateStr = booking.date.toISOString().split('T')[0];

      const result = await this.resend.emails.send({
        from: 'Blokr <info@useblokr.com>',
        to: booking.customerEmail,
        subject: `Booking Cancelled: ${booking.service.name}`,
        html: `
          <h1>Booking Cancelled</h1>
          <p>Hi ${booking.customerName},</p>
          <p>Your appointment for <strong>${booking.service.name}</strong> on <strong>${dateStr}</strong> has been cancelled by the professional.</p>
          <p>If you have any questions or concerns regarding refunds, please contact them directly.</p>
          <p>Thank you.</p>
        `,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send cancellation email for booking ${bookingId}`,
          result.error,
        );
        return;
      }
      this.logger.log(`Cancellation email sent for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to send cancellation email for booking ${bookingId}`, error);
    }
  }

  async sendPasswordReset(email: string, token: string, frontendUrl: string) {
    try {
      const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

      const result = await this.resend.emails.send({
        from: 'Blokr <info@useblokr.com>',
        to: email,
        subject: 'Reset your Blokr password',
        html: `
          <h1>Password Reset</h1>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p>Click the link below to set a new password:</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>Thank you.</p>
        `,
      });

      if (result.error) {
        this.logger.error(
          `Failed to send password reset email to ${email}`,
          result.error,
        );
        return;
      }
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
    }
  }

  async sendSpecialInquiryEmail(inquiry: any) {
    try {
      await this.resend.emails.send({
        from: 'Blokr <info@useblokr.com>',
        to: inquiry.professional.user.email,
        subject: `Special Inquiry from ${inquiry.customerName}`,
        html: `
          <h1>New Special Inquiry</h1>
          <p>Hi ${inquiry.professional.name},</p>
          <p>You have received a special inquiry from <strong>${inquiry.customerName}</strong>.</p>
          <p><strong>Email:</strong> ${inquiry.customerEmail}</p>
          <p><strong>Phone:</strong> ${inquiry.customerPhone || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 10px;">${inquiry.message}</blockquote>
          <p>Please reply directly to their email address to discuss their requirements.</p>
        `,
      });

      this.logger.log(`Special inquiry email sent to ${inquiry.professional.user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send special inquiry email`, error);
    }
  }
}
