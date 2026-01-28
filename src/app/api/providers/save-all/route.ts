import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    // Check for duplicates and save only new ones
    for (const provider of providers) {
      // Check if a lead already exists for this provider
      const existingLead = await db.lead.findFirst({
        where: {
          providerId: provider.id,
        },
      });

      if (existingLead) {
        duplicates++;
        continue;
      }

      // Create a new lead for this provider
      await db.lead.create({
        data: {
          providerId: provider.id,
          status: 'NEW',
        },
      });

      saved++;
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
