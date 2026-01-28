'use client';

import { useState } from 'react';

const SPECIALTIES = [
  { label: 'Nurse Practitioners', search: 'Nurse Practitioner' },
  { label: 'Internal Medicine', search: 'Internal Medicine' },
  { label: 'Pain Management', search: 'Pain Management' },
  { label: 'General Physicians', search: 'General Practice' },
  { label: 'Family Medicine', search: 'Family Medicine' },
  { label: 'Orthopaedic', search: 'Orthopaedic Surgery' },
  { label: 'Medical Officer', search: 'Medical Officer' },
  { label: 'Medical Director', search: 'Medical Director' },
];

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Internal Medicine']);
  const [showSelector, setShowSelector] = useState(false);
  
  const getSpecialtySearch = (label: string) => {
    const specialty = SPECIALTIES.find(s => s.label === label);
    return specialty?.search || label;
  };

  const handleSync = async () => {
    if (selectedSpecialties.length === 0) {
      setMessage('Please select at least one specialty');
      return;
    }

    setLoading(true);
    setMessage(null);
    
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalProcessed = 0;

    try {
      // Sync each selected specialty
      for (const specialtyLabel of selectedSpecialties) {
        const specialtySearch = getSpecialtySearch(specialtyLabel);
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enumeration_type: 'NPI-1',
            limit: 200,
            taxonomy_description: specialtySearch,
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          totalAdded += data.added || 0;
          totalUpdated += data.updated || 0;
          totalProcessed += data.total || 0;
        } else {
          setMessage(`Error syncing ${specialtyLabel}: ${data.error}`);
        }
      }

      if (totalProcessed > 0) {
        setMessage(`Sync completed! Added: ${totalAdded}, Updated: ${totalUpdated}, Total: ${totalProcessed}`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage('No providers found. Try different specialties.');
      }
    } catch (error) {
      setMessage('Failed to sync providers');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (specialtyLabel: string) => {
    if (selectedSpecialties.includes(specialtyLabel)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialtyLabel));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialtyLabel]);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="btn btn-secondary"
        >
          {showSelector ? 'Hide' : 'Select'} Specialties ({selectedSpecialties.length})
        </button>
        <button
          onClick={handleSync}
          disabled={loading || selectedSpecialties.length === 0}
          className="btn btn-primary"
        >
          {loading ? 'Syncing...' : 'Sync Selected Specialties'}
        </button>
        {selectedSpecialties.length > 0 && (
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            Selected: {selectedSpecialties.join(', ')}
          </div>
        )}
      </div>
      
      {showSelector && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Select Medical Specialties to Sync:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {SPECIALTIES.map((specialty) => (
              <label
                key={specialty.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  background: selectedSpecialties.includes(specialty.label) ? '#e3f2fd' : 'transparent',
                  border: `1px solid ${selectedSpecialties.includes(specialty.label) ? '#1976d2' : '#ddd'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedSpecialties.includes(specialty.label)}
                  onChange={() => toggleSpecialty(specialty.label)}
                  style={{ marginRight: '0.5rem' }}
                />
                <span style={{ fontSize: '0.875rem' }}>{specialty.label}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setSelectedSpecialties(SPECIALTIES.map(s => s.label))}
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedSpecialties([])}
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {message && (
        <p style={{ marginTop: '0.5rem', color: message.includes('Error') ? '#d32f2f' : '#388e3c' }}>
          {message}
        </p>
      )}
    </div>
  );
}
