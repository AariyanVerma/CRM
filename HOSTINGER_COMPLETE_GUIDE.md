# Complete Step-by-Step Guide: Hosting on Hostinger

This is a **complete, detailed guide** covering every single step to host your New York Gold Market app on Hostinger.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before starting, make sure you have:
- [ ] Hostinger account with VPS or Cloud Hosting (Node.js support)
- [ ] Domain name (or subdomain)
- [ ] PostgreSQL database (Neon PostgreSQL recommended, or Hostinger database)
- [ ] Gmail account for sending emails
- [ ] Your app code ready

---

## PART 1: PREPARE YOUR CODE LOCALLY

### Step 1.1: Create Production Environment File

1. **Open your project folder** in your code editor

2. **Create a new file** named `.env.production` in the root folder (same level as `package.json`)

3. **Copy and paste this template**, then fill in YOUR values:

```env
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
SESSION_SECRET="your-very-long-random-secret-here-minimum-32-characters"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
FROM_EMAIL="New York Gold Market <your-email@gmail.com>"
NODE_ENV="production"
PORT="3000"
```

4. **Fill in each value** (see `ENV_PRODUCTION_GUIDE.md` for details on where to get each)

5. **Save the file**

### Step 1.2: Add PWA Icons (Required)

1. **Create or resize your logo** to these sizes:
   - `icon-192.png` - 192 pixels × 192 pixels
   - `icon-512.png` - 512 pixels × 512 pixels

2. **Save both files** in the `public` folder:
   ```
   public/
   ├── icon-192.png
   ├── icon-512.png
   └── logo.png
   ```

3. **Verify files exist**:
   - Open `public` folder
   - You should see both icon files

### Step 1.3: Test Build Locally (Optional but Recommended)

1. **Open terminal** in your project folder

2. **Run these commands**:
   ```bash
   npm install
   npm run db:generate
   npm run build
   ```

3. **If build succeeds**, you're ready! If errors occur, fix them first.

4. **Note**: You don't need to run `npm start` locally - we'll do that on Hostinger

---

## PART 2: SETUP DATABASE

**You have 2 options: Use Neon PostgreSQL (Recommended) OR Hostinger Database**

---

### OPTION A: Use Neon PostgreSQL Database (Recommended) ⭐

**Why use Neon?**
- ✅ Free tier available
- ✅ Better for Node.js apps
- ✅ Automatic backups
- ✅ Easy to manage
- ✅ Works great with Hostinger

#### Step 2A.1: Get Your Neon Database URL

