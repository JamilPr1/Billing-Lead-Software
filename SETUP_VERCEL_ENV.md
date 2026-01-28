# Vercel Environment Variables Setup

## Required Environment Variables

Based on your Prisma Accelerate setup, you need to set these in Vercel:

### In Vercel Dashboard → Settings → Environment Variables:

1. **DATABASE_URL** (Required)
   ```
   postgres://091e0f3694a26b912f7f384e91b9c640c4e03650f03bf887d229b02e53fe5680:sk_1NCHgsw6tYL2o0UzErglp@db.prisma.io:5432/postgres?sslmode=require
   ```
   - This is the direct PostgreSQL connection URL
   - Used by Prisma schema

2. **PRISMA_DATABASE_URL** (Optional - for Accelerate features)
   ```
   prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza18xTkNIZ3N3NnRZTDJvMFV6RXJnbHAiLCJhcGlfa2V5IjoiMDFLRzJTWlQxNENGR1hHQ1NWQkc5NjgzRTAiLCJ0ZW5hbnRfaWQiOiIwOTFlMGYzNjk0YTI2YjkxMmY3ZjM4NGU5MWI5YzY0MGM0ZTAzNjUwZjAzYmY4ODdkMjI5YjAyZTUzZmU1NjgwIiwiaW50ZXJuYWxfc2VjcmV0IjoiYjQ4OWNmNmItYjBhZC00MDU4LTgwMjUtZDA5MjQzYmEyZmU3In0.efyI3Mroy0ET7shoBU_zsGrXEJW7nvXiPnas9KFZlqI
   ```
   - This enables Prisma Accelerate features
   - The code will use this if available, otherwise fall back to DATABASE_URL

### Steps:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update `DATABASE_URL` with the direct PostgreSQL URL above
3. Add/Update `PRISMA_DATABASE_URL` with the Accelerate URL above (optional but recommended)
4. Make sure both are enabled for **Production**, **Preview**, and **Development**
5. Click **Save**
6. **Redeploy** your project

## Local Development

Create `.env.local` file in your project root:

```env
DATABASE_URL="postgres://091e0f3694a26b912f7f384e91b9c640c4e03650f03bf887d229b02e53fe5680:sk_1NCHgsw6tYL2o0UzErglp@db.prisma.io:5432/postgres?sslmode=require"
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza18xTkNIZ3N3NnRZTDJvMFV6RXJnbHAiLCJhcGlfa2V5IjoiMDFLRzJTWlQxNENGR1hHQ1NWQkc5NjgzRTAiLCJ0ZW5hbnRfaWQiOiIwOTFlMGYzNjk0YTI2YjkxMmY3ZjM4NGU5MWI5YzY0MGM0ZTAzNjUwZjAzYmY4ODdkMjI5YjAyZTUzZmU1NjgwIiwiaW50ZXJuYWxfc2VjcmV0IjoiYjQ4OWNmNmItYjBhZC00MDU4LTgwMjUtZDA5MjQzYmEyZmU3In0.efyI3Mroy0ET7shoBU_zsGrXEJW7nvXiPnas9KFZlqI"
```

Then run:
```bash
npx prisma generate
npx prisma db push
```

## Verify Setup

After setting environment variables and redeploying:

1. Visit: `https://your-app.vercel.app/api/migrate`
   - Should show: `{"success": true, "message": "Database connected successfully!"}`

2. Visit: `https://your-app.vercel.app/api/init-db`
   - Will check if database tables exist

3. Try syncing providers - should work!
