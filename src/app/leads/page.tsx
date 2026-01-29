'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import LeadListItem from '@/components/LeadListItem';

interface Lead {
  id: string;
  status: string;
  notes: string | null;
  lastContactedAt: string | null;
  lastContactType: string | null;
  createdAt: string;
  provider: {
    id: string;
    npi: string;
    firstName: string | null;
    lastName: string | null;
    organizationName: string | null;
    city: string | null;
    state: string | null;
    postalCode?: string | null;
    phone: string | null;
    email: string | null;
    taxonomy: string | null;
    primaryAddress?: string;
    mailingAddress?: string;
  };
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const fetchLeads = async (pageNum: number = 1, status: string = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50',
      });
      if (status) {
        params.append('status', status);
      }
      const response = await fetch(`/api/leads?${params.toString()}`);
      const data = await response.json();
      setLeads(data.leads || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      const response = await fetch(`/api/leads/export?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting leads:', error);
      alert('Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchLeads(page, statusFilter);
  }, [page, statusFilter]);

  if (loading && leads.length === 0) {
    return (
      <div>
        <header className="header">
          <div className="container">
            <h1>Saved Leads</h1>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              View and manage all saved leads
            </p>
          </div>
        </header>
        <main className="container">
          <div>Loading leads...</div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>Saved Leads</h1>
          <p style={{ marginTop: '0.5rem', color: '#666' }}>
            View and manage all saved leads
          </p>
        </div>
      </header>
      <main className="container">
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Leads ({total})</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Back to Providers
            </Link>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1rem', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="DO_NOT_CALL">Do Not Call</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exporting || total === 0}
              className="btn btn-primary"
              style={{ background: '#1976d2' }}
            >
              {exporting ? 'Exporting...' : 'Download CSV'}
            </button>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="card">
            <p>No leads found. Go back to providers and save some leads first.</p>
          </div>
        ) : (
          <>
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
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Last Contacted</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Saved</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <LeadListItem
                      key={lead.id}
                      lead={lead}
                      isEven={index % 2 === 0}
                      onUpdate={() => fetchLeads(page, statusFilter)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
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
          </>
        )}
      </main>
    </div>
  );
}
