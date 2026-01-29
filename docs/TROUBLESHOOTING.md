# Troubleshooting

## "Invalid email or password" / 401 on login

**Cause:** The app can’t find a user or the password doesn’t match. Usually the **User table or seed hasn’t been applied**.

**Fix:**

1. Apply the schema (creates the `User` table):
   ```bash
   npx prisma db push
   ```
2. Create the admin and user accounts:
   ```bash
   npm run db:seed
   ```
3. Try signing in again with:
   - **Admin:** `admin@billinglead.com` / `Admin123!`
   - **User:** `user1@billinglead.com` / `User123!`

If you use a different port (e.g. 3003), ensure `NEXTAUTH_URL` in `.env.local` matches, e.g. `NEXTAUTH_URL=http://localhost:3003`.

---

## GET http://localhost:3000/ 404 and _next/static/chunks 404

**Cause:** The server responding on port 3000 is **not** your Next.js app. Those 404s mean either:

- Nothing (or a different app) is running on port 3000, or  
- The Next.js dev server is on a **different port** (e.g. 3001).

**Fix:**

1. From the project root run:
   ```bash
   npm run dev
   ```
2. In the terminal, note the URL Next.js prints, e.g.:
   - `Local: http://localhost:3000` or  
   - `Local: http://localhost:3001` (if 3000 was in use).
3. Open **that exact URL** in the browser (e.g. `http://localhost:3001` if it says 3001).
4. To use port 3000, stop any other process using 3000, then run `npm run dev` again.

## favicon.ico 404

Harmless. The app works without it. To remove the 404, add a `favicon.ico` file to the `public/` folder (or use `app/favicon.ico` in Next.js 13+).
