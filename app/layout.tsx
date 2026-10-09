import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { MotionProvider } from '@/components/motion/motion-provider';
import { ThemeProvider } from '@/components/theme/theme-provider';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'FacultyConnect — Faculty Booking',
  description: 'Departmental faculty consultation routine & student booking system.',
  // Browser auto-translate (common on phones set to Bangla) rewrites the
  // page's text nodes behind React's back, which crashes the app on its next
  // update. Course codes and room numbers shouldn't be translated anyway.
  other: { google: 'notranslate' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" className={jakarta.variable} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <MotionProvider>{children}</MotionProvider>
          <Toaster richColors position="top-center" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
