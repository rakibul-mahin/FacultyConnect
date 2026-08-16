import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { provisionUserForEmail, roleForEmail } from '@/lib/auth/provision';

const providers: NextAuthConfig['providers'] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
];

export const authConfig: NextAuthConfig = {
  providers,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      if (account?.provider !== 'google') return false;

      // Google's ID token guarantees a verified email; reject anything
      // Google itself hasn't verified (§8 — never trust client input).
      if (profile && (profile as { email_verified?: boolean }).email_verified === false) {
        return false;
      }
      const role = roleForEmail(user.email);
      if (!role) return false; // domain not in the allow-list
      const provisioned = await provisionUserForEmail(user.email, user.name ?? user.email);
      return Boolean(provisioned);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const record = await provisionUserForEmail(user.email, user.name ?? user.email);
        if (record) {
          token.userId = record.id;
          token.role = record.role;
          token.email = record.email;
          token.facultyProfileId = record.facultyProfile?.id ?? null;
          token.facultyPublicId = record.facultyProfile?.publicId ?? null;
          token.studentProfileId = record.studentProfile?.id ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as 'FACULTY' | 'STUDENT';
        session.user.facultyProfileId = (token.facultyProfileId as string | null) ?? null;
        session.user.facultyPublicId = (token.facultyPublicId as string | null) ?? null;
        session.user.studentProfileId = (token.studentProfileId as string | null) ?? null;
      }
      return session;
    },
  },
  trustHost: true,
};
