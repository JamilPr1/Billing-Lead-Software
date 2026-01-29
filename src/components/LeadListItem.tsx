'use client';

import React, { useState } from 'react';
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
    postalCode: string | null;
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

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '4px',
  border: '1px solid #ddd',
  fontSize: '0.875rem',
} as const;

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 500,
  fontSize: '0.875rem',
} as const;

export default function LeadListItem({ lead, onUpdate, isEven }: LeadListItemProps) {
  const provider = lead.provider;
  const [status, setStatus] = useState(lead.status || 'NEW');
  const [notes, setNotes] = useState(lead.notes || '');
  const [firstName, setFirstName] = useState(provider.firstName ?? '');
  const [lastName, setLastName] = useState(provider.lastName ?? '');
  const [organizationName, setOrganizationName] = useState(provider.organizationName ?? '');
  const [city, setCity] = useState(provider.city ?? '');
  const [state, setState] = useState(provider.state ?? '');
  const [postalCode, setPostalCode] = useState(provider.postalCode ?? '');
  const [phone, setPhone] = useState(provider.phone ?? '');
  const [email, setEmail] = useState(provider.email ?? '');
  const [taxonomy, setTaxonomy] = useState(provider.taxonomy ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'full' | 'status'>('full');
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

  const handleSaveFullEdit = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/leads/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          organizationName: organizationName.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          postalCode: postalCode.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          taxonomy: taxonomy.trim() || null,
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdate();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to save');
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
    <React.Fragment>
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
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>
                    {editMode === 'status' ? 'Update status' : 'Edit lead'}
                  </h4>
                  {editMode === 'status' ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
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
                        <label style={labelStyle}>Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          style={{ ...inputStyle, resize: 'vertical' }}
                          placeholder="Add notes..."
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleStatusUpdate(status)}
                          disabled={saving}
                          className="btn btn-primary"
                          style={{ fontSize: '0.875rem' }}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.875rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>First name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={inputStyle}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Last name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={inputStyle}
                        placeholder="Last name"
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Organization name</label>
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        style={inputStyle}
                        placeholder="Organization name"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        style={inputStyle}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        style={inputStyle}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Postal code</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        style={inputStyle}
                        placeholder="Postal code"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={inputStyle}
                        placeholder="Phone"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                        placeholder="Email"
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Specialty (taxonomy)</label>
                      <input
                        type="text"
                        value={taxonomy}
                        onChange={(e) => setTaxonomy(e.target.value)}
                        style={inputStyle}
                        placeholder="e.g. Internal Medicine"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={inputStyle}
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
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        placeholder="Add notes about the call or email..."
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleSaveFullEdit}
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(status, 'CALL')}
                      disabled={saving}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      Mark as Called
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(status, 'EMAIL')}
                      disabled={saving}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      Mark as Emailed
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFirstName(provider.firstName ?? '');
                        setLastName(provider.lastName ?? '');
                        setOrganizationName(provider.organizationName ?? '');
                        setCity(provider.city ?? '');
                        setState(provider.state ?? '');
                        setPostalCode(provider.postalCode ?? '');
                        setPhone(provider.phone ?? '');
                        setEmail(provider.email ?? '');
                        setTaxonomy(provider.taxonomy ?? '');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                  </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div><strong>Name:</strong> {name}</div>
                    <div><strong>NPI:</strong> <span style={{ fontFamily: 'monospace' }}>{provider.npi}</span></div>
                    <div><strong>Specialty:</strong> {provider.taxonomy || '—'}</div>
                    <div><strong>Location:</strong> {location}</div>
                    <div><strong>Phone:</strong> {provider.phone || '—'}</div>
                    <div><strong>Email:</strong> {provider.email || '—'}</div>
                    <div><strong>Status:</strong> <LeadStatusBadge status={status} /></div>
                    <div><strong>Last contacted:</strong> {lead.lastContactedAt ? format(new Date(lead.lastContactedAt), 'MMM dd, yyyy') : 'Never'}{lead.lastContactType ? ` (${lead.lastContactType})` : ''}</div>
                  </div>
                  {lead.notes && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px' }}>
                      <strong>Notes:</strong> {lead.notes}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => { setEditMode('full'); setIsEditing(true); }}
                      className="btn btn-primary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      Edit lead
                    </button>
                    <button
                      onClick={() => { setEditMode('status'); setIsEditing(true); }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.875rem' }}
                    >
                      Update status only
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

