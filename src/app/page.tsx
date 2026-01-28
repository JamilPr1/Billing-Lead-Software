'use client';

import Link from 'next/link';
import ProviderList from '@/components/ProviderList';
import SyncButton from '@/components/SyncButton';

export default function Home() {
  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Billing Lead Software</h1>
          <p style={{ marginTop: '0.5rem', color: '#666' }}>
            NPPES Provider Management & Cold Calling System
          </p>
        </div>
      </header>
      <main className="container">
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <SyncButton />
          <Link href="/leads" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            View Saved Leads
          </Link>
        </div>
        <ProviderList />
      </main>
    </div>
  );
}
