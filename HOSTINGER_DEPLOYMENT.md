# Hostinger Deployment Guide

This guide will help you deploy your New York Gold Market Transaction Management System to Hostinger.

## Prerequisites

1. **Hostinger Account** with:
   - VPS or Cloud Hosting plan (Node.js support required)
   - PostgreSQL database (or external database service)
   - Domain name with SSL certificate (HTTPS required for PWA)

2. **Database Setup**:
   - Create a PostgreSQL database in Hostinger
   - Note down: host, port, database name, username, password

3. **Domain & SSL**:
   - Point your domain to Hostinger
   - Enable SSL certificate (Let's Encrypt is free)

## Step 1: Prepare Your Code

1. **Update Environment Variables**:
   - Copy `.env.production.example` to `.env.production`
   - Fill in all your production values:
     ```env
     DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
     SESSION_SECRET="your-strong-random-secret"
     NEXT_PUBLIC_APP_URL="https://yourdomain.com"
     SMTP_USER="your-email@gmail.com"
     SMTP_PASS="your-gmail-app-password"
     ```

2. **Add PWA Icons** (Required):
   - Create `public/icon-192.png` (192x192 pixels)
   - Create `public/icon-512.png` (512x512 pixels)
   - These are required for PWA installation

## Step 2: Build Your Application

On your local machine:

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Build for production
npm run build
```

This creates a `.next` folder with the production build.

## Step 3: Upload to Hostinger

### Option A: Using Git (Recommended)

1. **Push to Git Repository**:
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **On Hostinger**:
   - Connect your repository
   - Set build command: `npm run build`
   - Set start command: `npm start`
   - Set Node.js version: 18.x or 20.x

### Option B: Using FTP/SFTP

1. **Upload Files** (exclude these):
   - `.next` (will be rebuilt on server)
   - `node_modules` (will be installed on server)
   - `.env.local` (use `.env.production` instead)
   - `localhost-key.pem` and `localhost.pem` (not needed in production)

2. **Required Files**:
   - All source files (`app/`, `components/`, `lib/`, etc.)
   - `package.json` and `package-lock.json`
   - `next.config.js`
   - `prisma/` folder
   - `public/` folder (including icons)
   - `.env.production` (with your production values)

## Step 4: Server Setup on Hostinger

### SSH into Your Server

```bash
ssh your-username@your-hostinger-ip
```

### Install Node.js (if not pre-installed)

```bash
# Check Node.js version
node --version

# If not installed or wrong version, use nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### Install Dependencies

```bash
cd /path/to/your/app
npm install --production
```

### Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed initial data
npm run db:seed
```

### Build Application

```bash
npm run build
```

## Step 5: Run Production Server

### Option A: Using PM2 (Recommended)

**For Socket.IO support (real-time features):**
```bash
# Install PM2 globally
npm install -g pm2

# Start your app with Socket.IO server
pm2 start npm --name "ny-gold-market" -- run start:server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
```

**Without Socket.IO (if you don't need real-time features):**
```bash
pm2 start npm --name "ny-gold-market" -- start
```

### Option B: Using systemd Service

Create `/etc/systemd/system/ny-gold-market.service`:

```ini
[Unit]
Description=New York Gold Market App
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /path/to/node_modules/.bin/next start
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ny-gold-market
sudo systemctl start ny-gold-market
```

### Option C: Using Hostinger's Node.js App Manager

1. Go to Hostinger Control Panel
2. Navigate to Node.js Apps
3. Create new app:
   - **App Name**: ny-gold-market
   - **Node.js Version**: 18.x or 20.x
   - **App Root**: `/path/to/your/app`
   - **App Startup File**: `node_modules/.bin/next`
   - **App Startup Command**: `start` (or `start:server` for Socket.IO support)
   - **Port**: 3000 (or as assigned by Hostinger)
   
   **Note**: Use `start:server` command if you need Socket.IO real-time features (metal prices, transaction updates). Otherwise, use `start` for standard Next.js server.

## Step 6: Configure Reverse Proxy (Nginx)

If Hostinger doesn't handle this automatically, configure Nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Step 7: Verify Deployment

1. **Visit Your Domain**:
   - Go to `https://yourdomain.com`
   - Should see your landing page

2. **Test Login**:
   - Go to `https://yourdomain.com/login`
   - Login with admin credentials

3. **Test PWA Installation**:
   - Visit site on mobile/tablet
   - Look for "Add to Home Screen" prompt
   - Should install as app

4. **Check Logs**:
   ```bash
   # PM2 logs
   pm2 logs ny-gold-market
   
   # Or systemd logs
   sudo journalctl -u ny-gold-market -f
   ```

## Step 8: Post-Deployment Tasks

1. **Change Default Passwords**:
   - Login as admin
   - Go to `/admin/users`
   - Change default admin password

2. **Set Daily Prices**:
   - Go to `/admin/prices`
   - Enter today's metal prices

3. **Test NFC Cards**:
   - Create a test customer
   - Issue an NFC card
   - Verify the scan URL works

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL

# Check Prisma connection
npx prisma db pull
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### PWA Not Working

- Ensure you're accessing via HTTPS
- Check that icons exist: `public/icon-192.png` and `public/icon-512.png`
- Verify manifest.json is accessible: `https://yourdomain.com/manifest.json`
- Check browser console for errors

### Socket.IO Not Connecting

- Verify WebSocket proxy configuration in Nginx
- Check that Socket.IO server is running
- Test connection: `https://yourdomain.com/socket.io/`

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong SESSION_SECRET
- [ ] Using HTTPS (SSL certificate installed)
- [ ] Database uses SSL connection
- [ ] Environment variables are secure (not in git)
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular backups configured

## Maintenance

### Update Application

```bash
git pull origin main
npm install
npm run db:generate
npm run build
pm2 restart ny-gold-market
```

### Database Backups

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup_20240220.sql
```

## Support

For Hostinger-specific issues, contact Hostinger support.
For application issues, check the logs and error messages.

