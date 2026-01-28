import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, notes, contactType } = body;

    const provider = await db.provider.findUnique({
      where: { id: params.id },
      include: { leads: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    let lead = provider.leads[0];
    
    if (!lead) {
      lead = await db.lead.create({
        data: {
          providerId: params.id,
          status: status || 'NEW',
          notes: notes || null,
          lastContactedAt: contactType ? new Date() : null,
          lastContactType: contactType || null,
        },
      });
    } else {
      lead = await db.lead.update({
        where: { id: lead.id },
        data: {
          status: status || lead.status,
          notes: notes !== undefined ? notes : lead.notes,
          lastContactedAt: contactType ? new Date() : lead.lastContactedAt,
          lastContactType: contactType || lead.lastContactType,
        },
      });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lead' },
      { status: 500 }
    );
  }
}