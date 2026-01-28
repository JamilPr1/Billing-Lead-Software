# Billing Lead Software

A modern billing lead management system for healthcare providers, integrating with the NPPES API to fetch and manage provider data for cold calling teams.

## Features

- 🔄 **Sync Providers**: Fetch healthcare providers from NPPES API by specialty
- 📋 **Lead Management**: Save, track, and manage leads with status updates
- 📊 **List View**: Compact table view for efficient browsing
- 💾 **Duplicate Prevention**: Automatically checks for duplicates when saving leads
- 📥 **CSV Export**: Download saved leads as CSV files
- 🎯 **Specialty Filtering**: Search by multiple medical specialties:
  - Nurse Practitioners
  - Internal Medicine
  - Pain Management
  - General Physicians
  - Family Medicine
  - Orthopaedic
  - Medical Officer
  - Medical Director

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Database**: SQLite (via Prisma)
- **Styling**: CSS
- **API**: NPPES Registry API v2.1

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JamilPr1/Billing-Lead-Software.git
cd Billing-Lead-Software
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

#### Quick Deploy

1. **Push to GitHub** (Already done ✅)
   - Repository: https://github.com/JamilPr1/Billing-Lead-Software

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import the repository: `JamilPr1/Billing-Lead-Software`
   - Vercel will auto-detect Next.js settings
   - Click "Deploy"

3. **Build Settings** (Auto-configured):
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Environment Variables** (if needed):
   - No environment variables required for basic setup

5. **Post-Deploy**:
   - After deployment, run database migrations:
   ```bash
   # In Vercel deployment logs or via CLI
   npx prisma generate
   npx prisma db push
   ```

#### ⚠️ Important: Database Considerations

**SQLite Limitation**: SQLite uses file-based storage which doesn't persist well on Vercel's serverless platform. Each serverless function gets a fresh filesystem.

**Recommended Solutions**:

1. **Use Vercel Postgres** (Recommended):
   - Add Vercel Postgres in your Vercel dashboard
   - Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("POSTGRES_PRISMA_URL")
   }
   ```
   - Run migrations: `npx prisma migrate deploy`

2. **Use Other Cloud Databases**:
   - **Supabase** (Free tier available)
   - **PlanetScale** (MySQL)
   - **Neon** (PostgreSQL)
   - **Railway** (PostgreSQL)

3. **For Development/Testing**:
   - SQLite works fine locally
   - Consider using Vercel's preview deployments for testing

#### Manual Deployment via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── leads/             # Leads page
│   │   └── page.tsx           # Main page
│   ├── components/            # React components
│   └── lib/                   # Utilities and API clients
└── public/                     # Static assets
```

## API Routes

- `POST /api/sync` - Sync providers from NPPES API
- `GET /api/providers` - Get paginated providers list
- `POST /api/providers/save-all` - Save all providers as leads
- `GET /api/leads` - Get saved leads
- `GET /api/leads/export` - Export leads as CSV
- `PATCH /api/leads/[id]` - Update lead status

## License

Private - All rights reserved
