import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.leads = {
        some: {
          status: status,
        },
      };
    }

    const [providers, total] = await Promise.all([
      db.provider.findMany({
        where,
        orderBy: { addedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          npi: true,
          firstName: true,
          lastName: true,
          organizationName: true,
          city: true,
          state: true,
          phone: true,
          email: true,
          taxonomy: true,
          addedAt: true,
          leads: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              status: true,
              notes: true,
              lastContactedAt: true,
              lastContactType: true,
            },
          },
        },
      }),
      db.provider.count({ where }),
    ]);

    return NextResponse.json({
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
