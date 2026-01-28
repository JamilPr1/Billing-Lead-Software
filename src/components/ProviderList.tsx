'use client';

import { useState, useEffect } from 'react';
import ProviderListItem from './ProviderListItem';
import { format } from 'date-fns';

interface Provider {
  id: string;
  npi: string;
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  taxonomy: string | null;
  addedAt: string;
  leads: Array<{
    status: string;
    notes: string | null;
    lastContactedAt: string | null;
    lastContactType: string | null;
  }>;
}

interface ProviderListProps {
  showOnlyLatest?: boolean; // Show only providers without saved leads (latest fetched)
}

export default function ProviderList({ showOnlyLatest = false }: ProviderListProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchProviders = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const url = showOnlyLatest 
        ? `/api/providers?page=${pageNum}&limit=50&latestOnly=true`
        : `/api/providers?page=${pageNum}&limit=50`;
      const response = await fetch(url);
      const data = await response.json();
      setProviders(data.providers || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch('/api/providers/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveAll: true, // Save all providers, not just current page
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSaveMessage(`Successfully saved ${data.saved} leads. ${data.duplicates} duplicates skipped. Total: ${data.total} providers processed.`);
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setSaveMessage('Failed to save leads');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProviders(page);
  }, [page]);

  if (loading) {
    return <div>Loading providers...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>{showOnlyLatest ? 'Latest Fetched Providers' : 'Providers'} ({total})</h2>
          {showOnlyLatest && (
            <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#666' }}>
              Showing only providers without saved leads. View all saved leads on the Saved Leads page.
            </p>
          )}
          {saveMessage && (
            <p style={{ marginTop: '0.5rem', color: saveMessage.includes('Error') ? '#d32f2f' : '#388e3c', fontSize: '0.875rem' }}>
              {saveMessage}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {total > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="btn btn-primary"
              style={{ background: '#28a745' }}
            >
              {saving ? 'Saving...' : `Save All Leads (${total})`}
            </button>
          )}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span style={{ padding: '0.75rem 1rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      </div>
      {providers.length === 0 ? (
        <div className="card">
          <p>No providers found. Click "Sync Latest Providers" to fetch from NPPES API.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>NPI</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Specialty</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Location</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Contact</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Added</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider, index) => (
                <ProviderListItem
                  key={provider.id}
                  provider={provider}
                  onUpdate={() => fetchProviders(page)}
                  isEven={index % 2 === 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
