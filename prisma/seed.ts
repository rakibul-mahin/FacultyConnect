/**
 * Demo seed data (§50-51). Self-contained (does not import any `server-only`
 * app module) so it can run standalone via `npm run db:seed`.
 */
import { PrismaClient, type Weekday, type TimeSlot } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const LAB_CONTINUATION: Partial<Record<TimeSlot, TimeSlot>> = {
  T_08_00: 'T_09_30',
  T_11_00: 'T_12_30',
  T_14_00: 'T_15_30',
};

async function createFaculty(email: string, fullName: string, initial: string, seat: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, role: 'FACULTY' },
  });
  const profile = await prisma.facultyProfile.upsert({
    where: { userId: user.id },
    update: { fullName, initial, seat },
    create: { userId: user.id, fullName, email, initial, seat },
  });
  const existingToken = await prisma.qrToken.findFirst({ where: { facultyId: profile.id, revokedAt: null } });
  if (!existingToken) await prisma.qrToken.create({ data: { facultyId: profile.id } });
  return profile;
}

async function createStudent(email: string, fullName: string, studentId: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, role: 'STUDENT' },
  });
  return prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: { fullName, studentId },
    create: { userId: user.id, fullName, email, studentId },
  });
}

async function theory(facultyId: string, day: Weekday, slot: TimeSlot, courseCode: string, section: string, room: string) {
  await prisma.routineEntry.upsert({
    where: { facultyId_day_startSlot: { facultyId, day, startSlot: slot } },
    update: { type: 'THEORY', courseCode, section, roomNumber: room, coFaculty: null, capacity: null, labGroupId: null, isLabContinuation: false },
    create: { facultyId, day, startSlot: slot, type: 'THEORY', courseCode, section, roomNumber: room },
  });
}

async function lab(facultyId: string, day: Weekday, startSlot: TimeSlot, courseCode: string, section: string, coFaculty: string, room: string) {
  const continuation = LAB_CONTINUATION[startSlot]!;
  const labGroupId = randomUUID();
  for (const [slot, isContinuation] of [[startSlot, false], [continuation, true]] as const) {
    await prisma.routineEntry.upsert({
      where: { facultyId_day_startSlot: { facultyId, day, startSlot: slot } },
      update: { type: 'LAB', courseCode, section, coFaculty, roomNumber: room, labGroupId, isLabContinuation: isContinuation, capacity: null },
      create: { facultyId, day, startSlot: slot, type: 'LAB', courseCode, section, coFaculty, roomNumber: room, labGroupId, isLabContinuation: isContinuation },
    });
  }
}

async function consultation(facultyId: string, day: Weekday, slot: TimeSlot, capacity: number) {
  return prisma.routineEntry.upsert({
    where: { facultyId_day_startSlot: { facultyId, day, startSlot: slot } },
    update: { type: 'CONSULTATION', capacity, courseCode: null, section: null, roomNumber: null, coFaculty: null, labGroupId: null, isLabContinuation: false },
    create: { facultyId, day, startSlot: slot, type: 'CONSULTATION', capacity },
  });
}

function dhakaDateOnly(instant: Date): Date {
  const y = instant.getFullYear();
  const m = instant.getMonth();
  const d = instant.getDate();
  return new Date(Date.UTC(y, m, d));
}

const WEEKDAY_JS_INDEX: Record<Weekday, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

/** Generates occurrences for a routine entry across [today-14, today+28] (covers seeded history + future). */
async function generateOccurrencesForEntry(entry: { id: string; facultyId: string; day: Weekday; startSlot: TimeSlot; capacity: number | null }) {
  const today = dhakaDateOnly(new Date());
  const results: { id: string; date: Date }[] = [];
  for (let offset = -14; offset <= 28; offset++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    if (date.getUTCDay() !== WEEKDAY_JS_INDEX[entry.day]) continue;
    const occ = await prisma.consultationOccurrence.upsert({
      where: { routineEntryId_date: { routineEntryId: entry.id, date } },
      update: {},
      create: {
        routineEntryId: entry.id,
        facultyId: entry.facultyId,
        date,
        startSlot: entry.startSlot,
        capacity: entry.capacity ?? 1,
      },
    });
    results.push({ id: occ.id, date });
  }
  return results;
}

