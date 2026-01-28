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

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and configure the build
4. Add build command: `npm run build`
5. Add environment variables if needed
6. Deploy!

**Note**: For production, consider migrating from SQLite to a cloud database (PostgreSQL, MySQL) as SQLite has limitations on serverless platforms like Vercel.

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
