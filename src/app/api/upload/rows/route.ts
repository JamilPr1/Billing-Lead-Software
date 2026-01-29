import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

interface RowBody {
  npi: string;
  first_name?: string | null;
  last_name?: string | null;
  organization_name?: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  try {
    let body: { rows?: RowBody[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or too large request body. Try smaller batches or run the app locally for large files.' },
        { status: 400 }
      );
    }
    const rows = body.rows as RowBody[] | undefined;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Missing or empty "rows" array' }, { status: 400 });
    }

    // Limit batch size to stay under body limits
    if (rows.length > 500) {
      return NextResponse.json({ error: 'Max 500 rows per request' }, { status: 400 });
    }

    const normalized = rows
      .map((r) => {
        const npi = r?.npi != null ? String(r.npi).trim() : '';
        if (!npi) return null;
        return {
          npi,
          first_name: r.first_name != null ? String(r.first_name).trim() || null : null,
          last_name: r.last_name != null ? String(r.last_name).trim() || null : null,
          organization_name: r.organization_name != null ? String(r.organization_name).trim() || null : null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    // Deduplicate by NPI within this batch (last occurrence wins) to avoid unique constraint errors
    const byNpi = new Map<string, (typeof normalized)[0]>();
    for (const row of normalized) {
      byNpi.set(row.npi, row);
    }
    const uniqueRows = Array.from(byNpi.values());

    let added = 0;
    let updated = 0;

    const npis = uniqueRows.map((r) => r.npi);
    const existingProviders = await db.provider.findMany({
      where: { npi: { in: npis } },
      select: { npi: true },
    });
    const existingNpiSet = new Set(existingProviders.map((p) => p.npi));

    const toCreate: any[] = [];
    const toUpdate: Array<{ npi: string; data: any }> = [];

    for (const row of uniqueRows) {
      const providerData = {
        npi: row.npi,
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
        rawData: JSON.stringify({
          npi: row.npi,
          first_name: row.first_name,
          last_name: row.last_name,
          organization_name: row.organization_name,
        }),
      };

      if (existingNpiSet.has(row.npi)) {
        toUpdate.push({ npi: row.npi, data: providerData });
      } else {
        toCreate.push({
          ...providerData,
          leads: { create: { status: 'NEW' } },
        });
      }
    }

    if (toCreate.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < toCreate.length; i += CHUNK) {
        const chunk = toCreate.slice(i, i + CHUNK);
        await db.$transaction(chunk.map((data) => db.provider.create({ data })));
        added += chunk.length;
      }
    }

    if (toUpdate.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < toUpdate.length; i += CHUNK) {
        const chunk = toUpdate.slice(i, i + CHUNK);
        await db.$transaction(chunk.map(({ npi, data }) => db.provider.update({ where: { npi }, data })));
        updated += chunk.length;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      updated,
      total: uniqueRows.length,
    });
  } catch (error: any) {
    console.error('Upload rows error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import rows' },
      { status: 500 }
    );
  }
}
