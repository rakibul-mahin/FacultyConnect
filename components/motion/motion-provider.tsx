'use client';

import { MotionConfig } from 'motion/react';

/**
 * Global Motion config. `reducedMotion="user"` makes every Motion animation
 * in the app automatically respect the OS-level prefers-reduced-motion
 * setting (in addition to the plain-CSS transitions handled in globals.css),
 * so this is the one place that guarantees it rather than relying on every
 * component to opt in individually.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
