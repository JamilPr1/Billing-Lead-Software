/**
 * Set NextAuth env fallbacks so auth works without .env in development.
 * Import this once (e.g. from auth.ts and middleware) so NEXTAUTH_SECRET is never undefined.
 */
if (typeof process !== 'undefined') {
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = 'dev-secret-change-in-production-min-32-chars-long';
  }
  if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV !== 'production') {
    process.env.NEXTAUTH_URL = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
  }
}
