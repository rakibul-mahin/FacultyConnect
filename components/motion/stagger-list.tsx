'use client';

import { motion, type Variants } from 'motion/react';

// Matches the design-system's recommended "stagger list" preset (back-out
// overshoot easing, opacity+scale+y) adapted from GSAP to Motion — used for
// any card/list grid that loads data, so content arrives with a bit of life
// instead of popping in instantly.
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] } },
};

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  /** Render as a semantic list (ul/li) instead of the default div — keep
   *  list semantics for screen readers when wrapping an actual list. */
  as?: 'div' | 'list';
}

export function StaggerList({ children, className, as = 'div' }: StaggerProps) {
  const MotionTag = as === 'list' ? motion.ul : motion.div;
  return (
    <MotionTag variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, className, as = 'div' }: StaggerProps) {
  const MotionTag = as === 'list' ? motion.li : motion.div;
  return (
    <MotionTag variants={item} className={className}>
      {children}
    </MotionTag>
  );
}
