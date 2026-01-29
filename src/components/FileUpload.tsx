'use client';

import { useState } from 'react';

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const lowerName = file.name.toLowerCase();
    const isZip = lowerName.endsWith('.zip');
    const isCsv = lowerName.endsWith('.csv');
    const isXlsx = lowerName.endsWith('.xlsx');
    const isXls = lowerName.endsWith('.xls');

    if (!isZip && !isCsv && !isXlsx && !isXls) {
      setMessage('Error: Supported formats are .xlsx, .xls, .csv, .zip');
      return;
    }

    // No explicit file-size limit enforced here.

    setUploading(true);
    setMessage(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Handle 413 (Request Entity Too Large) - live server rejects body before our API
      if (response.status === 413) {
        setMessage('File too large for the server. On live hosting, try files under 4MB or run the app locally for large uploads.');
        event.target.value = '';
        setUploading(false);
        setProgress(0);
        return;
      }

      const text = await response.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setMessage(response.status === 413
          ? 'File too large for the server. Try a smaller file or run locally for large uploads.'
          : `Upload failed (${response.status}). Try a smaller file or run the app locally.`);
        event.target.value = '';
        setUploading(false);
        setProgress(0);
        return;
      }

      if (data.success) {
        setMessage(
          `✅ Import completed! Added: ${data.added.toLocaleString()}, Updated: ${data.updated.toLocaleString()}, Total: ${data.totalProcessed.toLocaleString()}`
        );
        if (data.errors && data.errors.length > 0) {
          console.warn('Import errors:', data.errors);
        }
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage(`Error: ${data.error || 'Failed to upload file'}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message || 'Failed to upload file'}`);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="file-upload"
          className="btn btn-primary"
          style={{
            display: 'inline-block',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading...' : '📤 Upload ZIP File'}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx,.xls,.csv,.zip"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
          Excel/CSV or ZIP. We use NPI, first name, last name (and org name) only. On live, keep files under 4MB.
        </div>
      </div>

      {uploading && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: '#e0e0e0', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: '#1976d2',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            Processing file... This may take a few minutes for large files.
          </div>
        </div>
      )}

      {message && (
        <p style={{ 
          marginTop: '0.5rem', 
          color: message.includes('Error') ? '#d32f2f' : '#388e3c',
          fontSize: '0.875rem'
        }}>
          {message}
        </p>
      )}
    </div>
  );
}
