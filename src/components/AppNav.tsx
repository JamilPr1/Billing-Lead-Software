'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

type Page = 'home' | 'leads';

export default function AppNav({ currentPage }: { currentPage: Page }) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === 'ADMIN';

  if (status !== 'authenticated') return null;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      {isAdmin && (
        <Link
          href="/"
          className="btn btn-secondary"
          style={{
            textDecoration: 'none',
            opacity: currentPage === 'home' ? 0.85 : 1,
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
          }}
        >
          Home
        </Link>
      )}
      <Link
        href="/leads"
        className="btn btn-secondary"
        style={{
          textDecoration: 'none',
          opacity: currentPage === 'leads' ? 0.85 : 1,
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
        }}
      >
        Saved Leads
      </Link>
      <span style={{ width: '1px', alignSelf: 'stretch', background: '#dee2e6', margin: '0 0.25rem' }} aria-hidden />
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="btn btn-secondary"
        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
      >
        Sign out
      </button>
    </nav>
  );
}
