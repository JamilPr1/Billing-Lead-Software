import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

let handler: ReturnType<typeof NextAuth>;
try {
  handler = NextAuth(authOptions);
} catch (err) {
  console.error('NextAuth init error:', err);
  throw err;
}

export { handler as GET, handler as POST };
