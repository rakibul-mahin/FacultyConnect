export class BookingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const BookingErrors = {
  full: () => new BookingError('FULL', 'That consultation is already full.'),
  duplicate: () => new BookingError('DUPLICATE', 'You have already booked this consultation.'),
  cancelled: () => new BookingError('CANCELLED', 'The faculty member has cancelled this consultation.'),
  todayNotBookable: () =>
    new BookingError('TODAY_NOT_BOOKABLE', 'Students cannot book consultations for today. Try tomorrow or later.'),
  notFound: () => new BookingError('NOT_FOUND', 'This consultation could not be found.'),
  profileIncomplete: () =>
    new BookingError('PROFILE_INCOMPLETE', 'Complete your profile before booking.'),
  forbidden: () => new BookingError('FORBIDDEN', 'You do not have permission to do that.'),
  concurrentConflict: () =>
    new BookingError('CONFLICT', 'That seat was just taken by someone else. Please try again.'),
  alreadyCancelled: () => new BookingError('ALREADY_CANCELLED', 'This booking is already cancelled.'),
  pastCannotCancel: () =>
    new BookingError('PAST_CANNOT_CANCEL', "This consultation has already passed and can't be cancelled."),
};
