'use client';

import { useState } from 'react';
import LeadStatusBadge from './LeadStatusBadge';
import { format } from 'date-fns';

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
    phone: string | null;
    email: string | null;
    taxonomy: string | null;
  };
}

interface LeadListItemProps {
  lead: Lead;
  onUpdate: () => void;
  isEven: boolean;
}

export default function LeadListItem({ lead, onUpdate, isEven }: LeadListItemProps) {
  const provider = lead.provider;
  const [status, setStatus] = useState(lead.status || 'NEW');
  const [notes, setNotes] = useState(lead.notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleStatusUpdate = async (newStatus: string, contactType?: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/leads/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes,
          contactType,
        }),
      });

      if (response.ok) {
        setStatus(newStatus);
        setIsEditing(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    } finally {
      setSaving(false);
    }
  };

  const name =
    provider.organizationName ||
    `${provider.firstName || ''} ${provider.lastName || ''}`.trim() ||
    'Unknown Provider';

  const location =
    provider.city && provider.state
      ? `${provider.city}, ${provider.state}`
      : provider.state || provider.city || 'N/A';

  return (
    <>
      <tr
        style={{
          background: isEven ? '#ffffff' : '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#e9ecef')}
        onMouseLeave={(e) => (e.currentTarget.style.background = isEven ? '#ffffff' : '#f8f9fa')}
      >
        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {lead.notes && (
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              📝 {lead.notes.substring(0, 50)}
              {lead.notes.length > 50 ? '...' : ''}
            </div>
          )}
        </td>
        <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{provider.npi}</td>
        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#666' }}>{provider.taxonomy || 'N/A'}</td>
        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#666' }}>{location}</td>
        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {provider.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>📞</span>
                <a href={`tel:${provider.phone}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                  {provider.phone}
                </a>
              </div>
            )}
            {provider.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>✉️</span>
                <a href={`mailto:${provider.email}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                  {provider.email}
                </a>
              </div>
            )}
            {!provider.phone && !provider.email && <span>N/A</span>}
          </div>
        </td>
        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
          <LeadStatusBadge status={status} />
        </td>
        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
          {lead.lastContactedAt ? format(new Date(lead.lastContactedAt), 'MMM dd, yyyy') : 'Never'}
        </td>
        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{format(new Date(lead.createdAt), 'MMM dd, yyyy')}</td>
        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-secondary"
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </td>
      </tr>

      {showDetails && (
        <tr style={{ background: '#f8f9fa' }}>
          <td colSpan={9} style={{ padding: '1rem' }}>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #dee2e6' }}>
              {isEditing ? (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                      Status:
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.875rem' }}
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="INTERESTED">Interested</option>
                      <option value="NOT_INTERESTED">Not Interested</option>
                      <option value="FOLLOW_UP">Follow Up</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="DO_NOT_CALL">Do Not Call</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                      Notes:
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.875rem' }}
                      placeholder="Add notes about the call or email..."
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleStatusUpdate(status, 'CALL')}
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      {saving ? 'Saving...' : 'Mark as Called'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(status, 'EMAIL')}
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      {saving ? 'Saving...' : 'Mark as Emailed'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(status)}
                      disabled={saving}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setShowDetails(false);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {lead.notes && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px' }}>
                      <strong>Notes:</strong> {lead.notes}
                    </div>
                  )}
                  {lead.lastContactedAt && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
                      Last contacted: {format(new Date(lead.lastContactedAt), 'MMM dd, yyyy HH:mm')}
                      {lead.lastContactType ? ` (${lead.lastContactType})` : ''}
                    </div>
                  )}
                  <button onClick={() => setIsEditing(true)} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                    Update Status
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