1. **Go to**: https://neon.tech (or your Neon dashboard)
2. **Login** to your Neon account
3. **Select your project** (or create a new one)
4. **Click** on your database
5. **Go to** "Connection Details" or "Connection String"
6. **Copy the connection string** - it looks like:
   ```
   postgresql://username:password@host.neon.tech/database?sslmode=require
   ```
   
   **Example**:
   ```
   postgresql://user:pass@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

7. **That's your DATABASE_URL!** Copy it - you'll use it in `.env.production`

#### Step 2A.2: Verify Neon Database is Ready

1. **Your Neon database should already be set up**
2. **Make sure** the connection string includes `?sslmode=require`
3. **Test connection** (optional): You can test it later when we run migrations

**✅ Done! Skip to PART 3 if using Neon.**

---

### OPTION B: Use Hostinger PostgreSQL Database

**Note**: Not all Hostinger plans include PostgreSQL. If you don't see database options, use Neon (Option A) instead.

#### Step 2B.1: Find Database Option in Hostinger

**Where to look:**
1. **In Hostinger Control Panel** (hpanel.hostinger.com)
2. **Look for**:
   - **"Databases"** section
   - **"PostgreSQL"** option
   - **"Database Management"**
   - **"phpPgAdmin"** (older interface)

**If you can't find it:**
- Your hosting plan might not include PostgreSQL
- You might need to upgrade to VPS or Cloud Hosting
- **Solution**: Use Neon PostgreSQL instead (Option A above) - it's free and works perfectly!

#### Step 2B.2: Create PostgreSQL Database (If Available)

1. **Click** "Create Database" or "Add Database"
2. **Fill in**:
   - **Database Name**: `goldmarket` (or your choice)
   - **Username**: (auto-generated or choose)
   - **Password**: Create a strong password (save it!)
3. **Click** "Create" or "Add"
4. **Wait** for database to be created (30-60 seconds)

#### Step 2B.3: Get Database Connection Details

1. **Find your database** in the list
2. **Click** on it or click "Manage"
3. **Note down** these details:
   - **Host**: (e.g., `postgres.hostinger.com` or an IP)
   - **Port**: Usually `5432`
   - **Database Name**: (what you created)
   - **Username**: (what you set)
   - **Password**: (what you set)

4. **Create your DATABASE_URL**:
   ```
   postgresql://username:password@host:5432/database?sslmode=require
   ```
   
   **Example**:
   ```
   postgresql://u123456789:MyPass123@postgres.hostinger.com:5432/u123456789_goldmarket?sslmode=require
   ```

5. **Copy this DATABASE_URL** - you'll need it in `.env.production`

---

### Step 2.4: Add DATABASE_URL to .env.production

**Regardless of which option you chose**, add your DATABASE_URL to `.env.production`:

1. **Open** `.env.production` file (you created this in Part 1)
2. **Find** the line: `DATABASE_URL="..."`
3. **Replace** with your actual connection string:

   **If using Neon**:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

   **If using Hostinger**:
   ```env
   DATABASE_URL="postgresql://username:password@postgres.hostinger.com:5432/database?sslmode=require"
   ```

4. **Save** the file

**✅ Database setup complete!**

---

## PART 3: SETUP DOMAIN & SSL

### Step 3.1: Point Domain to Hostinger

1. **In Hostinger Control Panel**, go to **Domains**
2. **Find your domain** or add it
3. **If domain is already with Hostinger**: It's automatically configured
4. **If domain is elsewhere**: 
   - Go to your domain registrar
   - Update DNS nameservers to Hostinger's:
     - `ns1.dns-parking.com`
     - `ns2.dns-parking.com`
   - Wait 24-48 hours for DNS propagation

### Step 3.2: Install SSL Certificate

1. **In Hostinger Control Panel**, go to **SSL**
2. **Find your domain** in the list
3. **Click** "Install SSL" or "Activate SSL"
4. **Select** "Let's Encrypt" (free)
5. **Click** "Install" or "Activate"
6. **Wait** 5-10 minutes for SSL to activate
7. **Verify**: Visit `https://yourdomain.com` - should show a lock icon

---

## PART 4: UPLOAD YOUR CODE TO HOSTINGER

### Step 4.1: Access Hostinger File Manager

**Option A: Via Hostinger Control Panel (Easier)**
1. **Login** to Hostinger Control Panel
2. **Go to**: **Files** → **File Manager**
3. **Navigate** to your domain's folder (usually `public_html` or `domains/yourdomain.com`)

**Option B: Via FTP/SFTP (More Control)**
1. **In Hostinger Control Panel**, go to **FTP Accounts**
2. **Note down**:
   - **FTP Host**: (e.g., `ftp.yourdomain.com`)
   - **FTP Username**: (your username)
   - **FTP Password**: (your password)
3. **Use FTP client** (FileZilla, WinSCP, etc.)
4. **Connect** using the credentials above

### Step 4.2: Create App Directory

1. **In File Manager or FTP**, navigate to your domain root
2. **Create a new folder** named `app` (or `goldmarket` - your choice)
3. **This is where your app will live**

### Step 4.3: Upload Your Files

