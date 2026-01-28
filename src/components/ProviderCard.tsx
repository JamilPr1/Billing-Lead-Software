'use client';

import { useState } from 'react';
import LeadStatusBadge from './LeadStatusBadge';
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
  taxonomy: string | null;
  addedAt: string;
  leads: Array<{
    status: string;
    notes: string | null;
    lastContactedAt: string | null;
    lastContactType: string | null;
  }>;
}

interface ProviderCardProps {
  provider: Provider;
  onUpdate: () => void;
}

export default function ProviderCard({ provider, onUpdate }: ProviderCardProps) {
  const [status, setStatus] = useState(provider.leads[0]?.status || 'NEW');
  const [notes, setNotes] = useState(provider.leads[0]?.notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const name = provider.organizationName || 
               `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || 
               'Unknown Provider';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.5rem' }}>{name}</h3>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>
            <div>NPI: {provider.npi}</div>
            {provider.taxonomy && <div>Specialty: {provider.taxonomy}</div>}
            {provider.city && provider.state && (
              <div>Location: {provider.city}, {provider.state}</div>
            )}
            {provider.phone && <div>Phone: {provider.phone}</div>}
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#999' }}>
              Added: {format(new Date(provider.addedAt), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
        </div>
        <LeadStatusBadge status={status} />
      </div>

      {isEditing ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Status:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Notes:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              placeholder="Add notes about the call or email..."
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleStatusUpdate(status, 'CALL')}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Mark as Called'}
            </button>
            <button
              onClick={() => handleStatusUpdate(status, 'EMAIL')}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Mark as Emailed'}
            </button>
            <button
              onClick={() => handleStatusUpdate(status)}
              disabled={saving}
              className="btn btn-secondary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {provider.leads[0]?.notes && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px' }}>
              <strong>Notes:</strong> {provider.leads[0].notes}
            </div>
          )}
          {provider.leads[0]?.lastContactedAt && (
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
              Last contacted: {format(new Date(provider.leads[0].lastContactedAt), 'MMM dd, yyyy HH:mm')} 
              {' '}({provider.leads[0].lastContactType})
            </div>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary"
          >
            Update Status
          </button>
        </div>
      )}
    </div>
  );
}
