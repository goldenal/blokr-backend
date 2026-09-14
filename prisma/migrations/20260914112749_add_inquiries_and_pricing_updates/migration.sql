-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('FIXED', 'VARIABLE');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "maxVariable" INTEGER DEFAULT 10,
ADD COLUMN     "minVariable" INTEGER DEFAULT 1,
ADD COLUMN     "pricingType" "PricingType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "variableName" TEXT;

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inquiries_professionalId_idx" ON "inquiries"("professionalId");

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
