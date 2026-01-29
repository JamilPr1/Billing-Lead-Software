# Authentication Setup

## Overview

- **Login page** at `/login` — all users must sign in before accessing the app.
- **Admin** (1 account): full access — Sync from NPPES, Import/Upload, Saved Leads.
- **Users** (5 accounts): access only to **Saved Leads** (view, edit, export).

## Environment Variables

Add to `.env` or `.env.local`:

```env
NEXTAUTH_SECRET="your-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret:

```bash
openssl rand -base64 32
```

For production, set `NEXTAUTH_URL` to your app URL (e.g. `https://your-app.vercel.app`).

## Database: User Table & Seed

1. Apply schema (creates `User` table):

   ```bash
   npx prisma db push
   ```

2. Seed admin + 5 users (stop the dev server first if you get file lock errors):

   ```bash
   npm run db:seed
   ```

## Default Accounts

| Role  | Email                     | Password  |
|-------|---------------------------|-----------|
| Admin | admin@billinglead.com     | Admin123! |
| User  | user1@billinglead.com     | User123!  |
| User  | user2@billinglead.com     | User123!  |
| User  | user3@billinglead.com     | User123!  |
| User  | user4@billinglead.com     | User123!  |
| User  | user5@billinglead.com     | User123!  |

**Change these passwords in production.**

## Behavior

- Unauthenticated visitors to `/` or `/leads` are redirected to `/login`.
- After login, **admin** goes to Home (full dashboard); **users** go to Saved Leads.
- **Users** cannot open Home; middleware redirects them to `/leads`.
- Sync, Import, and Save-all providers are **admin-only** (API returns 403 for users).
- Leads list, edit, and export are available to **admin** and **users**.
