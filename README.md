# New York Gold Market - Precious Metals Transaction System

A premium web application for New York Gold Market managing scrap precious metals buying operations with NFC-enabled membership cards and real-time transaction management.

## Features

- **NFC Card System**: Token-based membership cards (no PII on cards)
- **Dual Transaction Types**: Separate SCRAP and MELT transactions per customer
- **Three Metal Types**: Gold, Silver, and Platinum with purity-based pricing
- **Real-time Pricing**: Daily spot price management with transaction snapshots
- **4x6 Label Printing**: Professional print-ready transaction receipts
- **Premium UI**: Modern, responsive design with flawless light/dark mode support
- **Customer Management**: Full CRUD operations with business verification
- **Admin Panel**: Daily price management and user administration

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + shadcn/ui (Radix UI)
- **Theme**: next-themes for light/dark/system toggle
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Cookie-based session management
- **Icons**: lucide-react

## Prerequisites

- Node.js 18+ and npm/yarn
- Docker and Docker Compose (for local PostgreSQL)
- NFC card writer (for encoding cards)

## Setup Instructions

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Database Setup

Start PostgreSQL using Docker Compose:

```bash
docker-compose up -d
```

This will start a PostgreSQL container on port 5432.

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nfc_crm?schema=public"

# Auth
SESSION_SECRET="change-this-to-a-random-secret-in-production"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important**: Change `SESSION_SECRET` to a random string in production!

### 4. Database Migration

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 5. Seed Database

Create default admin user and sample data:

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Staff user: `staff@example.com` / `staff123`
- Sample daily prices for today

### 6. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## NFC Card Encoding

### Card Requirements

- **Type**: NTAG216 PVC cards (or compatible)
- **Format**: NDEF URL record

### Encoding Steps

1. Issue a card through the admin panel (`/customers/[id]`)
2. Copy the NDEF URL shown (e.g., `https://your-domain.com/scan/<token>`)
3. Use an NFC writer app (e.g., NFC Tools on Android/iOS) to write the URL to the card
4. Test by tapping the card on a device that opens URLs automatically

### Manual Token Entry

If NFC scanning is not available, staff can manually enter the token at `/scan`

## Application Structure

### Pages

- `/` - Public landing page
- `/login` - Staff login
- `/dashboard` - Staff dashboard with overview
- `/customers` - Customer list with search
- `/customers/new` - New customer registration
- `/customers/[id]` - Customer details and card issuance
- `/scan/[token]` - Main transaction page (accessed via NFC card)
- `/scan` - Manual token entry
- `/admin/prices` - Daily price management (admin only)
- `/admin/users` - User management (admin only)
- `/print/[id]` - 4x6 label print view

### Key Components

- **Scan Page**: Two-level navigation (SCRAP/MELT → GOLD/SILVER/PLATINUM)
- **Pricing Tables**: Real-time DWT input with autosave (400ms debounce)
- **Print Views**: Optimized 4x6 inch label layout

## Pricing Formulas

All formulas are centralized in `/lib/pricing.ts`:

### Gold
- Formula: `(purityValue - 0.50) * (goldPriceToday / 24) * 99.9 / 20 / 100`
- Purities: 24K, 22K, 21K, 18K, 16K, 14K, 13K, 12K, 10K, 9K

### Silver
- 925: `823.5 * silverPriceToday / 1000`
- 900: `821.25 * silverPriceToday / 1000`
- 800: `730 * silverPriceToday / 1000`

### Platinum
- Formula: `(platinumPriceToday * (purity/1000)) * ((85 / DWT) / 100)`
- Purities: 950, 900
- Handles DWT=0 safely

## Development

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations (for production)
npm run db:migrate

# Seed database
npm run db:seed
```

### Build for Production

```bash
npm run build
npm start
```

## Security Notes

- **Session Management**: Uses HTTP-only cookies (simple implementation for MVP)
- **Token Generation**: 64-character hex tokens using crypto random
- **Password Hashing**: bcrypt with 10 rounds
- **Data Privacy**: No PII stored on NFC cards (tokens only)

## Production Deployment

1. Set up PostgreSQL database (managed service recommended)
2. Update `DATABASE_URL` in environment variables
3. Set strong `SESSION_SECRET`
4. Update `NEXT_PUBLIC_APP_URL` to your domain
5. Build and deploy using your hosting platform (Vercel, Railway, etc.)

## Troubleshooting

### Database Connection Issues

- Ensure Docker container is running: `docker-compose ps`
- Check DATABASE_URL format matches your setup
- Verify PostgreSQL is accessible on port 5432

### NFC Card Not Working

- Verify URL format: `https://your-domain.com/scan/<token>`
- Test manual token entry at `/scan`
- Check card is NTAG216 compatible
- Ensure device supports automatic URL opening

### Pricing Calculations

- Verify daily prices are set in `/admin/prices`
- Check formulas in `/lib/pricing.ts`
- Ensure transaction has price snapshots

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.

