import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import AdmZip from 'adm-zip';
import Papa from 'papaparse';

// Type definitions for papaparse
declare module 'papaparse' {
  export function parse<T>(input: string, config?: any): { data: T[]; errors: any[] };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large file processing

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

    // Check file type
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only ZIP files are supported' },
        { status: 400 }
      );
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract ZIP file
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    let totalProcessed = 0;
    let added = 0;
    let updated = 0;
    let errors: string[] = [];

    // Process each file in the ZIP
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const fileName = entry.entryName.toLowerCase();
      
      // Only process CSV files
      if (!fileName.endsWith('.csv')) {
        continue;
      }

      try {
        // Extract file content
        const fileContent = entry.getData().toString('utf-8');
        
        // Parse CSV
        const parseResult = Papa.parse<ProviderRow>(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => {
            // Normalize header names (case-insensitive, handle variations)
            const normalized = header.trim().toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/npi_number|national_provider_identifier/i, 'npi')
              .replace(/firstname|first_name/i, 'first_name')
              .replace(/lastname|last_name/i, 'last_name')
              .replace(/org_name|organization/i, 'organization_name')
              .replace(/postal|zip_code|zipcode/i, 'postal_code')
              .replace(/specialty|taxonomy_desc/i, 'taxonomy');
            return normalized;
          },
        });

        if (parseResult.errors.length > 0) {
          errors.push(`File ${entry.entryName}: ${parseResult.errors.map(e => e.message).join(', ')}`);
        }

        const rows = parseResult.data;
        console.log(`Processing ${rows.length} rows from ${entry.entryName}`);

        // Process rows in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          
          // Extract NPIs for batch lookup
          const npis = batch
            .map(row => row.npi?.toString().trim())
            .filter(Boolean) as string[];

          if (npis.length === 0) continue;

          // Get existing providers
          const existingProviders = await db.provider.findMany({
            where: { npi: { in: npis } },
            select: { npi: true, id: true },
          });

          const existingNpiSet = new Set(existingProviders.map(p => p.npi));
          const existingProviderMap = new Map(existingProviders.map(p => [p.npi, p.id]));

          const providersToCreate: any[] = [];
          const providersToUpdate: Array<{ npi: string; data: any }> = [];

          for (const row of batch) {
            const npi = row.npi?.toString().trim();
            if (!npi) continue;

            // Build provider data
            const providerData: any = {
              npi,
              enumerationType: row.enumeration_type || 'NPI-1',
              firstName: row.first_name?.trim() || null,
              lastName: row.last_name?.trim() || null,
              organizationName: row.organization_name?.trim() || null,
              city: row.city?.trim() || null,
              state: row.state?.trim() || null,
              postalCode: row.postal_code?.trim() || null,
              phone: row.phone?.trim() || null,
              email: row.email?.trim() || null,
              taxonomy: row.taxonomy?.trim() || null,
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

          // Bulk create
          if (providersToCreate.length > 0) {
            const CREATE_BATCH_SIZE = 50;
            for (let j = 0; j < providersToCreate.length; j += CREATE_BATCH_SIZE) {
              const createBatch = providersToCreate.slice(j, j + CREATE_BATCH_SIZE);
              await db.$transaction(
                createBatch.map(providerData => 
                  db.provider.create({ data: providerData })
                )
              );
              added += createBatch.length;
            }
          }

          // Bulk update
          if (providersToUpdate.length > 0) {
            const UPDATE_BATCH_SIZE = 50;
            for (let j = 0; j < providersToUpdate.length; j += UPDATE_BATCH_SIZE) {
              const updateBatch = providersToUpdate.slice(j, j + UPDATE_BATCH_SIZE);
              await db.$transaction(
                updateBatch.map(({ npi, data }) =>
                  db.provider.update({ where: { npi }, data })
                )
              );
              updated += updateBatch.length;
            }
          }

          totalProcessed += batch.length;
        }
      } catch (error: any) {
        errors.push(`Error processing ${entry.entryName}: ${error.message}`);
        console.error(`Error processing ${entry.entryName}:`, error);
      }
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
