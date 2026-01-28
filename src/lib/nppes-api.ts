import axios from 'axios';
import { NPPESResponse, NPPESProvider } from './types';

const NPPES_API_URL = 'https://npiregistry.cms.hhs.gov/api/?version=2.1';

export interface NPPESSearchParams {
  enumeration_type?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  taxonomy_description?: string;
  limit?: number;
  skip?: number;
}

export async function searchNPPES(params: NPPESSearchParams): Promise<NPPESResponse> {
  // Build query params manually to ensure proper encoding
  const queryParams: Record<string, string> = {
    version: '2.1',
  };

  // Add all non-empty params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams[key] = String(value);
    }
  });

  const url = new URL(NPPES_API_URL);
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log('NPPES API Request URL:', url.toString());

  try {
    const response = await axios.get<NPPESResponse>(url.toString());
    console.log('NPPES API Response:', {
      result_count: response.data.result_count,
      results_length: response.data.results?.length || 0,
    });
    return response.data;
  } catch (error: any) {
    console.error('NPPES API Error:', error.response?.data || error.message);
    throw new Error(`Failed to fetch from NPPES API: ${error.response?.data?.message || error.message}`);
  }
}

export async function fetchAllProviders(
  searchParams: NPPESSearchParams = {},
  maxRecords: number = 1200
): Promise<NPPESProvider[]> {
  const allProviders: NPPESProvider[] = [];
  const limit = searchParams.limit || 200;
  let skip = 0;
  let hasMore = true;

  while (hasMore && allProviders.length < maxRecords) {
    const response = await searchNPPES({
      ...searchParams,
      limit,
      skip,
    });

    console.log(`NPPES API response: result_count=${response.result_count}, results=${response.results?.length || 0}`);

    if (response.results && response.results.length > 0) {
      allProviders.push(...response.results);
      skip += response.results.length;

      if (response.results.length < limit) {
        hasMore = false;
      }
    } else {
      console.log('No more results from NPPES API');
      hasMore = false;
    }

    if (allProviders.length >= maxRecords) {
      break;
    }
  }

  return allProviders;
}
