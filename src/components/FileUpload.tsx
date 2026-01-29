'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { extractRequiredFieldsFromRow, type RequiredProviderRow } from '@/lib/upload-parse';

// Keep each request well under Vercel/serverless body limits (~4.5MB)
const ROWS_PER_BATCH = 200;

async function parseFileInBrowser(file: File): Promise<RequiredProviderRow[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    return parsed.data
      .map((r) => extractRequiredFieldsFromRow(r))
      .filter((r): r is RequiredProviderRow => r != null);
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) return [];
    const sheet = wb.Sheets[firstSheet];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    return raw
      .map((r) => extractRequiredFieldsFromRow(r))
      .filter((r): r is RequiredProviderRow => r != null);
  }

  if (name.endsWith('.zip')) {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const allRows: RequiredProviderRow[] = [];
    const entries = Object.entries(zip.files).filter(([, entry]) => !entry.dir && entry.name.toLowerCase().endsWith('.csv'));
    for (const [, entry] of entries) {
      const text = await entry.async('string');
      const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
      for (const r of parsed.data) {
        const row = extractRequiredFieldsFromRow(r);
        if (row) allRows.push(row);
      }
    }
    return allRows;
  }

  return [];
}

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isZip = lowerName.endsWith('.zip');
    const isCsv = lowerName.endsWith('.csv');
    const isXlsx = lowerName.endsWith('.xlsx');
    const isXls = lowerName.endsWith('.xls');

    if (!isZip && !isCsv && !isXlsx && !isXls) {
      setMessage('Error: Supported formats are .xlsx, .xls, .csv, .zip');
      return;
    }

    setUploading(true);
    setMessage(null);
    setProgress(0);
    setStatus('Reading file in browser...');

    try {
      const rows = await parseFileInBrowser(file);
      if (rows.length === 0) {
        setMessage('No rows with NPI found. Check that the file has an NPI column.');
        event.target.value = '';
        setUploading(false);
        setProgress(0);
        setStatus('');
        return;
      }

      setStatus(`Sending ${rows.length.toLocaleString()} rows in batches...`);
      let totalAdded = 0;
      let totalUpdated = 0;
      const totalBatches = Math.ceil(rows.length / ROWS_PER_BATCH);

      async function sendBatch(batch: RequiredProviderRow[], batchLabel: string): Promise<{ added: number; updated: number }> {
        const res = await fetch('/api/upload/rows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: batch }),
        });

        let data: { added?: number; updated?: number; error?: string };
        try {
          data = await res.json();
        } catch {
          if (res.status === 413) {
            throw new Error(
              'File too large for the server. On live hosting, try files under 4MB or run the app locally for large uploads.'
            );
          }
          throw new Error(
            `Server error (${res.status}). For large files, run the app locally (npm run dev) for reliable uploads.`
          );
        }

        if (!res.ok) {
          if (res.status === 413) {
            throw new Error(
              'File too large for the server. On live hosting, try files under 4MB or run the app locally for large uploads.'
            );
          }
          throw new Error(data.error || `Batch failed: ${batchLabel}`);
        }
        return { added: data.added ?? 0, updated: data.updated ?? 0 };
      }

      for (let i = 0; i < rows.length; i += ROWS_PER_BATCH) {
        const batch = rows.slice(i, i + ROWS_PER_BATCH);
        const batchNum = Math.floor(i / ROWS_PER_BATCH) + 1;
        setProgress(Math.round((batchNum / totalBatches) * 100));
        setStatus(`Sending batch ${batchNum}/${totalBatches}...`);

        try {
          const result = await sendBatch(batch, `${batchNum}/${totalBatches}`);
          totalAdded += result.added;
          totalUpdated += result.updated;
        } catch (err: any) {
          if (err?.message?.includes('too large') || err?.message?.includes('413')) {
            throw err;
          }
          // Retry this batch in smaller chunks (payload might be borderline)
          const half = Math.ceil(batch.length / 2);
          if (half >= 1) {
            setStatus(`Retrying batch ${batchNum} in smaller chunks...`);
            const a = await sendBatch(batch.slice(0, half), `${batchNum}a`);
            const b = await sendBatch(batch.slice(half), `${batchNum}b`);
            totalAdded += a.added + b.added;
            totalUpdated += a.updated + b.updated;
          } else {
            throw err;
          }
        }
      }

      setProgress(100);
      setStatus('');
      setMessage(
        `✅ Import completed! Added: ${totalAdded.toLocaleString()}, Updated: ${totalUpdated.toLocaleString()}, Total: ${rows.length.toLocaleString()}`
      );
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setMessage(err?.message || 'Import failed.');
      setStatus('');
    } finally {
      setUploading(false);
      setProgress(0);
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
          {uploading ? 'Importing...' : '📤 Upload file'}
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
          Excel, CSV, or ZIP. We use NPI + first/last/org name only. <strong>Large files OK</strong> — file is read in your browser and sent in small batches.
        </div>
      </div>

      {uploading && (
        <div style={{ marginTop: '0.5rem' }}>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: '#1976d2',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            {status}
          </div>
        </div>
      )}

      {message && (
        <p
          style={{
            marginTop: '0.5rem',
            color: message.includes('Error') || message.startsWith('No rows') ? '#d32f2f' : '#388e3c',
            fontSize: '0.875rem',
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
