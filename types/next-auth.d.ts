import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'FACULTY' | 'STUDENT';
      facultyProfileId: string | null;
      facultyPublicId: string | null;
      studentProfileId: string | null;
    } & DefaultSession['user'];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string;
    role?: 'FACULTY' | 'STUDENT';
    facultyProfileId?: string | null;
    facultyPublicId?: string | null;
    studentProfileId?: string | null;
  }
}
