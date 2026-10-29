export interface RosterBooking {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED_BY_FACULTY' | 'CANCELLED_BY_STUDENT';
  type: 'THESIS_INTERNSHIP_PROJECT' | 'COURSE' | 'OTHERS';
  groupId: string | null;
  courseCode: string | null;
  section: string | null;
  reason: string | null;
  createdAt: Date;
  /** 1-based position among confirmed bookings; null when cancelled. */
  position: number | null;
  attendance: 'PRESENT' | 'ABSENT' | null;
  student: { fullName: string; studentId: string | null; email: string };
}

export interface FacultySlot {
  id: string;
  date: Date;
  startSlot: string;
  capacity: number;
  status: 'OPEN' | 'CANCELLED';
  cancelReason: string | null;
  /** Attendance opens and removals close once the slot has begun. */
  started: boolean;
  /** The slot's date is before today. */
  past: boolean;
  bookings: RosterBooking[];
}
