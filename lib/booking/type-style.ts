import { BookOpen, GraduationCap, MessageSquare } from 'lucide-react';

export type BookingTypeValue = 'THESIS_INTERNSHIP_PROJECT' | 'COURSE' | 'OTHERS';

// One colour per booking type, shared by the student and faculty booking
// views so a thesis meeting reads as violet everywhere it appears.
export const BOOKING_TYPE_STYLES: Record<
  BookingTypeValue,
  { short: string; icon: typeof BookOpen; chip: string; tile: string; text: string }
> = {
  THESIS_INTERNSHIP_PROJECT: {
    short: 'Thesis / Project',
    icon: GraduationCap,
    chip: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    tile: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    text: 'text-violet-700 dark:text-violet-300',
  },
  COURSE: {
    short: 'Course',
    icon: BookOpen,
    chip: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    tile: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
    text: 'text-sky-700 dark:text-sky-300',
  },
  OTHERS: {
    short: 'Others',
    icon: MessageSquare,
    chip: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    tile: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    text: 'text-slate-600 dark:text-slate-300',
  },
};
