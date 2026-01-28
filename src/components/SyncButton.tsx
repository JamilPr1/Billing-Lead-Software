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

interface SyncProgress {
  currentSpecialty: string | null;
  specialtyProgress: { current: number; total: number };
  providersFetched: number;
  providersAdded: number;
  providersUpdated: number;
  leadsCreated: number;
  status: 'fetching' | 'processing' | 'complete';
}

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Internal Medicine']);
  const [showSelector, setShowSelector] = useState(false);
  const [createLeadsForExisting, setCreateLeadsForExisting] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  
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
    let totalLeadsCreated = 0;

    try {
      // Sync each selected specialty
      const totalSpecialties = selectedSpecialties.length;
      for (let idx = 0; idx < selectedSpecialties.length; idx++) {
        const specialtyLabel = selectedSpecialties[idx];
        
        // Update progress: fetching
        setProgress({
          currentSpecialty: specialtyLabel,
          specialtyProgress: { current: idx + 1, total: totalSpecialties },
          providersFetched: totalProcessed,
          providersAdded: totalAdded,
          providersUpdated: totalUpdated,
          leadsCreated: totalLeadsCreated,
          status: 'fetching',
        });
        
        const specialtySearch = getSpecialtySearch(specialtyLabel);
        
        // Update progress: processing
        setProgress(prev => prev ? { ...prev, status: 'processing' } : null);
        
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enumeration_type: 'NPI-1',
            taxonomy_description: specialtySearch,
            createLeadsForExisting: createLeadsForExisting,
            fetchAll: true, // Fetch ALL records (unlimited)
            resumeFromLastPosition: true, // Resume from last position
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          const added = data.added || 0;
          const updated = data.updated || 0;
          const processed = data.total || 0;
          const leadsCreated = data.leadsCreated || added; // Each new provider gets 1 lead
          const totalAvailable = data.totalAvailable || 0;
          const lastFetchedSkip = data.lastFetchedSkip || 0;
          const isComplete = data.isComplete || false;
          
          totalAdded += added;
          totalUpdated += updated;
          totalProcessed += processed;
          totalLeadsCreated += leadsCreated;
          
          // Update progress with latest stats
          setProgress({
            currentSpecialty: specialtyLabel,
            specialtyProgress: { current: idx + 1, total: totalSpecialties },
            providersFetched: totalProcessed,
            providersAdded: totalAdded,
            providersUpdated: totalUpdated,
            leadsCreated: totalLeadsCreated,
            status: isComplete ? 'complete' : 'processing',
          });
          
          // Show progress message if not complete
          if (!isComplete && totalAvailable > 0) {
            const progressPercent = Math.round((lastFetchedSkip / totalAvailable) * 100);
            setMessage(`${specialtyLabel}: ${progressPercent}% complete (${lastFetchedSkip.toLocaleString()}/${totalAvailable.toLocaleString()} records)`);
          }
        } else {
          setMessage(`Error syncing ${specialtyLabel}: ${data.error}`);
        }
      }
      
      setProgress(null);

      if (totalProcessed > 0) {
        setMessage(`✅ Sync completed! Fetched: ${totalProcessed.toLocaleString()} providers | Added: ${totalAdded.toLocaleString()} (${totalLeadsCreated.toLocaleString()} leads created) | Updated: ${totalUpdated.toLocaleString()}`);
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setMessage('No providers found. Try different specialties or search criteria.');
      }
    } catch (error) {
      setMessage('Failed to sync providers');
      setProgress(null);
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
          {loading 
            ? (progress?.currentSpecialty 
                ? `Syncing ${progress.currentSpecialty}... (${progress.specialtyProgress.current}/${progress.specialtyProgress.total})` 
                : 'Syncing...')
            : 'Sync Selected Specialties'}
        </button>
        {selectedSpecialties.length > 0 && (
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            Selected: {selectedSpecialties.join(', ')}
          </div>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={createLeadsForExisting}
            onChange={(e) => setCreateLeadsForExisting(e.target.checked)}
            disabled={loading}
          />
          <span>Create leads for existing providers</span>
        </label>
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

      {/* Progress Bar */}
      {progress && (
        <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
          <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              {progress.status === 'fetching' && '📡 Fetching from NPPES API...'}
              {progress.status === 'processing' && '⚙️ Processing providers...'}
              {progress.status === 'complete' && '✅ Processing complete'}
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              {progress.currentSpecialty} ({progress.specialtyProgress.current}/{progress.specialtyProgress.total})
            </span>
          </div>
          
          {/* Progress Bar */}
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: '#e0e0e0', 
            borderRadius: '4px', 
            overflow: 'hidden',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: `${(progress.specialtyProgress.current / progress.specialtyProgress.total) * 100}%`,
              height: '100%',
              background: progress.status === 'complete' ? '#4caf50' : '#1976d2',
              transition: 'width 0.3s ease',
            }} />
          </div>
          
          {/* Statistics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '1rem',
            fontSize: '0.875rem'
          }}>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>Providers Fetched</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1976d2' }}>
                {progress.providersFetched.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>New Providers</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4caf50' }}>
                {progress.providersAdded.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>Leads Created</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ff9800' }}>
                {progress.leadsCreated.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.25rem' }}>Providers Updated</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#9e9e9e' }}>
                {progress.providersUpdated.toLocaleString()}
              </div>
            </div>
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
