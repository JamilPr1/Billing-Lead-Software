export interface NPPESProvider {
  number: string;
  enumeration_type: string;
  basic: {
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    credential?: string;
  };
  addresses: Array<{
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country_code?: string;
    address_type?: string;
    telephone_number?: string;
  }>;
  taxonomies: Array<{
    code?: string;
    desc?: string;
    primary?: boolean;
  }>;
  other_identifiers?: Array<any>;
  other_names?: Array<any>;
  endpoints?: Array<{
    endpointType?: string;
    endpoint?: string;
    endpointLocation?: string;
    endpointDescription?: string;
  }>;
  practiceLocations?: Array<any>;
}

export interface NPPESResponse {
  result_count: number;
  results: NPPESProvider[];
}

export type LeadStatus = 
  | 'NEW' 
  | 'CONTACTED' 
  | 'INTERESTED' 
  | 'NOT_INTERESTED' 
  | 'FOLLOW_UP' 
  | 'CONVERTED' 
  | 'DO_NOT_CALL';

export type ContactType = 'CALL' | 'EMAIL' | 'BOTH';
