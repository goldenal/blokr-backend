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
      await this.resend.emails.send({
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

      // 2. Email to Professional
      await this.resend.emails.send({
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
      
      this.logger.log(`Confirmation emails sent for booking ${bookingId}`);
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

      await this.resend.emails.send({
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

      this.logger.log(`Cancellation email sent for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to send cancellation email for booking ${bookingId}`, error);
    }
  }

  async sendPasswordReset(email: string, token: string, frontendUrl: string) {
    try {
      const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

      await this.resend.emails.send({
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

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
    }
  }
}
