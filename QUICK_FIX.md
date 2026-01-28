# Quick Fix: Database Setup for Vercel

## The Problem
SQLite doesn't work on Vercel's serverless platform. You're seeing errors like:
- "Unable to open the database file"
- "Error querying the database: Error code 14"

## Solution: Set Up Vercel Postgres (5 minutes)

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Click on the **"Storage"** tab
3. Click **"Create Database"**
4. Select **"Postgres"**
5. Choose a name (e.g., "billing-lead-db")
6. Select a region (choose closest to you)
7. Click **"Create"**

### Step 2: Get Connection String

After creating the database:
1. Vercel will automatically add these environment variables:
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `DATABASE_URL`

2. Copy the `POSTGRES_PRISMA_URL` value

### Step 3: Update Environment Variables

1. In Vercel dashboard → **Settings** → **Environment Variables**
2. Make sure these are set:
   - `DATABASE_URL` = (use `POSTGRES_PRISMA_URL` value)
   - `POSTGRES_PRISMA_URL` = (already set by Vercel)
   - `POSTGRES_URL_NON_POOLING` = (already set by Vercel)

### Step 4: Push Code Changes

The code has been updated to use PostgreSQL. Just push:

```bash
git add prisma/schema.prisma src/lib/db.ts .env.example QUICK_FIX.md
git commit -m "Migrate to PostgreSQL for Vercel deployment"
git push
```

### Step 5: Initialize Database Schema

After Vercel redeploys with the new code:

**Option A: Via API Endpoint (Easiest)**
1. Visit: `https://your-app.vercel.app/api/migrate`
2. This will test the database connection
3. If successful, the schema will be created automatically on first API call

**Option B: Via Vercel CLI** (Recommended for initial setup)
```bash
npm i -g vercel
vercel login
vercel link  # Link to your project
vercel env pull  # Pull environment variables to .env.local
npx prisma db push  # Push schema to database
```

**Option C: Manual Migration**
The database tables will be created automatically when you first use the app (sync or view leads), as Prisma will create them on-demand.

### Step 6: Verify

1. Visit your live site
2. Try syncing providers
3. Check if leads are loading

## Alternative: Use Supabase (Free)

If you prefer Supabase:

1. Go to [supabase.com](https://supabase.com)
2. Create account and new project
3. Go to Settings → Database
4. Copy the connection string
5. Add to Vercel environment variables as `DATABASE_URL`
6. Push code changes

## Migration Script (Temporary)

If you need to run migrations manually, create this temporary file:

```typescript
// src/app/api/migrate/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test connection
    await db.$connect();
    await db.$disconnect();
    return NextResponse.json({ success: true, message: 'Database connected!' });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

Visit `/api/migrate` to test the connection, then delete this file.

## Local Development

For local development, you can still use SQLite:

1. Create `.env.local`:
   ```
   DATABASE_URL="file:./dev.db"
   ```

2. Update `prisma/schema.prisma` locally to use SQLite:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. Or use PostgreSQL locally too (recommended for consistency)
