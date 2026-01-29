import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import AdmZip from 'adm-zip';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Type definitions for papaparse
declare module 'papaparse' {
  export function parse<T>(input: string, config?: any): { data: T[]; errors: any[] };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min (Vercel hobby plan max)

interface ProviderRow {
  npi?: string;
  enumeration_type?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  taxonomy?: string;
  [key: string]: any; // Allow other fields
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/npi_number|national_provider_identifier/i, 'npi')
    .replace(/firstname|first_name/i, 'first_name')
    .replace(/lastname|last_name/i, 'last_name')
    .replace(/org_name|organization/i, 'organization_name')
    .replace(/postal|zip_code|zipcode/i, 'postal_code')
    .replace(/specialty|taxonomy_desc/i, 'taxonomy');
}

function normalizeRowKeys(row: Record<string, any>): ProviderRow {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = value;
  }
  return normalized as ProviderRow;
}

async function upsertProvidersFromRows(rows: ProviderRow[]) {
  let totalProcessed = 0;
  let added = 0;
  let updated = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const npis = batch
      .map((row) => row.npi?.toString().trim())
      .filter(Boolean) as string[];

    if (npis.length === 0) continue;

    const existingProviders = await db.provider.findMany({
      where: { npi: { in: npis } },
      select: { npi: true },
    });

    const existingNpiSet = new Set(existingProviders.map((p) => p.npi));

    const providersToCreate: any[] = [];
    const providersToUpdate: Array<{ npi: string; data: any }> = [];

    for (const row of batch) {
      const npi = row.npi?.toString().trim();
      if (!npi) continue;

      const providerData: any = {
        npi,
        enumerationType: row.enumeration_type || 'NPI-1',
        firstName: row.first_name?.toString().trim() || null,
        lastName: row.last_name?.toString().trim() || null,
        organizationName: row.organization_name?.toString().trim() || null,
        city: row.city?.toString().trim() || null,
        state: row.state?.toString().trim() || null,
        postalCode: row.postal_code?.toString().trim() || null,
        phone: row.phone?.toString().trim() || null,
        email: row.email?.toString().trim() || null,
        taxonomy: row.taxonomy?.toString().trim() || null,
        primaryAddress: JSON.stringify({
          city: row.city,
          state: row.state,
          postal_code: row.postal_code,
        }),
        mailingAddress: JSON.stringify({}),
        rawData: JSON.stringify(row),
      };

      if (existingNpiSet.has(npi)) {
        providersToUpdate.push({ npi, data: providerData });
      } else {
        providersToCreate.push({
          ...providerData,
          leads: {
            create: {
              status: 'NEW',
            },
          },
        });
      }
    }

    if (providersToCreate.length > 0) {
      const CREATE_BATCH_SIZE = 50;
      for (let j = 0; j < providersToCreate.length; j += CREATE_BATCH_SIZE) {
        const createBatch = providersToCreate.slice(j, j + CREATE_BATCH_SIZE);
        await db.$transaction(createBatch.map((data) => db.provider.create({ data })));
        added += createBatch.length;
      }
    }

    if (providersToUpdate.length > 0) {
      const UPDATE_BATCH_SIZE = 50;
      for (let j = 0; j < providersToUpdate.length; j += UPDATE_BATCH_SIZE) {
        const updateBatch = providersToUpdate.slice(j, j + UPDATE_BATCH_SIZE);
        await db.$transaction(updateBatch.map(({ npi, data }) => db.provider.update({ where: { npi }, data })));
        updated += updateBatch.length;
      }
    }

    totalProcessed += batch.length;
  }

  return { totalProcessed, added, updated };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const isZip = lowerName.endsWith('.zip');
    const isCsv = lowerName.endsWith('.csv');
    const isXlsx = lowerName.endsWith('.xlsx');
    const isXls = lowerName.endsWith('.xls');

    // Check file type
    if (!isZip && !isCsv && !isXlsx && !isXls) {
      return NextResponse.json(
        { error: 'Supported formats are .xlsx, .xls, .csv, .zip' },
        { status: 400 }
      );
    }

    // No explicit file-size limit enforced here.

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let totalProcessed = 0;
    let added = 0;
    let updated = 0;
    let errors: string[] = [];

    if (isZip) {
      // Extract ZIP file
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        const entryName = entry.entryName.toLowerCase();
        if (!entryName.endsWith('.csv')) continue;

        try {
          const fileContent = entry.getData().toString('utf-8');
          const parseResult = Papa.parse<Record<string, any>>(fileContent, {
            header: true,
            skipEmptyLines: true,
          });

          if (parseResult.errors.length > 0) {
            errors.push(`File ${entry.entryName}: ${parseResult.errors.map((e) => e.message).join(', ')}`);
          }

          const rows = parseResult.data.map((r) => normalizeRowKeys(r));
          console.log(`Processing ${rows.length} rows from ${entry.entryName}`);

          const res = await upsertProvidersFromRows(rows);
          totalProcessed += res.totalProcessed;
          added += res.added;
          updated += res.updated;
        } catch (error: any) {
          errors.push(`Error processing ${entry.entryName}: ${error.message}`);
          console.error(`Error processing ${entry.entryName}:`, error);
        }
      }
    } else if (isCsv) {
      const fileContent = buffer.toString('utf-8');
      const parseResult = Papa.parse<Record<string, any>>(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors.length > 0) {
        errors.push(`File ${file.name}: ${parseResult.errors.map((e) => e.message).join(', ')}`);
      }

      const rows = parseResult.data.map((r) => normalizeRowKeys(r));
      console.log(`Processing ${rows.length} rows from ${file.name}`);

      const res = await upsertProvidersFromRows(rows);
      totalProcessed += res.totalProcessed;
      added += res.added;
      updated += res.updated;
    } else if (isXlsx || isXls) {
      // Excel: read first sheet by default
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json({ error: 'Excel file has no sheets' }, { status: 400 });
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      const rows = rawRows.map((r) => normalizeRowKeys(r));

      console.log(`Processing ${rows.length} rows from ${file.name} (sheet: ${firstSheetName})`);

      const res = await upsertProvidersFromRows(rows);
      totalProcessed += res.totalProcessed;
      added += res.added;
      updated += res.updated;
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${added} added, ${updated} updated, ${totalProcessed} processed`,
      added,
      updated,
      totalProcessed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}
