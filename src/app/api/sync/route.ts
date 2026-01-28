import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchAllProviders } from '@/lib/nppes-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enumeration_type = 'NPI-1', state, city, last_name, taxonomy_description, limit = 200 } = body;

    // NPPES API requires at least one additional criteria besides enumeration_type
    // We'll use a wildcard search on last_name to get all individual providers
    const searchParams: any = {
      enumeration_type,
      limit: Math.min(limit, 200),
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

    console.log('Fetching providers with params:', searchParams);
    const providers = await fetchAllProviders(searchParams, 1200);
    console.log(`Fetched ${providers.length} providers from NPPES API`);

    if (providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No providers found. Try different search criteria.',
        added: 0,
        updated: 0,
        total: 0,
      });
    }

    let added = 0;
    let updated = 0;

    for (const provider of providers) {
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

      const existing = await db.provider.findUnique({
        where: { npi },
      });

      if (existing) {
        await db.provider.update({
          where: { npi },
          data: providerData,
        });
        updated++;
      } else {
        await db.provider.create({
          data: {
            ...providerData,
            leads: {
              create: {
                status: 'NEW',
              },
            },
          },
        });
        added++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      updated,
      total: providers.length,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync providers' },
      { status: 500 }
    );
  }
}
