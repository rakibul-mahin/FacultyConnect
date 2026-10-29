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
  cancelReason: string | null;
  myBookingPosition: number | null;
}
