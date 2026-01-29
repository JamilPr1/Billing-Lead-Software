import '@/lib/env-auth';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    // Users (non-admin) may only access /leads; redirect them from /
    if (token?.role === 'USER' && path === '/') {
      return Response.redirect(new URL('/leads', req.url));
    }
    return;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: '/login' },
  }
);

export const config = {
  matcher: ['/', '/leads', '/leads/:path*'],
};
