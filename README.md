# NFC Membership CRM & Precious Metals Transaction System

A full-stack web app for managing members, issuing NFC membership cards, and running precious-metals transactions (scrap and melt) with live metal prices and real-time updates. Built for staff and admins who need a single place to handle customers, cards, pricing, and transactions from any device.

---

## What it does

**Members & cards**  
You register customers (individuals or businesses), then issue them NFC membership cards. Each card is linked to that customer. Staff can look up a member by scanning their card or by entering a card ID manually, then start a transaction for them right away.

**Card portal (issue, write, lock)**  
From a customer’s page, **Issue New Card** opens the Card Portal. You select the customer (or they’re pre-selected), issue a new card, then **write the scan URL to the physical NFC card** (tap card on device when prompted; Web NFC on Android Chrome over HTTPS). Optionally **lock** the card so only this app and authorized users (admin or users with “Can access locked cards”) can scan it to see or edit data—no one else can use it. Save and the card is ready. The URL written to the tag uses a **scan slug** (not the internal token), so the token never appears in the URL or on the card.

**Locked cards & security**  
When a card is locked, only administrators or users with **Can access locked cards** can scan it and see customer/transaction data. Everyone else sees a “Card locked” screen with no data. Only this app and authorized users can scan, view, or edit data; the card cannot be used elsewhere to view or change data. Card **edit** (status, lock) is admin-only via the customer’s membership cards section.

**Transactions**  
Every transaction is either **scrap** or **melt**. Each has its own flow: you add line items (gold, silver, platinum with purity and weight in DWT), and the app applies the day’s metal prices and your configured percentages to compute totals. You can switch between scrap and melt in one continuous scroll. When you’re done, you print a receipt (or batch-print several). Transactions stay in an “open” state until printed or voided, and admins can view and manage them in one list.

**Pricing**  
Admins set **daily prices** (gold, silver, platinum per ounce) and scrap/melt percentage multipliers. The dashboard and transaction screens show a live metal ticker (e.g. TradingView) so staff always see current market context. Prices and transaction totals can also be pushed in real time over the app using WebSockets, so multiple devices stay in sync.

**Roles & permissions**  
- **Staff** – Dashboard, customers, issue cards (if **Can issue NFC cards**), scan cards, run transactions, print.  
- **Admin** – Everything staff can do, plus: manage users, set daily prices, view all transactions, reports, analytics, edit/lock cards, and grant **Can issue NFC cards** and **Can access locked cards** to users.

**Auth & security**  
Login is email + password. Optional OTP and password reset (forgot password, reset via link or OTP). Session-based auth protects all staff/admin routes. Profile page lets users update their info and profile picture.

**Reports & analytics**  
Admins get reports and an analytics dashboard (e.g. charts and summaries) to see activity and trends over time.

**PWA & mobile**  
The app can be installed as a PWA and used on phones/tablets. NFC scanning works in supported mobile browsers (e.g. Android Chrome) via the Web NFC API where available; otherwise staff use manual card ID entry. For local HTTPS development (e.g. NFC or network access), run `npm run setup:https` then `npm run dev:https`.

---

## Tech stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Radix UI, Recharts, jsPDF (for printing).
- **Backend:** Next.js API routes, Prisma, PostgreSQL.
- **Real time:** Socket.io (server + client) for live prices and transaction updates.
- **Auth:** Custom session-based auth (cookies), bcrypt for passwords, optional OTP and reset flows.
- **Deployment:** Standard Node/Next.js build; Prisma for DB; env-based config (e.g. `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`).

---

## Getting started

1. **Clone and install**
   - Clone the repo and run `npm install`.
   - Copy `.env.example` to `.env` (or create `.env`) and set at least `DATABASE_URL` (PostgreSQL) and any auth/email/OTP variables your setup uses. Set `NEXT_PUBLIC_APP_URL` to your app’s public URL (e.g. `https://yourdomain.com`) so scan links and PWA work correctly.

2. **Database**
   - Run `npx prisma generate` and `npx prisma db push` (or `prisma migrate deploy` in production).
   - Optionally run `npm run db:seed` if you have a seed script for initial data.

3. **Run the app**
   - Development: `npm run dev`.
   - Local HTTPS (e.g. for Web NFC or network access): `npm run setup:https` once, then `npm run dev:https`.
   - Production build: `npm run build` then `npm start` (or your host’s equivalent). Use `npm run start:deploy` if you need to run migrations before start.

4. **First login**  
   Use the credentials from your seed or the first user you create. Staff and admin roles and permissions (e.g. Can issue NFC cards, Can access locked cards) are stored in the database and control access to dashboard, admin panel, reports, and card actions.

---

## Project structure (high level)

- `app/` – Next.js App Router: pages (dashboard, login, customers, scan, cards/portal, admin, reports, print, etc.) and API routes (auth, customers, cards, transactions, prices, admin, etc.).
- `components/` – React components: dashboard, customer forms, customer cards (issue, edit, lock), card portal, scan/NFC UI, transaction/pricing tables, print views, admin forms, reports, analytics.
- `lib/` – Shared logic: DB client (Prisma), auth helpers, pricing, email, Socket server/client setup, utilities.
- `hooks/` – React hooks (e.g. socket subscriptions for prices and transactions).
- `prisma/` – Schema and migrations for users, customers, membership cards (token, scanSlug, locked), transactions, line items, daily prices, documents, audit logs.

---

## Features in short

- Customer management (create, edit, list; business vs individual).
- NFC membership cards: issue per customer; **Card Portal** to issue, write URL to NFC (Web NFC), and lock; scan or manual ID to start a transaction.
- **Scan slug in URLs** – card URLs use a public slug, not the internal token; token stays server-side.
- **Locked cards** – only this app and authorized users can scan/see/edit; admin can edit card status and lock from customer page.
- Scrap and melt transactions with line items (metal type, purity, DWT, computed totals).
- Daily metal prices and scrap/melt percentages (admin); live ticker on dashboard and transaction screen.
- Real-time updates via Socket.io for prices and transaction state.
- Print single or batch transaction receipts (PDF).
- User management and role-based access (staff vs admin; Can issue cards, Can access locked cards).
- Reports and analytics dashboard for admins.
- Optional PWA and Web NFC support for mobile use; HTTPS dev via `dev:https`.

---

## License

Private / unlicensed unless otherwise specified in the repo. Use and reuse according to your own terms.
