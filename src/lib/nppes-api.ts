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
  
  // First request to get total count
  const firstResponse = await searchNPPES({
    ...searchParams,
    limit,
    skip: 0,
  });

  console.log(`NPPES API first response: result_count=${firstResponse.result_count}, results=${firstResponse.results?.length || 0}`);

  if (!firstResponse.results || firstResponse.results.length === 0) {
    return [];
  }

  allProviders.push(...firstResponse.results);

  // Calculate how many more requests we need
  const totalAvailable = firstResponse.result_count || 0;
  const totalNeeded = Math.min(maxRecords, totalAvailable);
  const remainingNeeded = totalNeeded - allProviders.length;
  
  if (remainingNeeded <= 0) {
    return allProviders;
  }

  // Calculate number of parallel requests (limit to 3 concurrent to avoid rate limiting)
  const numRequests = Math.ceil(remainingNeeded / limit);
  const maxConcurrent = 3; // Conservative to avoid hitting rate limits

  // Create batches of parallel requests
  for (let i = 0; i < numRequests; i += maxConcurrent) {
    const batch: Promise<NPPESResponse>[] = [];
    for (let j = 0; j < maxConcurrent && (i + j) < numRequests; j++) {
      const skip = (i + j + 1) * limit;
      if (skip >= totalNeeded || allProviders.length >= maxRecords) break;
      
      batch.push(
        searchNPPES({
          ...searchParams,
          limit,
          skip,
        }).catch(error => {
          console.error(`Error fetching batch at skip ${skip}:`, error);
          // Return empty response on error to continue processing
          return { result_count: 0, results: [] } as NPPESResponse;
        })
      );
    }
    
    if (batch.length === 0) break;
    
    // Wait for batch to complete before starting next batch
    const batchResults = await Promise.all(batch);
    
    for (const response of batchResults) {
      if (response.results && response.results.length > 0) {
        allProviders.push(...response.results);
        if (allProviders.length >= maxRecords) {
          return allProviders.slice(0, maxRecords);
        }
      }
    }
    
    // Small delay between batches to be respectful to the API
    if (i + maxConcurrent < numRequests && allProviders.length < maxRecords) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return allProviders.slice(0, maxRecords);
}
