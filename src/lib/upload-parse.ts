/**
 * Shared logic to map raw row keys to required fields (NPI, first name, last name, org name).
 * Used in browser (FileUpload) and server (upload route).
 */
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

export interface RequiredProviderRow {
  npi: string;
  first_name?: string | null;
  last_name?: string | null;
  organization_name?: string | null;
}

export function extractRequiredFieldsFromRow(row: Record<string, unknown>): RequiredProviderRow | null {
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
