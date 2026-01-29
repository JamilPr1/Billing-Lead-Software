import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-api';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  try {
    const providerId = params.id;
    const body = await request.json();
    const {
      status,
      notes,
      contactType,
      firstName,
      lastName,
      organizationName,
      city,
      state,
      postalCode,
      phone,
      email,
      taxonomy,
    } = body;

    const provider = await db.provider.findUnique({
      where: { id: providerId },
      include: { leads: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const providerUpdates: Record<string, unknown> = {};
    if (firstName !== undefined) providerUpdates.firstName = firstName === '' ? null : firstName;
    if (lastName !== undefined) providerUpdates.lastName = lastName === '' ? null : lastName;
    if (organizationName !== undefined) providerUpdates.organizationName = organizationName === '' ? null : organizationName;
    if (city !== undefined) providerUpdates.city = city === '' ? null : city;
    if (state !== undefined) providerUpdates.state = state === '' ? null : state;
    if (postalCode !== undefined) providerUpdates.postalCode = postalCode === '' ? null : postalCode;
    if (phone !== undefined) providerUpdates.phone = phone === '' ? null : phone;
    if (email !== undefined) providerUpdates.email = email === '' ? null : email;
    if (taxonomy !== undefined) providerUpdates.taxonomy = taxonomy === '' ? null : taxonomy;

    if (Object.keys(providerUpdates).length > 0) {
      await db.provider.update({
        where: { id: providerId },
        data: providerUpdates,
      });
    }

    let lead = provider.leads[0];

    if (!lead) {
      lead = await db.lead.create({
        data: {
          providerId,
          status: status ?? 'NEW',
          notes: notes ?? null,
          lastContactedAt: contactType ? new Date() : null,
          lastContactType: contactType ?? null,
        },
      });
    } else {
      lead = await db.lead.update({
        where: { id: lead.id },
        data: {
          status: status ?? lead.status,
          notes: notes !== undefined ? notes : lead.notes,
          lastContactedAt: contactType ? new Date() : lead.lastContactedAt,
          lastContactType: contactType ?? lead.lastContactType,
        },
      });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: unknown) {
    console.error('Error updating lead:', error);
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}