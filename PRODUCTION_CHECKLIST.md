# Production Deployment Checklist

## ✅ Changes Made for Hostinger Hosting

### 1. Configuration Updates
- ✅ Updated `next.config.js` for production (removed dev-only origins)
- ✅ Fixed Socket.IO client to work without port in production
- ✅ Created production server file (`server.production.js`)
- ✅ Updated package.json with production scripts
- ✅ Enhanced PWA manifest.json

### 2. Files Created
- ✅ `HOSTINGER_DEPLOYMENT.md` - Complete deployment guide
- ✅ `server.production.js` - Production server with Socket.IO
- ✅ `.env.production.example` - Environment variables template
- ✅ `PRODUCTION_CHECKLIST.md` - This file

### 3. Code Changes
- ✅ Socket.IO client now detects production vs development
- ✅ Removed hardcoded localhost references (uses environment variables)
- ✅ PWA configured to work only in production builds

## 📋 Pre-Deployment Checklist

### Environment Variables
Create `.env.production` file with:

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

# Security
SESSION_SECRET="generate-strong-random-string-here"

# App URL (HTTPS required)
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Email (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
FROM_EMAIL="New York Gold Market <your-email@gmail.com>"

# Node Environment
NODE_ENV="production"
```

### Required Files
- [ ] `public/icon-192.png` (192x192 pixels)
- [ ] `public/icon-512.png` (512x512 pixels)
- [ ] `.env.production` (with your actual values)

### Database Setup
- [ ] PostgreSQL database created on Hostinger
- [ ] Database connection string obtained
- [ ] Run migrations: `npm run db:migrate:deploy`
- [ ] Seed initial data: `npm run db:seed` (optional)

### Domain & SSL
- [ ] Domain pointed to Hostinger
- [ ] SSL certificate installed (HTTPS required for PWA)
- [ ] Test SSL: `https://yourdomain.com`

## 🚀 Deployment Steps

1. **Build Application**:
   ```bash
   npm install
   npm run db:generate
   npm run build
   ```

2. **Upload to Hostinger**:
   - Via Git (recommended) or FTP/SFTP
   - See `HOSTINGER_DEPLOYMENT.md` for details

3. **Server Setup**:
   - Install Node.js 18+ or 20+
   - Install dependencies: `npm install --production`
   - Run migrations: `npm run db:migrate:deploy`

4. **Start Server**:
   - Option A: Use PM2: `pm2 start npm --name "ny-gold-market" -- start`
   - Option B: Use Hostinger's Node.js App Manager
   - Option C: Use systemd service (see deployment guide)

5. **Configure Reverse Proxy**:
   - Set up Nginx/Apache to proxy to port 3000
   - Configure WebSocket support for Socket.IO
   - See `HOSTINGER_DEPLOYMENT.md` for Nginx config

## 🔍 Post-Deployment Verification

- [ ] Site loads at `https://yourdomain.com`
- [ ] Login works: `https://yourdomain.com/login`
- [ ] PWA install button appears (Chrome/Edge)
- [ ] Socket.IO connections work (real-time updates)
- [ ] Database operations work (create customer, etc.)
- [ ] Email sending works (test password reset)
- [ ] NFC card URLs work (test scan URL format)

## 🔒 Security Checklist

- [ ] Changed default admin password
- [ ] Strong SESSION_SECRET set (32+ characters)
- [ ] HTTPS/SSL enabled
- [ ] Database uses SSL connection
- [ ] Environment variables not in Git
- [ ] Firewall configured
- [ ] Regular backups scheduled

## 📝 Important Notes

1. **PWA Icons**: Must add `icon-192.png` and `icon-512.png` before deployment
2. **HTTPS Required**: PWA only works with HTTPS
3. **Socket.IO**: Requires WebSocket support in reverse proxy
4. **Database**: Use SSL connection string (`?sslmode=require`)
5. **Port**: Hostinger may assign a different port, check your hosting panel

## 🆘 Troubleshooting

See `HOSTINGER_DEPLOYMENT.md` for detailed troubleshooting steps.

## 📚 Documentation

- `HOSTINGER_DEPLOYMENT.md` - Complete deployment guide
- `.env.production.example` - Environment variables template
- `README.md` - General application documentation

