import { BookOpen, FlaskConical, Users } from 'lucide-react';

export type EntryStyleType = 'THEORY' | 'LAB' | 'CONSULTATION';

export interface EntryStyle {
  label: string;
  icon: typeof BookOpen;
  /** Colored dot / icon color */
  dot: string;
  /** Full-saturation text color */
  text: string;
  /** Light tint background for cells/badges */
  bg: string;
  /** Subtle border to pair with the tint background */
  border: string;
}

// Single source of truth for the Theory/Lab/Consultation color coding used
// across the dashboard grid, routine editor, bookable week grid, and mobile
// list views — keeps every surface visually consistent.
export const ENTRY_STYLES: Record<EntryStyleType, EntryStyle> = {
  THEORY: {
    label: 'Theory',
    icon: BookOpen,
    dot: 'bg-theory',
    text: 'text-theory',
    bg: 'bg-theory-bg',
    border: 'border-theory/25',
  },
  LAB: {
    label: 'Lab',
    icon: FlaskConical,
    dot: 'bg-lab',
    text: 'text-lab',
    bg: 'bg-lab-bg',
    border: 'border-lab/25',
  },
  CONSULTATION: {
    label: 'Consultation',
    icon: Users,
    dot: 'bg-consultation',
    text: 'text-consultation',
    bg: 'bg-consultation-bg',
    border: 'border-consultation/25',
  },
};

export function entryStyleFor(type: string): EntryStyle | null {
  return type in ENTRY_STYLES ? ENTRY_STYLES[type as EntryStyleType] : null;
}