**Files to Upload:**
- ✅ All folders: `app/`, `components/`, `lib/`, `prisma/`, `public/`, `types/`
- ✅ All config files: `package.json`, `package-lock.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- ✅ `.env.production` (your environment file)
- ✅ `server.production.js` (production server)
- ✅ `.gitignore`, `README.md` (optional)

**Files to EXCLUDE:**
- ❌ `node_modules/` (will install on server)
- ❌ `.next/` (will build on server)
- ❌ `.env.local` (use `.env.production` instead)
- ❌ `localhost-key.pem`, `localhost.pem` (not needed)

**Upload Methods:**

**Method 1: Via File Manager**
1. **Select all files** (except excluded ones)
2. **Compress** into a ZIP file
3. **Upload** ZIP to Hostinger File Manager
4. **Extract** the ZIP file in your app folder

**Method 2: Via FTP**
1. **Connect** with FTP client
2. **Navigate** to your app folder
3. **Drag and drop** all files
4. **Wait** for upload to complete

**Method 3: Via Git (Recommended if you know Git)**
1. **Push** your code to GitHub/GitLab
2. **In Hostinger**, use Git deployment feature
3. **Clone** your repository
4. **This is more advanced** - use File Manager or FTP if unsure

### Step 4.4: Verify Files Uploaded

1. **Check** that these folders exist:
   - `app/`
   - `components/`
   - `lib/`
   - `prisma/`
   - `public/`

2. **Check** that these files exist:
   - `package.json`
   - `next.config.js`
   - `.env.production`

---

## PART 5: SETUP NODE.JS ON HOSTINGER

### Step 5.1: Access SSH Terminal

1. **In Hostinger Control Panel**, go to **SSH Access**
2. **Enable SSH** if not already enabled
3. **Note down**:
   - **SSH Host**: (e.g., `ssh.yourdomain.com`)
   - **SSH Port**: Usually `22`
   - **SSH Username**: (your username)
   - **SSH Password**: (your password)

4. **Connect via SSH**:
   - **Windows**: Use PuTTY or Windows Terminal
   - **Mac/Linux**: Use Terminal app
   - **Command**: `ssh username@ssh.yourdomain.com`

### Step 5.2: Install Node.js

1. **Connect via SSH** (see Step 5.1)

2. **Check if Node.js is installed**:
   ```bash
   node --version
   ```

3. **If Node.js is NOT installed or wrong version**:

   **Install using NVM (Node Version Manager)**:
   ```bash
   # Download and install NVM
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Reload shell configuration
   source ~/.bashrc
   
   # Install Node.js 20 (LTS version)
   nvm install 20
   nvm use 20
   
   # Verify installation
   node --version
   npm --version
   ```

4. **If Node.js IS installed** (version 18+), skip to next step

### Step 5.3: Navigate to Your App Directory

1. **In SSH terminal**, navigate to your app folder:
   ```bash
   cd ~/domains/yourdomain.com/app
   # OR
   cd ~/public_html/app
   # OR wherever you uploaded your files
   ```

2. **List files** to verify you're in the right place:
   ```bash
   ls -la
   ```
   
   You should see: `package.json`, `app/`, `components/`, etc.

---

## PART 6: INSTALL DEPENDENCIES & SETUP DATABASE

### Step 6.1: Install NPM Packages

1. **In SSH terminal**, make sure you're in your app directory

2. **Install dependencies**:
   ```bash
   npm install --production
   ```
   
   This will:
   - Read `package.json`
   - Download all required packages
   - Install them in `node_modules/` folder
   - Take 2-5 minutes

3. **Wait** for installation to complete (you'll see "added X packages")

### Step 6.2: Generate Prisma Client

1. **Still in your app directory**, run:
   ```bash
   npm run db:generate
   ```
   
   This creates the database client code

2. **Wait** for it to complete (should say "Generated Prisma Client")

### Step 6.3: Run Database Migrations

1. **Make sure** your `.env.production` file has the correct `DATABASE_URL`
   - **If using Neon**: Your connection string should already be correct
   - **If using Hostinger**: Make sure it includes `?sslmode=require`

2. **Test database connection** (optional but recommended):
   ```bash
   # This will test if you can connect to your database
   npx prisma db pull
   ```
   
   If this works, your connection is good!

3. **Run migrations** to create database tables:
   ```bash
   npm run db:migrate:deploy
   ```
   
   Or if that doesn't work:
   ```bash
   npx prisma migrate deploy
   ```

4. **Wait** for migrations to complete
   - You should see messages like "Applied migration: ..."
   - If you see errors, check your DATABASE_URL

5. **Verify** tables were created (optional):
   ```bash
   npx prisma db pull
   ```

### Step 6.4: Seed Initial Data (Optional)

1. **Seed the database** with admin user and sample data:
   ```bash
   npm run db:seed
   ```
   
   This creates:
   - Admin user: `admin@example.com` / `admin123`
   - Staff user: `staff@example.com` / `staff123`

2. **Important**: Change these passwords after first login!

---

## PART 7: BUILD YOUR APPLICATION

### Step 7.1: Build for Production

1. **In SSH terminal**, still in your app directory

2. **Build the application**:
   ```bash
   npm run build
   ```
   
   This will:
   - Generate Prisma client (again, to be safe)
   - Compile Next.js app
   - Create optimized production build
   - Generate PWA service worker
   - Take 3-10 minutes

3. **Wait** for build to complete
   - You'll see: "✓ Compiled successfully"
   - Look for: "Route (app)" with list of pages

4. **If build fails**, check error messages and fix issues

### Step 7.2: Verify Build Succeeded

1. **Check** that `.next` folder was created:
   ```bash
   ls -la .next
   ```
   
   Should show folders like: `server/`, `static/`, etc.

2. **If `.next` folder exists**, build was successful!

---

## PART 8: START YOUR APPLICATION

### Step 8.1: Choose How to Run Your App

You have 3 options. Choose ONE:

**Option A: Using PM2 (Recommended - Best for Production)**
- Keeps app running even if you disconnect
- Auto-restarts if app crashes
- Easy to manage

**Option B: Using Hostinger Node.js App Manager**
- Built into Hostinger control panel
- Easier to use, less control

**Option C: Using systemd Service**
- Linux system service
- More advanced

### Step 8.2: Option A - Setup with PM2

1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

2. **Start your app with Socket.IO support**:
   ```bash
   pm2 start npm --name "ny-gold-market" -- run start:server
   ```
   
   Or without Socket.IO (if you don't need real-time features):
   ```bash
   pm2 start npm --name "ny-gold-market" -- start
   ```

3. **Save PM2 configuration**:
   ```bash
   pm2 save
   ```

4. **Setup PM2 to start on server reboot**:
   ```bash
   pm2 startup
   ```
   
   Follow the instructions it shows (usually copy/paste a command)

5. **Check app status**:
   ```bash
   pm2 status
   ```
   
   Should show your app as "online"

6. **View logs**:
   ```bash
   pm2 logs ny-gold-market
   ```
   
   Press `Ctrl+C` to exit logs

### Step 8.3: Option B - Using Hostinger Node.js Manager

1. **In Hostinger Control Panel**, go to **Node.js Apps**

2. **Click** "Create Application" or "Add Application"

3. **Fill in**:
   - **Application Name**: `ny-gold-market`
   - **Node.js Version**: `20` (or latest available)
   - **Application Root**: `/path/to/your/app` (where you uploaded files)
   - **Application Startup File**: Leave empty or `server.production.js`
   - **Application Startup Command**: 
     - For Socket.IO: `npm run start:server`
     - Without Socket.IO: `npm start`
   - **Port**: `3000` (or as assigned by Hostinger)

4. **Click** "Create" or "Save"

5. **Start the application** (click "Start" button)

6. **Check status** - should show "Running"

### Step 8.4: Option C - Using systemd (Advanced)

1. **Create service file**:
   ```bash
   sudo nano /etc/systemd/system/ny-gold-market.service
   ```

2. **Paste this** (adjust paths):
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
   ExecStart=/usr/bin/node /path/to/your/app/node_modules/.bin/next start
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. **Save and exit** (Ctrl+X, then Y, then Enter)

4. **Enable and start service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable ny-gold-market
   sudo systemctl start ny-gold-market
   ```

