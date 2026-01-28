# Deployment Guide for Vercel

## Current Status

✅ **Code pushed to GitHub**: https://github.com/JamilPr1/Billing-Lead-Software

## Step-by-Step Vercel Deployment

### 1. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select repository: **JamilPr1/Billing-Lead-Software**
4. Vercel will auto-detect Next.js settings
5. Click **"Deploy"**

### 2. Database Setup (IMPORTANT)

**⚠️ SQLite Limitation**: SQLite files don't persist on Vercel's serverless platform. You need to migrate to a cloud database.

#### Option A: Vercel Postgres (Easiest)

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **"Create Database"** → Select **Postgres**
3. After creation, you'll get connection strings
4. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("POSTGRES_PRISMA_URL")
   }
   ```
5. Add environment variable in Vercel:
   - Go to **Settings** → **Environment Variables**
   - Add `POSTGRES_PRISMA_URL` (auto-added by Vercel)
   - Add `POSTGRES_URL_NON_POOLING` (auto-added by Vercel)
6. Push changes and redeploy:
   ```bash
   git add prisma/schema.prisma
   git commit -m "Migrate to PostgreSQL"
   git push
   ```
7. Run migrations in Vercel deployment:
   - Add build command: `npx prisma generate && npm run build`
   - Or use Vercel CLI: `vercel env pull` then `npx prisma migrate deploy`

#### Option B: Supabase (Free Tier)

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get connection string from Settings → Database
4. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Add `DATABASE_URL` environment variable in Vercel
6. Push and deploy

#### Option C: Other Options

- **PlanetScale** (MySQL) - Free tier available
- **Neon** (PostgreSQL) - Free tier available  
- **Railway** (PostgreSQL) - Free tier available

### 3. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL` or `POSTGRES_PRISMA_URL` (depending on your database choice)
- `POSTGRES_URL_NON_POOLING` (if using Vercel Postgres)

### 4. Build Configuration

Vercel should auto-detect, but verify:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` or `npx prisma generate && npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

### 5. Post-Deployment

After first deployment:

1. Visit your Vercel URL
2. Test the sync functionality
3. Check that database operations work
4. Monitor logs in Vercel dashboard

## Migrating Existing Data

If you have data in your local SQLite database:

1. Export data:
   ```bash
   npx prisma studio
   # Export data manually or use a script
   ```

2. After setting up cloud database, import data:
   ```bash
   # Use Prisma Studio or write a migration script
   ```

## Troubleshooting

### Database Connection Issues

- Verify environment variables are set correctly
- Check that database is accessible from Vercel's IP ranges
- Review Vercel deployment logs for errors

### Build Failures

- Ensure `prisma generate` runs before build
- Check Node.js version (should be 18+)
- Review build logs in Vercel dashboard

### Runtime Errors

- Check function logs in Vercel dashboard
- Verify Prisma Client is generated
- Ensure database migrations are applied

## Quick Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Pull environment variables
vercel env pull
```

## Support

For issues:
1. Check Vercel deployment logs
2. Review GitHub repository issues
3. Check Prisma documentation for database-specific issues
