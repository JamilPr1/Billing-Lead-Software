# Vercel Setup - Database Configuration

## ⚠️ Current Issue

Your app is deployed but **DATABASE_URL is not configured**. This is why you're seeing 500 errors.

## Quick Fix (5 minutes)

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your **Billing-Lead-Software** project
3. Click the **"Storage"** tab (in the top navigation)
4. Click **"Create Database"**
5. Select **"Postgres"**
6. Name it: `billing-lead-db` (or any name you prefer)
7. Select region: **Washington, D.C. (iad1)** or closest to you
8. Click **"Create"**

### Step 2: Verify Environment Variables

After creating the database, Vercel automatically adds these:

1. Go to **Settings** → **Environment Variables**
2. You should see:
   - ✅ `POSTGRES_PRISMA_URL` (auto-added)
   - ✅ `POSTGRES_URL_NON_POOLING` (auto-added)
   - ❓ `DATABASE_URL` (may need to add manually)

### Step 3: Add DATABASE_URL (if missing)

If `DATABASE_URL` is not automatically added:

1. In **Environment Variables**, click **"Add New"**
2. Name: `DATABASE_URL`
3. Value: Copy the value from `POSTGRES_PRISMA_URL`
4. Environment: Select **Production, Preview, Development** (all)
5. Click **"Save"**

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click the **"⋯"** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (~30 seconds)

### Step 5: Test Database Connection

1. Visit: `https://your-app.vercel.app/api/migrate`
2. You should see: `{"success": true, "message": "Database connected successfully!"}`

### Step 6: Initialize Database Schema

The database tables will be created automatically when you:
- **Sync providers** for the first time, OR
- **Visit the leads page**

## Verify It's Working

1. ✅ Visit `/api/migrate` - should show success
2. ✅ Try syncing providers - should work without 500 errors
3. ✅ Visit "View Saved Leads" - should load (may be empty initially)

## Troubleshooting

### Still seeing 500 errors?

1. **Check Environment Variables**:
   - Go to Settings → Environment Variables
   - Verify `DATABASE_URL` exists and has a value
   - Make sure it's enabled for **Production** environment

2. **Check Deployment Logs**:
   - Go to Deployments → Click on latest deployment
   - Check "Function Logs" tab
   - Look for database connection errors

3. **Test Connection**:
   - Visit `/api/migrate`
   - Check the response - it will tell you what's wrong

### Database connection timeout?

- Make sure your database region matches your Vercel region
- Check that the database is not paused (Vercel Postgres can pause on free tier)

### Still having issues?

The error message will tell you exactly what's wrong. Common issues:
- `DATABASE_URL not found` → Environment variable not set
- `Connection refused` → Database not created or wrong URL
- `Authentication failed` → Wrong credentials in connection string

## Alternative: Use Supabase (Free)

If Vercel Postgres doesn't work for you:

1. Go to [supabase.com](https://supabase.com)
2. Create account and new project
3. Go to **Settings** → **Database**
4. Copy the **Connection String** (URI format)
5. Add to Vercel as `DATABASE_URL` environment variable
6. Redeploy
