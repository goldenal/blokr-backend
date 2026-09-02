-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PROFESSIONAL', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('GOOGLE_MEET', 'ZOOM', 'PHYSICAL', 'WHATSAPP_CALL', 'PHONE_CALL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HELD', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('card', 'bank_transfer', 'ussd', 'apple_pay');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PROFESSIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "category" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos (WAT)',
    "location" TEXT,
    "phone" TEXT NOT NULL,
    "paystackSubaccountCode" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "googleCalendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "googleCalendarEmail" TEXT,
    "whatsappRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "locationType" "LocationType" NOT NULL,
    "meetingInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timeRanges" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_overrides" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "timeRanges" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerNotes" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'HELD',
    "heldUntil" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountKobo" INTEGER NOT NULL,
    "calendarEventId" TEXT,
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paystack_transactions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "authorizationUrl" TEXT,
    "accessCode" TEXT,
    "amountKobo" INTEGER NOT NULL,
    "channel" "PaymentChannel",
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "rawWebhookPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paystack_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_calendar_tokens" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_userId_key" ON "professional_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_username_key" ON "professional_profiles"("username");

-- CreateIndex
CREATE INDEX "professional_profiles_userId_idx" ON "professional_profiles"("userId");

-- CreateIndex
CREATE INDEX "services_professionalId_idx" ON "services"("professionalId");

-- CreateIndex
CREATE INDEX "availability_rules_professionalId_idx" ON "availability_rules"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_rules_professionalId_dayOfWeek_key" ON "availability_rules"("professionalId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "availability_overrides_professionalId_idx" ON "availability_overrides"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_overrides_professionalId_date_key" ON "availability_overrides"("professionalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE INDEX "bookings_professionalId_idx" ON "bookings"("professionalId");

-- CreateIndex
CREATE INDEX "bookings_serviceId_idx" ON "bookings"("serviceId");

-- CreateIndex
CREATE INDEX "bookings_professionalId_date_idx" ON "bookings"("professionalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "paystack_transactions_reference_key" ON "paystack_transactions"("reference");

-- CreateIndex
CREATE INDEX "paystack_transactions_bookingId_idx" ON "paystack_transactions"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_tokens_professionalId_key" ON "google_calendar_tokens"("professionalId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paystack_transactions" ADD CONSTRAINT "paystack_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_tokens" ADD CONSTRAINT "google_calendar_tokens_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Booking concurrency guarantee (hand-added — Prisma's @@unique cannot express a WHERE
-- clause). Only one non-cancelled/non-expired booking may occupy a given
-- (professional, date, start_time) at a time. See BookingsService.attemptHold, which
-- relies on this index rejecting concurrent inserts with P2002.
CREATE UNIQUE INDEX "bookings_active_slot_unique" ON "bookings"("professionalId", "date", "startTime")
WHERE "status" IN ('HELD', 'PENDING_PAYMENT', 'CONFIRMED');
