export interface OccurrenceForBooking {
  id: string;
  date: Date;
  startSlot: string;
  capacity: number;
  bookedCount: number;
  isFull: boolean;
  isPast: boolean;
  isBookable: boolean;
  status: string;
  myBookingPosition: number | null;
}
