import { prisma } from '@/lib/db/prisma';

/** Truncates all app tables between tests so each test starts from a clean slate. */
export async function resetDb() {
  await prisma.$transaction([
    prisma.attendance.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.consultationOccurrence.deleteMany(),
    prisma.routineEntry.deleteMany(),
    prisma.qrToken.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.facultyProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
