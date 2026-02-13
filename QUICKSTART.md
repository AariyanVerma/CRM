# Quick Start Guide

## First Time Setup (5 minutes)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup Database (choose one option):**

   **Option A: Use Cloud Database (Neon, Supabase, etc.) - Recommended**
   - Skip Docker installation
   - Copy your database connection string from your Neon dashboard
   - Use it in step 3 below

   **Option B: Use Local PostgreSQL with Docker**
   ```bash
   docker-compose up -d
   ```

3. **Create `.env` file:**
   ```env
   # For Neon/Cloud Database (paste your connection string from Neon dashboard):
   DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   
   # OR for Local Docker PostgreSQL:
   # DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nfc_crm?schema=public"
   
   SESSION_SECRET="your-random-secret-here"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Setup database:**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Login:**
   - Go to http://localhost:3000
   - Click "Staff Login"
   - Email: `admin@example.com`
   - Password: `admin123`

## First Steps After Login

1. **Set Today's Prices** (Required before transactions):
   - Go to `/admin/prices`
   - Enter gold, silver, and platinum spot prices
   - Click "Save Prices"

2. **Create a Customer:**
   - Go to `/customers/new`
   - Fill in customer information
   - Click "Create Customer"

3. **Issue NFC Card:**
   - Go to customer detail page
   - Click "Issue New Card"
   - Copy the NDEF URL shown
   - Write it to an NFC card using NFC Tools app

4. **Start a Transaction:**
   - Tap the NFC card on a device (or manually enter token at `/scan`)
   - The scan page will open automatically
   - Enter DWT values for each purity
   - Click "Print" when ready

## Key Features

- **Two Transaction Types**: Switch between SCRAP and MELT tabs
- **Three Metal Types**: Switch between GOLD, SILVER, PLATINUM tabs
- **Auto-save**: DWT values save automatically after 400ms
- **Print**: Generate 4x6 labels for each transaction type
- **Theme Toggle**: Top-right corner (Light/Dark/System)

## NFC Card Encoding

1. Issue card through customer detail page
2. Copy the NDEF URL (e.g., `https://your-domain.com/scan/abc123...`)
3. Use NFC Tools app to write URL to card
4. Test by tapping card on device

## Troubleshooting

**Database connection error:**
- If using Docker: Ensure container is running: `docker-compose ps`
- If using cloud database: Verify connection string is correct and includes SSL parameters
- Check DATABASE_URL in `.env` matches your database setup

**No prices error:**
- Set daily prices in `/admin/prices` first

**Card not found:**
- Verify card token matches database
- Check card status is ACTIVE

