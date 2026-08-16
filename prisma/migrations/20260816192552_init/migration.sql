-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FACULTY', 'STUDENT');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('T_08_00', 'T_09_30', 'T_11_00', 'T_12_30', 'T_14_00', 'T_15_30', 'T_17_00', 'T_18_00', 'T_19_30');

-- CreateEnum
CREATE TYPE "RoutineEntryType" AS ENUM ('THEORY', 'LAB', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('OPEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('THESIS_INTERNSHIP_PROJECT', 'COURSE', 'OTHERS');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED_BY_FACULTY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_profiles" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "initial" TEXT NOT NULL,
    "seat" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_entries" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "day" "Weekday" NOT NULL,
    "startSlot" "TimeSlot" NOT NULL,
    "type" "RoutineEntryType" NOT NULL,
    "courseCode" TEXT,
    "section" TEXT,
    "roomNumber" TEXT,
    "coFaculty" TEXT,
    "labGroupId" TEXT,
    "isLabContinuation" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_occurrences" (
    "id" TEXT NOT NULL,
    "routineEntryId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startSlot" "TimeSlot" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'OPEN',
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "groupId" TEXT,
    "courseCode" TEXT,
    "section" TEXT,
    "reason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_tokens" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_profiles_publicId_key" ON "faculty_profiles"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_profiles_userId_key" ON "faculty_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_profiles_email_key" ON "faculty_profiles"("email");

-- CreateIndex
CREATE INDEX "faculty_profiles_email_idx" ON "faculty_profiles"("email");

-- CreateIndex
CREATE INDEX "faculty_profiles_initial_idx" ON "faculty_profiles"("initial");

-- CreateIndex
CREATE INDEX "faculty_profiles_publicId_idx" ON "faculty_profiles"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_studentId_key" ON "student_profiles"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_email_key" ON "student_profiles"("email");

-- CreateIndex
CREATE INDEX "student_profiles_email_idx" ON "student_profiles"("email");

-- CreateIndex
CREATE INDEX "student_profiles_studentId_idx" ON "student_profiles"("studentId");

-- CreateIndex
CREATE INDEX "routine_entries_facultyId_day_startSlot_idx" ON "routine_entries"("facultyId", "day", "startSlot");

-- CreateIndex
CREATE INDEX "routine_entries_facultyId_type_idx" ON "routine_entries"("facultyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "routine_entries_facultyId_day_startSlot_key" ON "routine_entries"("facultyId", "day", "startSlot");

-- CreateIndex
CREATE INDEX "consultation_occurrences_facultyId_date_idx" ON "consultation_occurrences"("facultyId", "date");

-- CreateIndex
CREATE INDEX "consultation_occurrences_date_idx" ON "consultation_occurrences"("date");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_occurrences_routineEntryId_date_key" ON "consultation_occurrences"("routineEntryId", "date");

-- CreateIndex
CREATE INDEX "bookings_occurrenceId_idx" ON "bookings"("occurrenceId");

-- CreateIndex
CREATE INDEX "bookings_studentId_idx" ON "bookings"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_occurrenceId_studentId_key" ON "bookings"("occurrenceId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_bookingId_key" ON "attendance"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_tokens_facultyId_key" ON "qr_tokens"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_tokens_token_key" ON "qr_tokens"("token");

-- CreateIndex
CREATE INDEX "qr_tokens_token_idx" ON "qr_tokens"("token");

-- AddForeignKey
ALTER TABLE "faculty_profiles" ADD CONSTRAINT "faculty_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_occurrences" ADD CONSTRAINT "consultation_occurrences_routineEntryId_fkey" FOREIGN KEY ("routineEntryId") REFERENCES "routine_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_occurrences" ADD CONSTRAINT "consultation_occurrences_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "consultation_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