5. **Check status**:
   ```bash
   sudo systemctl status ny-gold-market
   ```

---

## PART 9: CONFIGURE REVERSE PROXY (NGINX)

### Step 9.1: Check if Nginx is Installed

1. **In SSH terminal**, check:
   ```bash
   nginx -v
   ```

2. **If Nginx is installed**, continue to Step 9.2
3. **If not installed**, Hostinger may handle this automatically - check your hosting plan

### Step 9.2: Configure Nginx (If Needed)

**Note**: Hostinger may have a control panel for this. Check first!

1. **Edit Nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/yourdomain.com
   ```

2. **Paste this configuration** (adjust domain and paths):
   ```nginx
   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   # HTTPS server
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;

       # SSL certificates (Hostinger usually handles this)
       ssl_certificate /path/to/ssl/cert.pem;
       ssl_certificate_key /path/to/ssl/key.pem;

       # Proxy to your Node.js app
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

3. **Save and exit** (Ctrl+X, Y, Enter)

4. **Test Nginx configuration**:
   ```bash
   sudo nginx -t
   ```

5. **If test passes**, reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

**Note**: Many Hostinger plans handle this automatically. Check your control panel first!

---

## PART 10: VERIFY DEPLOYMENT

### Step 10.1: Test Your Website

1. **Open browser**
2. **Visit**: `https://yourdomain.com`
3. **You should see**: Your landing page
4. **Check**: Lock icon in address bar (HTTPS working)

### Step 10.2: Test Login

1. **Visit**: `https://yourdomain.com/login`
2. **Login with**:
   - Email: `admin@example.com`
   - Password: `admin123`
3. **If login works**: ✅ Success!
4. **If login fails**: Check logs (see troubleshooting)

### Step 10.3: Test PWA Installation

1. **Visit** your site on mobile/tablet or desktop
2. **Look for install button**:
   - **Chrome**: Install icon (⊕) in address bar
   - **Edge**: Install icon or "+" button
3. **Click install**
4. **App should install** and appear on home screen/start menu

