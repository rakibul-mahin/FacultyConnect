// Official routine format constants — see spec §14. Do not add slots/days.

export const WEEKDAYS = [
  'SATURDAY',
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
] as const;

export type WeekdayValue = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayValue, string> = {
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
};

export const WEEKDAY_SHORT: Record<WeekdayValue, string> = {
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
};

export const TIME_SLOTS = [
  'T_08_00',
  'T_09_30',
  'T_11_00',
  'T_12_30',
  'T_14_00',
  'T_15_30',
  'T_17_00',
  'T_18_00',
  'T_19_30',
] as const;

export type TimeSlotValue = (typeof TIME_SLOTS)[number];

export const TIME_SLOT_LABELS: Record<TimeSlotValue, string> = {
  T_08_00: '8:00 AM',
  T_09_30: '9:30 AM',
  T_11_00: '11:00 AM',
  T_12_30: '12:30 PM',
  T_14_00: '2:00 PM',
  T_15_30: '3:30 PM',
  T_17_00: '5:00 PM',
  T_18_00: '6:00 PM',
  T_19_30: '7:30 PM',
};

// 24h "HH:mm" for building actual Date/time when needed.
export const TIME_SLOT_24H: Record<TimeSlotValue, string> = {
  T_08_00: '08:00',
  T_09_30: '09:30',
  T_11_00: '11:00',
  T_12_30: '12:30',
  T_14_00: '14:00',
  T_15_30: '15:30',
  T_17_00: '17:00',
  T_18_00: '18:00',
  T_19_30: '19:30',
};

// Lab sessions last 2h40m and may only start at these three columns (§17).
export const LAB_VALID_START_SLOTS: readonly TimeSlotValue[] = ['T_08_00', 'T_11_00', 'T_14_00'];

// Each valid lab start slot's forced continuation slot.
export const LAB_CONTINUATION_SLOT: Partial<Record<TimeSlotValue, TimeSlotValue>> = {
  T_08_00: 'T_09_30',
  T_11_00: 'T_12_30',
  T_14_00: 'T_15_30',
};

export function slotIndex(slot: TimeSlotValue): number {
  return TIME_SLOTS.indexOf(slot);
}

export function weekdayIndex(day: WeekdayValue): number {
  return WEEKDAYS.indexOf(day);
}

export const FACULTY_EMAIL_DOMAIN = 'bracu.ac.bd';
export const STUDENT_EMAIL_DOMAIN = 'g.bracu.ac.bd';

export const BOOKING_TYPE_LABELS = {
  THESIS_INTERNSHIP_PROJECT: 'Thesis / Internship / Project',
  COURSE: 'Course',
  OTHERS: 'Others',
} as const;