async function main() {
  console.log('Seeding demo data...');

  // --- Faculty -------------------------------------------------------
  const rkbm = await createFaculty('rakibul.hasan@bracu.ac.bd', 'Mohammad Rakibul Hasan', 'RKBM', '4M128');
  const dfo = await createFaculty('demo.faculty1@bracu.ac.bd', 'Demo Faculty One', 'DFO', '4M129');
  const dft = await createFaculty('demo.faculty2@bracu.ac.bd', 'Demo Faculty Two', 'DFT', '4F');

  // --- Students --------------------------------------------------------
  const s1 = await createStudent('demo.student@g.bracu.ac.bd', 'Demo Student', '20201234');
  const s2 = await createStudent('demo.student2@g.bracu.ac.bd', 'Demo Student Two', '20201235');
  const s3 = await createStudent('demo.student3@g.bracu.ac.bd', 'Demo Student Three', '20201236');
  const s4 = await createStudent('demo.student4@g.bracu.ac.bd', 'Demo Student Four', '20201237');

  // --- RKBM routine (§51 example) --------------------------------------
  await lab(rkbm.id, 'SUNDAY', 'T_08_00', 'CSE427', '03', 'ITSSC,RKBM', '09F-27L');
  const rkbmSun11 = await consultation(rkbm.id, 'SUNDAY', 'T_11_00', 4);
  const rkbmSun1230 = await consultation(rkbm.id, 'SUNDAY', 'T_12_30', 2);
  await theory(rkbm.id, 'SUNDAY', 'T_14_00', 'CSE110', '13', '09H-35C');
  await theory(rkbm.id, 'SUNDAY', 'T_15_30', 'CSE110', '12', '09H-35C');

  await theory(rkbm.id, 'MONDAY', 'T_14_00', 'CSE111', '13', '10B-15C');
  await theory(rkbm.id, 'MONDAY', 'T_15_30', 'CSE111', '14', '10B-15C');
  const rkbmMon1700 = await consultation(rkbm.id, 'MONDAY', 'T_17_00', 3);

  await lab(rkbm.id, 'WEDNESDAY', 'T_08_00', 'CSE110', '02', 'AOHE,RKBM', '09B-08L');
  await lab(rkbm.id, 'WEDNESDAY', 'T_11_00', 'CSE110', '12', 'CQAE,RKBM', '09B-09L');
  await theory(rkbm.id, 'WEDNESDAY', 'T_14_00', 'CSE111', '13', '10B-15C');
  await theory(rkbm.id, 'WEDNESDAY', 'T_15_30', 'CSE111', '14', '10B-15C');

  const rkbmTue1100 = await consultation(rkbm.id, 'TUESDAY', 'T_11_00', 1); // small capacity -> easy to fill for testing
  const rkbmThu1400 = await consultation(rkbm.id, 'THURSDAY', 'T_14_00', 2);

  // --- DFO routine -------------------------------------------------------
  await theory(dfo.id, 'SATURDAY', 'T_09_30', 'CSE220', '05', '09H-12C');
  const dfoSat1100 = await consultation(dfo.id, 'SATURDAY', 'T_11_00', 3);
  await lab(dfo.id, 'MONDAY', 'T_08_00', 'CSE220', '05', 'RKBM,DFO', '09F-15L');
  const dfoWed1730 = await consultation(dfo.id, 'WEDNESDAY', 'T_17_00', 2);

  // --- DFT routine -------------------------------------------------------
  await theory(dft.id, 'TUESDAY', 'T_09_30', 'CSE370', '02', '10B-08C');
  const dftThu1230 = await consultation(dft.id, 'THURSDAY', 'T_12_30', 5);
  const dftFri1400 = await consultation(dft.id, 'FRIDAY', 'T_14_00', 4);

  // --- Occurrences (past 14 days .. next 28 days) for every consultation entry ---
  const consultationEntries = [
    rkbmSun11, rkbmSun1230, rkbmMon1700, rkbmTue1100, rkbmThu1400,
    dfoSat1100, dfoWed1730, dftThu1230, dftFri1400,
  ];
  const occurrenceMap = new Map<string, { id: string; date: Date }[]>();
  for (const entry of consultationEntries) {
    const occs = await generateOccurrencesForEntry(entry);
    occurrenceMap.set(entry.id, occs);
  }

  const today = dhakaDateOnly(new Date());
  const futureOf = (entryId: string) => (occurrenceMap.get(entryId) ?? []).filter((o) => o.date.getTime() > today.getTime());
  const pastOf = (entryId: string) => (occurrenceMap.get(entryId) ?? []).filter((o) => o.date.getTime() < today.getTime());

  // --- Demo bookings: capacity / multiple bookings / privacy / full slots ---
  type BookingFields = {
    type: 'THESIS_INTERNSHIP_PROJECT' | 'COURSE' | 'OTHERS';
    groupId?: string;
    courseCode?: string;
    section?: string;
    reason?: string;
  };
  async function book(occurrenceId: string, studentId: string, data: BookingFields) {
    return prisma.booking.upsert({
      where: { occurrenceId_studentId: { occurrenceId, studentId } },
      update: {},
      create: { occurrenceId, studentId, ...data },
    });
  }

  const sun11Future = futureOf(rkbmSun11.id)[0];
  if (sun11Future) {
    await book(sun11Future.id, s1.id, { type: 'THESIS_INTERNSHIP_PROJECT', groupId: 'G-14', reason: 'Weekly thesis progress check-in.' });
    await book(sun11Future.id, s2.id, { type: 'COURSE', courseCode: 'CSE427', section: '03', reason: 'Need help with assignment 2, question 3.' });
  }

  // Capacity-1 slot: fill it completely to demo "FULLY BOOKED".
  const tue11Future = futureOf(rkbmTue1100.id)[0];
  if (tue11Future) {
    await book(tue11Future.id, s3.id, { type: 'OTHERS', reason: 'Discuss makeup exam eligibility.' });
  }

  // Capacity-2 slot: fill to 1/2 so "2nd of 4" style position testing has room.
  const thu14Future = futureOf(rkbmThu1400.id)[0];
  if (thu14Future) {
    await book(thu14Future.id, s4.id, { type: 'COURSE', courseCode: 'CSE110', section: '13', reason: 'Clarify grading of the lab report.' });
  }

  // --- Historical data: past occurrence with attendance marked ------------
  const sun11Past = pastOf(rkbmSun11.id)[0];
  if (sun11Past) {
    const b1 = await book(sun11Past.id, s1.id, { type: 'THESIS_INTERNSHIP_PROJECT', groupId: 'G-14', reason: 'Initial thesis proposal discussion.' });
    const b2 = await book(sun11Past.id, s2.id, { type: 'COURSE', courseCode: 'CSE427', section: '03', reason: 'Project milestone review.' });
    await prisma.attendance.upsert({ where: { bookingId: b1.id }, update: {}, create: { bookingId: b1.id, status: 'PRESENT' } });
    await prisma.attendance.upsert({ where: { bookingId: b2.id }, update: {}, create: { bookingId: b2.id, status: 'ABSENT' } });
  }
  const tue11Past = pastOf(rkbmTue1100.id)[0];
  if (tue11Past) {
    const b3 = await book(tue11Past.id, s3.id, { type: 'OTHERS', reason: 'Past consultation, already attended.' });
    await prisma.attendance.upsert({ where: { bookingId: b3.id }, update: {}, create: { bookingId: b3.id, status: 'PRESENT' } });
  }

  console.log('Seed complete.');
  console.log('Demo Faculty login: rakibul.hasan@bracu.ac.bd (RKBM)');
  console.log('Demo Student login: demo.student@g.bracu.ac.bd (20201234)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