### Step 10.4: Check Logs

**If using PM2**:
```bash
pm2 logs ny-gold-market
```

**If using systemd**:
```bash
sudo journalctl -u ny-gold-market -f
```

**If using Hostinger Node.js Manager**:
- Check logs in the control panel

**Look for**:
- ✅ "Server ready" messages
- ✅ "Socket.IO server initialized"
- ❌ Any error messages

---

## PART 11: POST-DEPLOYMENT TASKS

### Step 11.1: Change Default Passwords

1. **Login** to your app
2. **Go to**: `/admin/users`
3. **Find** admin user
4. **Click** "Edit" or "Reset Password"
5. **Set a strong new password**
6. **Save**

### Step 11.2: Set Daily Metal Prices

1. **Login** as admin
2. **Go to**: `/admin/prices`
3. **Enter** today's prices:
   - Gold price per ounce
   - Silver price per ounce
   - Platinum price per ounce
4. **Click** "Save Prices"

### Step 11.3: Test All Features

- [ ] Create a customer
- [ ] Issue an NFC card
- [ ] Start a transaction
- [ ] Test password reset email
- [ ] Test PWA installation
- [ ] Test real-time updates (if Socket.IO enabled)

---

## 🆘 TROUBLESHOOTING

### Problem: Site Not Loading

**Check**:
1. Is app running? (`pm2 status` or check Hostinger panel)
2. Is port 3000 accessible?
3. Check logs for errors
4. Verify `.env.production` exists and has correct values

### Problem: Database Connection Error

**Check**:
1. `DATABASE_URL` in `.env.production` is correct
2. Database is running in Hostinger
3. SSL mode is set: `?sslmode=require`
4. Firewall allows connection

**Test connection**:
```bash
psql $DATABASE_URL
```

### Problem: Build Fails

**Check**:
1. All files uploaded correctly
2. `package.json` is valid
3. Node.js version is 18+ or 20+
4. Check error messages in build output

### Problem: PWA Not Installing

**Check**:
1. Site is accessed via HTTPS (not HTTP)
2. Icons exist: `public/icon-192.png` and `public/icon-512.png`
3. Manifest is accessible: `https://yourdomain.com/manifest.json`
4. Check browser console for errors (F12)

### Problem: Socket.IO Not Working

**Check**:
1. Using `npm run start:server` (not just `npm start`)
2. WebSocket proxy configured in Nginx
3. Check browser console for connection errors
4. Verify Socket.IO server started in logs

### Problem: Email Not Sending

**Check**:
1. Gmail App Password is correct (not regular password)
2. `SMTP_USER` and `SMTP_PASS` in `.env.production`
3. Test email config (see `EMAIL_SETUP.md`)

---

## 📝 MAINTENANCE

### Update Your App

1. **Upload new files** (or pull from Git)
2. **In SSH**:
   ```bash
   cd /path/to/your/app
   npm install
   npm run db:generate
   npm run build
   pm2 restart ny-gold-market
   ```

### Backup Database

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### View Logs

```bash
pm2 logs ny-gold-market
```

### Restart App

```bash
pm2 restart ny-gold-market
```

---

## ✅ FINAL CHECKLIST

- [ ] Code uploaded to Hostinger
- [ ] `.env.production` file created with correct values
- [ ] PWA icons added (`icon-192.png`, `icon-512.png`)
- [ ] Database created and migrations run
- [ ] Node.js installed (version 18+ or 20+)
- [ ] Dependencies installed (`npm install`)
- [ ] App built successfully (`npm run build`)
- [ ] App running (PM2, systemd, or Hostinger manager)
- [ ] SSL certificate installed (HTTPS working)
- [ ] Reverse proxy configured (if needed)
- [ ] Site accessible at `https://yourdomain.com`
- [ ] Login works
- [ ] PWA installs correctly
- [ ] Default passwords changed
- [ ] Daily prices set

---

## 🎉 CONGRATULATIONS!

If you've completed all steps, your app should be live on Hostinger!

**Your app URL**: `https://yourdomain.com`

**Need Help?**
- Check logs for errors
- Review troubleshooting section
- Contact Hostinger support for hosting issues
- Check application documentation

---

## 📚 ADDITIONAL RESOURCES

- `ENV_PRODUCTION_GUIDE.md` - Detailed environment variables guide
- `HOSTINGER_DEPLOYMENT.md` - Technical deployment details
- `PRODUCTION_CHECKLIST.md` - Quick checklist
- `EMAIL_SETUP.md` - Gmail SMTP setup

