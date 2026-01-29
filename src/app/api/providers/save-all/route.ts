import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const { providerIds, saveAll } = body;

    let saved = 0;
    let duplicates = 0;

    let providers;
    
    if (saveAll) {
      // Get ALL providers from the database
      providers = await db.provider.findMany({
        select: {
          id: true,
          npi: true,
        },
      });
    } else {
      // Get specific providers by IDs
      if (!providerIds || !Array.isArray(providerIds)) {
        return NextResponse.json(
          { error: 'Invalid provider IDs' },
          { status: 400 }
        );
      }

      providers = await db.provider.findMany({
        where: {
          id: {
            in: providerIds,
          },
        },
        select: {
          id: true,
          npi: true,
        },
      });
    }

    // Get all provider IDs from the fetched providers
    const allProviderIds = providers.map(p => p.id);
    
    // Fetch all existing leads in one query
    const existingLeads = await db.lead.findMany({
      where: {
        providerId: { in: allProviderIds },
      },
      select: { providerId: true },
    });
    
    const existingProviderIdSet = new Set(existingLeads.map(l => l.providerId));
    
    // Filter out providers that already have leads
    const providersToCreate = providers.filter(p => !existingProviderIdSet.has(p.id));
    
    duplicates = providers.length - providersToCreate.length;
    
    // Bulk create leads (in batches to avoid query size limits)
    const BATCH_SIZE = 100;
    for (let i = 0; i < providersToCreate.length; i += BATCH_SIZE) {
      const batch = providersToCreate.slice(i, i + BATCH_SIZE);
      await db.lead.createMany({
        data: batch.map(provider => ({
          providerId: provider.id,
          status: 'NEW',
        })),
        skipDuplicates: true, // Extra safety
      });
      saved += batch.length;
    }

    return NextResponse.json({
      success: true,
      saved,
      duplicates,
      total: providers.length,
    });
  } catch (error: any) {
    console.error('Save all error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save leads' },
      { status: 500 }
    );
  }
}
