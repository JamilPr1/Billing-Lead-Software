import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const secret = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-min-32-chars-long';

/**
 * Returns the session token or null. Use in API routes.
 */
export async function getSessionToken(req: NextRequest) {
  const token = await getToken({
    req,
    secret,
  });
  return token;
}

/**
 * Require any logged-in user. Returns 401 if not logged in.
 */
export async function requireAuth(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return { error: res };
  }
  return { token };
}

/**
 * Require ADMIN role. Returns 401 if not logged in, 403 if not admin.
 */
export async function requireAdmin(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return { error: res };
  }
  if (token.role !== 'ADMIN') {
    const res = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return { error: res };
  }
  return { token };
}
