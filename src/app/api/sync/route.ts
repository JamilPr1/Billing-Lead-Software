import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchAllProviders } from '@/lib/nppes-api';

export const dynamic = 'force-dynamic';

// Helper function to generate unique search key
function generateSearchKey(searchParams: any): string {
  const parts: string[] = [];
  if (searchParams.taxonomy_description) parts.push(`taxonomy:${searchParams.taxonomy_description}`);
  if (searchParams.state) parts.push(`state:${searchParams.state}`);
  if (searchParams.city) parts.push(`city:${searchParams.city}`);
  if (searchParams.last_name) parts.push(`last_name:${searchParams.last_name}`);
  if (searchParams.enumeration_type) parts.push(`enum:${searchParams.enumeration_type}`);
  return parts.join('|') || 'default';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      enumeration_type = 'NPI-1', 
      state, 
      city, 
      last_name, 
      taxonomy_description, 
      limit, // Remove default - will be unlimited if not specified
      createLeadsForExisting = false,
      fetchAll = true, // Default to fetching all records
      resumeFromLastPosition = true // Default to resuming from last position
    } = body;

    // NPPES API requires at least one additional criteria besides enumeration_type
    // We'll use a wildcard search on last_name to get all individual providers
    const searchParams: any = {
      enumeration_type,
      limit: 200, // API max per request (keep at 200)
    };

    // Add additional criteria - NPPES API requires at least one additional field besides enumeration_type
    // Priority: taxonomy > state+name > city > last_name > default
    if (taxonomy_description) {
      searchParams.taxonomy_description = taxonomy_description;
    } else if (state && last_name) {
      // Best: state + last_name combination
      searchParams.state = state;
      searchParams.last_name = last_name;
    } else if (state) {
      // State alone not enough, add a common last name
      searchParams.state = state;
      searchParams.last_name = 'Smith*'; // Common name to get results
    } else if (city) {
      searchParams.city = city;
    } else if (last_name) {
      searchParams.last_name = last_name;
    } else {
      // Default: Use taxonomy_description to get doctors by specialty
      // This is more reliable than name searches
      searchParams.taxonomy_description = 'Internal Medicine';
      console.log('Using default taxonomy search: Internal Medicine');
    }

    // Generate search key for tracking progress
    const searchKey = generateSearchKey(searchParams);
    
    // Get last sync position if resuming
    let startFromSkip = 0;
    if (resumeFromLastPosition) {
      const syncProgress = await db.syncProgress.findUnique({
        where: { searchKey },
      });
      if (syncProgress) {
        startFromSkip = syncProgress.lastFetchedSkip;
        console.log(`Resuming from position ${startFromSkip} for search key: ${searchKey}`);
      }
    }

    console.log('Fetching providers with params:', searchParams);
    console.log(`Fetch mode: ${fetchAll ? 'UNLIMITED (all records)' : `Limited to ${limit || 'default'}`}`);
    
    // Fetch providers (unlimited if fetchAll is true or limit is not specified)
    const maxRecords = fetchAll ? undefined : (limit || undefined);
    const fetchResult = await fetchAllProviders(searchParams, maxRecords, startFromSkip);
    const providers = fetchResult.providers;
    
    console.log(`Fetched ${providers.length} providers from NPPES API (Total available: ${fetchResult.totalAvailable}, Last skip: ${fetchResult.lastSkip})`);

    if (providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No providers found. Try different search criteria.',
        added: 0,
        updated: 0,
        total: 0,
      });
    }

    // Extract all NPIs upfront
    const npis = providers.map(p => p.number);
    
    // Fetch all existing providers in one query
    const existingProviders = await db.provider.findMany({
      where: { npi: { in: npis } },
      select: { npi: true, id: true },
    });
    
    const existingNpiSet = new Set(existingProviders.map(p => p.npi));
    const existingProviderMap = new Map(existingProviders.map(p => [p.npi, p.id]));
    
    // Prepare data for bulk operations
    const providersToCreate: any[] = [];
    const providersToUpdate: Array<{ npi: string; data: any }> = [];
    
    // Process providers in batches
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < providers.length; i += BATCH_SIZE) {
      const batch = providers.slice(i, i + BATCH_SIZE);
      
      for (const provider of batch) {
        const npi = provider.number;
        const primaryAddress = provider.addresses?.[0] || {};
        const mailingAddress = provider.addresses?.[1] || {};
        const taxonomy = provider.taxonomies?.find(t => t.primary)?.desc || 
                        provider.taxonomies?.[0]?.desc || '';

        // Extract phone numbers from all addresses (primary, mailing, practice locations)
        let phone = primaryAddress.telephone_number || null;
        if (!phone && mailingAddress.telephone_number) {
          phone = mailingAddress.telephone_number;
        }
        
        // Check practice locations for additional phone numbers
        if (!phone && provider.practiceLocations && Array.isArray(provider.practiceLocations)) {
          for (const location of provider.practiceLocations) {
            if (location.telephone_number) {
              phone = location.telephone_number;
              break;
            }
          }
        }

        // Extract email from endpoints if available
        let email = null;
        if (provider.endpoints && Array.isArray(provider.endpoints)) {
          for (const endpoint of provider.endpoints) {
            const endpointValue = endpoint.endpoint || endpoint.endpointLocation || '';
            if (endpointValue && endpointValue.includes('@')) {
              email = endpointValue;
              break;
            }
            // Also check endpointType
            if (endpoint.endpointType === 'EMAIL' || endpoint.endpointType === 'DIRECT') {
              email = endpointValue || null;
              if (email) break;
            }
          }
        }

        const providerData = {
          npi,
          enumerationType: provider.enumeration_type,
          firstName: provider.basic?.first_name || null,
          lastName: provider.basic?.last_name || null,
          organizationName: provider.basic?.organization_name || null,
          primaryAddress: JSON.stringify(primaryAddress),
          mailingAddress: JSON.stringify(mailingAddress),
          city: primaryAddress.city || null,
          state: primaryAddress.state || null,
          postalCode: primaryAddress.postal_code || null,
          phone: phone,
          email: email,
          taxonomy: taxonomy || null,
          rawData: JSON.stringify(provider),
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
    }

    // Perform bulk operations
    let added = 0;
    let updated = 0;

    // Bulk create new providers (in batches to avoid query size limits)
    const CREATE_BATCH_SIZE = 50;
    for (let i = 0; i < providersToCreate.length; i += CREATE_BATCH_SIZE) {
      const batch = providersToCreate.slice(i, i + CREATE_BATCH_SIZE);
      await db.$transaction(
        batch.map(providerData => 
          db.provider.create({ data: providerData })
        )
      );
      added += batch.length;
    }

    // Bulk update existing providers (in batches)
    const UPDATE_BATCH_SIZE = 50;
    for (let i = 0; i < providersToUpdate.length; i += UPDATE_BATCH_SIZE) {
      const batch = providersToUpdate.slice(i, i + UPDATE_BATCH_SIZE);
      await db.$transaction(
        batch.map(({ npi, data }) =>
          db.provider.update({ where: { npi }, data })
        )
      );
      updated += batch.length;
    }

    // Optionally create leads for existing providers that don't have leads
    let leadsCreatedForExisting = 0;
    
    if (createLeadsForExisting && providersToUpdate.length > 0) {
      // Get provider IDs that were updated
      const updatedProviderIds = providersToUpdate
        .map(({ npi }) => existingProviderMap.get(npi))
        .filter(Boolean) as string[];

      if (updatedProviderIds.length > 0) {
        // Check which providers don't have leads
        const providersWithLeads = await db.lead.findMany({
          where: { providerId: { in: updatedProviderIds } },
          select: { providerId: true },
        });
        
        const providersWithLeadsSet = new Set(providersWithLeads.map(l => l.providerId));
        const providersNeedingLeads = updatedProviderIds.filter(id => !providersWithLeadsSet.has(id));

        // Create leads for providers that don't have them
        if (providersNeedingLeads.length > 0) {
          const LEAD_BATCH_SIZE = 100;
          for (let i = 0; i < providersNeedingLeads.length; i += LEAD_BATCH_SIZE) {
            const batch = providersNeedingLeads.slice(i, i + LEAD_BATCH_SIZE);
            await db.lead.createMany({
              data: batch.map(providerId => ({
                providerId,
                status: 'NEW',
              })),
            });
            leadsCreatedForExisting += batch.length;
          }
        }
      }
    }

    // Count how many leads were created (each new provider gets 1 lead)
    const leadsCreated = added + leadsCreatedForExisting;

    // Update sync progress
    await db.syncProgress.upsert({
      where: { searchKey },
      create: {
        searchKey,
        lastFetchedSkip: fetchResult.lastSkip,
        totalFetched: fetchResult.lastSkip,
        totalAvailable: fetchResult.totalAvailable,
      },
      update: {
        lastFetchedSkip: fetchResult.lastSkip,
        totalFetched: fetchResult.lastSkip,
        totalAvailable: fetchResult.totalAvailable,
      },
    });

    const isComplete = fetchResult.lastSkip >= fetchResult.totalAvailable;
    const progressMessage = isComplete 
      ? `✅ Complete! All ${fetchResult.totalAvailable.toLocaleString()} records fetched.`
      : `📊 Progress: ${fetchResult.lastSkip.toLocaleString()} / ${fetchResult.totalAvailable.toLocaleString()} records fetched (${Math.round((fetchResult.lastSkip / fetchResult.totalAvailable) * 100)}%)`;

    return NextResponse.json({
      success: true,
      added,
      updated,
      total: providers.length,
      leadsCreated,
      leadsCreatedForNew: added,
      leadsCreatedForExisting,
      totalAvailable: fetchResult.totalAvailable,
      lastFetchedSkip: fetchResult.lastSkip,
      isComplete,
      progressMessage,
      message: `Synced ${providers.length} providers: ${added} new (${added} leads created), ${updated} updated${leadsCreatedForExisting > 0 ? `, ${leadsCreatedForExisting} leads created for existing providers` : ''}. ${progressMessage}`,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync providers' },
      { status: 500 }
    );
  }
}
