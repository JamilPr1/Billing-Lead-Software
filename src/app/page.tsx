'use client';

import ProviderList from '@/components/ProviderList';
import SyncButton from '@/components/SyncButton';
import FileUpload from '@/components/FileUpload';
import AppNav from '@/components/AppNav';

export default function Home() {
  return (
    <div>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Billing Lead Software</h1>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              NPPES Provider Management & Cold Calling System
            </p>
          </div>
          <AppNav currentPage="home" />
        </div>
      </header>
      <main className="container">
        <div style={{ marginBottom: '2rem' }}>
          <div
            className="card"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
              padding: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Sync from NPPES</div>
              <SyncButton />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontWeight: 600 }}>Import / Saved</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                <FileUpload />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', maxWidth: 520 }}>
                Note: Very large uploads may not work on serverless hosting. For production, use chunked uploads + storage (S3/Supabase) and import in a background job.
              </div>
            </div>
          </div>
        </div>
        <ProviderList showOnlyLatest={true} />
      </main>
    </div>
  );
}
