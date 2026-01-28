# Local Development Setup

## Quick Setup

### Option 1: Use Prisma Accelerate URL (Same as Production)

1. **Pull environment variables from Vercel** (if you have Vercel CLI):
```bash
vercel env pull
```
This creates `.env.local` with your Vercel environment variables.

2. **Create `.env` file** (Prisma CLI reads `.env` by default, not `.env.local`):
```bash
# Copy from .env.local
cp .env.local .env
```

Or manually create `.env` file in the root directory:
```env
DATABASE_URL="postgres://091e0f3694a26b912f7f384e91b9c640c4e03650f03bf887d229b02e53fe5680:sk_1NCHgsw6tYL2o0UzErglp@db.prisma.io:5432/postgres?sslmode=require"
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza18xTkNIZ3N3NnRZTDJvMFV6RXJnbHAiLCJhcGlfa2V5IjoiMDFLRzJTWlQxNENGR1hHQ1NWQkc5NjgzRTAiLCJ0ZW5hbnRfaWQiOiIwOTFlMGYzNjk0YTI2YjkxMmY3ZjM4NGU5MWI5YzY0MGM0ZTAzNjUwZjAzYmY4ODdkMjI5YjAyZTUzZmU1NjgwIiwiaW50ZXJuYWxfc2VjcmV0IjoiYjQ4OWNmNmItYjBhZC00MDU4LTgwMjUtZDA5MjQzYmEyZmU3In0.efyI3Mroy0ET7shoBU_zsGrXEJW7nvXiPnas9KFZlqI"
```

3. Run:
```bash
npx prisma generate
npx prisma db push
```

### Option 2: Use Local SQLite (Easier for Development)

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

2. Create `.env` file (Prisma CLI reads `.env` by default):
```env
DATABASE_URL="file:./dev.db"
```

3. Run:
```bash
npx prisma generate
npx prisma db push
```

### Option 3: Use Local PostgreSQL

1. Install PostgreSQL locally
2. Create database: `createdb billing_lead_db`
3. Create `.env` file (Prisma CLI reads `.env` by default):
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/billing_lead_db"
```

4. Run:
```bash
npx prisma generate
npx prisma db push
```

## Current Configuration

The app is configured to use:
- **Production**: `DATABASE_URL` (set in Vercel to your Prisma Accelerate URL)
- **Local**: Create `.env.local` with your preferred database URL

## Important Notes

- **`.env` and `.env.local` are both gitignored** (won't be committed)
- **Prisma CLI reads `.env` by default**, not `.env.local`
  - Next.js reads `.env.local` automatically at runtime
  - For Prisma commands (`db push`, `generate`, etc.), you need a `.env` file
  - You can copy `.env.local` to `.env` if you pulled from Vercel
- For production, set `DATABASE_URL` in Vercel environment variables
- The schema uses `DATABASE_URL` which can point to either Accelerate or direct PostgreSQL
