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

// We only use: NPI, first name, last name, organization name. All other columns are skipped.
interface RequiredProviderRow {
  npi: string;
  first_name?: string | null;
  last_name?: string | null;
  organization_name?: string | null;
}

// Map raw column names (case-insensitive, flexible) to our required keys
const NPI_ALIASES = /^(npi|npi_number|national_provider_identifier|provider_npi|npi\s*#?)$/i;
const FIRST_NAME_ALIASES = /^(first_name|firstname|first\s*name|fname|given_name|givenname)$/i;
const LAST_NAME_ALIASES = /^(last_name|lastname|last\s*name|lname|family_name|surname)$/i;
const ORG_NAME_ALIASES = /^(organization_name|organization|org_name|org|organization\s*name|practice_name|business_name)$/i;

function mapHeaderToKey(header: string): 'npi' | 'first_name' | 'last_name' | 'organization_name' | null {
  const trimmed = header.trim().replace(/\s+/g, '_');
  if (NPI_ALIASES.test(trimmed)) return 'npi';
  if (FIRST_NAME_ALIASES.test(trimmed)) return 'first_name';
  if (LAST_NAME_ALIASES.test(trimmed)) return 'last_name';
  if (ORG_NAME_ALIASES.test(trimmed)) return 'organization_name';
  return null;
}

function extractRequiredFieldsOnly(row: Record<string, any>): RequiredProviderRow | null {
  const out: RequiredProviderRow = { npi: '' };
  for (const [rawKey, value] of Object.entries(row)) {
    const key = mapHeaderToKey(rawKey);
    if (!key) continue;
    const str = value != null ? String(value).trim() : '';
    if (key === 'npi') out.npi = str;
    else if (key === 'first_name') out.first_name = str || null;
    else if (key === 'last_name') out.last_name = str || null;
    else if (key === 'organization_name') out.organization_name = str || null;
  }
  if (!out.npi) return null;
  return out;
}

async function upsertProvidersFromRows(rows: RequiredProviderRow[]) {
  let totalProcessed = 0;
  let added = 0;
  let updated = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const npis = batch.map((row) => row.npi).filter(Boolean);
    if (npis.length === 0) continue;

    const existingProviders = await db.provider.findMany({
      where: { npi: { in: npis } },
      select: { npi: true },
    });

    const existingNpiSet = new Set(existingProviders.map((p) => p.npi));

    const providersToCreate: any[] = [];
    const providersToUpdate: Array<{ npi: string; data: any }> = [];

    for (const row of batch) {
      const npi = row.npi.trim();
      if (!npi) continue;

      // Only required fields: NPI, first name, last name, organization name. Rest are empty.
      const providerData: any = {
        npi,
        enumerationType: 'NPI-1',
        firstName: row.first_name || null,
        lastName: row.last_name || null,
        organizationName: row.organization_name || null,
        city: null,
        state: null,
        postalCode: null,
        phone: null,
        email: null,
        taxonomy: null,
        primaryAddress: JSON.stringify({}),
        mailingAddress: JSON.stringify({}),
        rawData: JSON.stringify({ npi: row.npi, first_name: row.first_name, last_name: row.last_name, organization_name: row.organization_name }),
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

          const rows = parseResult.data
            .map((r) => extractRequiredFieldsOnly(r))
            .filter((r): r is RequiredProviderRow => r != null);
          console.log(`Processing ${rows.length} rows from ${entry.entryName} (NPI + name only)`);

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

      const rows = parseResult.data
        .map((r) => extractRequiredFieldsOnly(r))
        .filter((r): r is RequiredProviderRow => r != null);
      console.log(`Processing ${rows.length} rows from ${file.name} (NPI + name only)`);

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
      const rows = rawRows
        .map((r) => extractRequiredFieldsOnly(r))
        .filter((r): r is RequiredProviderRow => r != null);

      console.log(`Processing ${rows.length} rows from ${file.name} (sheet: ${firstSheetName}, NPI + name only)`);

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
