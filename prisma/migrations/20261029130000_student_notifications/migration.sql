-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OCCURRENCE_CANCELLED', 'BOOKING_REMOVED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancelReason" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "facultyName" TEXT NOT NULL,
    "facultyPublicId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startSlot" "TimeSlot" NOT NULL,
    "reason" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_studentId_readAt_idx" ON "notifications"("studentId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_studentId_createdAt_idx" ON "notifications"("studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

