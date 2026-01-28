import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Temporary migration test endpoint
// DELETE THIS FILE after verifying database connection works
export async function GET() {
  try {
    // Test database connection
    await db.$connect();
    
    // Test a simple query
    const result = await db.$queryRaw`SELECT 1 as test`;
    
    await db.$disconnect();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connected successfully!',
      test: result
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: 'Make sure DATABASE_URL environment variable is set correctly in Vercel'
    }, { status: 500 });
  }
}
