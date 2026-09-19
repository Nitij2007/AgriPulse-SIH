-- AlterTable
ALTER TABLE "User" ADD COLUMN "verificationCodeExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "verificationCodeHash" TEXT;
