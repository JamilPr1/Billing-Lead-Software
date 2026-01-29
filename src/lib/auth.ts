import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import '@/lib/env-auth';

const secret = process.env.NEXTAUTH_SECRET!;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        try {
          const { db } = await import('@/lib/db');
          const user = await (db as unknown as { user: { findUnique: (args: unknown) => Promise<{ id: string; email: string; passwordHash: string; role: string } | null> } }).user.findUnique({
            where: { email },
          });
          if (!user) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Auth] No user found for email:', email, '- Run: npx prisma db push && npm run db:seed');
            }
            return null;
          }
          const ok = await compare(credentials.password, user.passwordHash);
          if (!ok) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Auth] Wrong password for email:', email);
            }
            return null;
          }
          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        } catch (err) {
          console.error('[Auth] authorize error:', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  secret,
};
