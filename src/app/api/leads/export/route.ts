import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Get all leads (no pagination for export)
    const leads = await db.lead.findMany({
      where,
      include: {
        provider: {
          select: {
            npi: true,
            firstName: true,
            lastName: true,
            organizationName: true,
            city: true,
            state: true,
            postalCode: true,
            phone: true,
            email: true,
            taxonomy: true,
            primaryAddress: true,
            mailingAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to CSV
    const headers = [
      'NPI',
      'Name',
      'Organization',
      'Specialty',
      'City',
      'State',
      'Postal Code',
      'Phone',
      'Email',
      'Primary Address',
      'Mailing Address',
      'Lead Status',
      'Notes',
      'Last Contacted',
      'Last Contact Type',
      'Created At',
    ];

    const rows = leads.map((lead) => {
      const provider = lead.provider;
      const name = provider.firstName && provider.lastName
        ? `${provider.firstName} ${provider.lastName}`
        : provider.organizationName || '';
      
      return [
        provider.npi || '',
        name,
        provider.organizationName || '',
        provider.taxonomy || '',
        provider.city || '',
        provider.state || '',
        provider.postalCode || '',
        provider.phone || '',
        provider.email || '',
        provider.primaryAddress || '',
        provider.mailingAddress || '',
        lead.status || '',
        lead.notes || '',
        lead.lastContactedAt ? new Date(lead.lastContactedAt).toISOString() : '',
        lead.lastContactType || '',
        lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
      ];
    });

    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting leads:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export leads' },
      { status: 500 }
    );
  }
}
