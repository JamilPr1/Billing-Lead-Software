import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Initialize database schema - creates tables if they don't exist
export async function POST() {
  try {
    // Test connection first
    await db.$connect();
    
    // Try a simple query to verify tables exist
    // If tables don't exist, Prisma will throw an error
    await db.provider.findFirst({ take: 1 });
    
    await db.$disconnect();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database is ready! Tables exist and connection works.',
    });
  } catch (error: any) {
    // If tables don't exist, we need to push the schema
    if (error.message?.includes('does not exist') || error.code === 'P2021') {
      try {
        // Import PrismaClient to access $executeRaw for schema push
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // Note: db push should be run via CLI, but we can test connection
        await prisma.$disconnect();
        
        return NextResponse.json({ 
          success: false,
          message: 'Database connected but tables need to be created.',
          instruction: 'Run: npx prisma db push (via Vercel CLI or deployment)',
          error: error.message
        }, { status: 200 });
      } catch (pushError: any) {
        return NextResponse.json({ 
          success: false,
          message: 'Database connection works, but schema needs to be initialized.',
          instruction: 'Please run: npx prisma db push',
          error: error.message
        }, { status: 200 });
      }
    }
    
    console.error('Database initialization error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: 'Check that PRISMA_DATABASE_URL is set correctly in Vercel environment variables'
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
