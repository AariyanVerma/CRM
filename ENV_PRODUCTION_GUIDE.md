# .env.production File Guide

## What is .env.production?

The `.env.production` file stores **production environment variables** - sensitive configuration data that your app needs to run on Hostinger. This file is **NOT** committed to Git (it's in `.gitignore`) to keep your secrets safe.

## Why Do You Need It?

Your app needs different settings for:
- **Development** (local): Uses `.env.local` or `.env`
- **Production** (Hostinger): Uses `.env.production`

Production needs:
- Your actual database connection (not localhost)
- Your real domain URL (not localhost:3000)
- Strong security secrets
- Email credentials

## How to Create It

1. **Create the file** in your project root:
   ```bash
   # On Windows (PowerShell)
   New-Item .env.production
   
   # Or just create it manually in your code editor
   ```

2. **Copy this template** and fill in your values:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
# Get this from Hostinger database panel
# Format: postgresql://username:password@host:port/database?sslmode=require
DATABASE_URL="postgresql://your_username:your_password@your_host:5432/your_database?sslmode=require"

# Example from Hostinger:
# DATABASE_URL="postgresql://u123456789:MyPassword123@postgres.hostinger.com:5432/u123456789_dbname?sslmode=require"

# ============================================
# SECURITY - SESSION SECRET
# ============================================
# Generate a strong random string (at least 32 characters)
# You can use: https://randomkeygen.com/ (CodeIgniter Encryption Keys)
# Or run: openssl rand -base64 32
SESSION_SECRET="your-very-long-random-secret-string-here-minimum-32-characters"

# Example:
# SESSION_SECRET="aB3$kL9#mN2@qR5&tU8*wX1!zY4%vB7^nC0"

# ============================================
# APP URL - YOUR DOMAIN
# ============================================
# Your production domain (HTTPS required for PWA)
# Replace with your actual Hostinger domain
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Examples:
# NEXT_PUBLIC_APP_URL="https://nygoldmarket.com"
# NEXT_PUBLIC_APP_URL="https://www.nygoldmarket.com"

# ============================================
# EMAIL CONFIGURATION (Gmail SMTP)
# ============================================
# Gmail SMTP settings for password reset emails
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"

# Your Gmail address
SMTP_USER="your-email@gmail.com"

# Gmail App Password (NOT your regular password!)
# Get it from: https://myaccount.google.com/apppasswords
SMTP_PASS="your-16-character-app-password"

# Display name and email for sent emails
FROM_EMAIL="New York Gold Market <your-email@gmail.com>"

# ============================================
# NODE ENVIRONMENT
# ============================================
# Set to production
NODE_ENV="production"

# ============================================
# PORT (Optional - Hostinger may set this)
# ============================================
# Usually Hostinger sets this automatically
# Only set if you need a specific port
PORT="3000"
```

## Where to Get Each Value

### 1. DATABASE_URL
**From Hostinger:**
- Go to Hostinger Control Panel
- Navigate to **Databases** → **PostgreSQL**
- Click on your database
- Copy the connection string
- Format: `postgresql://username:password@host:5432/database?sslmode=require`

**Example:**
```
postgresql://u123456789:MySecurePass123@postgres.hostinger.com:5432/u123456789_goldmarket?sslmode=require
```

### 2. SESSION_SECRET
**Generate a random string:**
- Use: https://randomkeygen.com/ (CodeIgniter Encryption Keys - 32+ characters)
- Or run: `openssl rand -base64 32` in terminal
- **Important**: Make it long and random (32+ characters)

**Example:**
```
SESSION_SECRET="kL9#mN2@qR5&tU8*wX1!zY4%vB7^nC0$aB3$kL9#mN2@qR5"
```

### 3. NEXT_PUBLIC_APP_URL
**Your domain:**
- Your Hostinger domain (e.g., `https://nygoldmarket.com`)
- **Must be HTTPS** (required for PWA)
- No trailing slash

**Example:**
```
NEXT_PUBLIC_APP_URL="https://nygoldmarket.com"
```

### 4. SMTP_USER
**Your Gmail address:**
- The Gmail account you want to send emails from
- Example: `nygoldmarket@gmail.com`

### 5. SMTP_PASS
**Gmail App Password:**
- **NOT your regular Gmail password!**
- Get it from: https://myaccount.google.com/apppasswords
- Steps:
  1. Go to Google Account → Security
  2. Enable 2-Step Verification (if not enabled)
  3. Go to App Passwords
  4. Generate new app password for "Mail"
  5. Copy the 16-character password

**Example:**
```
SMTP_PASS="abcd efgh ijkl mnop"
# (Remove spaces when pasting)
SMTP_PASS="abcdefghijklmnop"
```

### 6. FROM_EMAIL
**Display name and email:**
- Format: `"Display Name <email@gmail.com>"`
- Example: `"New York Gold Market <nygoldmarket@gmail.com>"`

## Complete Example File

Here's a complete example with fake values:

```env
DATABASE_URL="postgresql://u123456789:MyPassword123@postgres.hostinger.com:5432/u123456789_goldmarket?sslmode=require"
SESSION_SECRET="kL9#mN2@qR5&tU8*wX1!zY4%vB7^nC0$aB3$kL9#mN2@qR5&tU8*wX1"
NEXT_PUBLIC_APP_URL="https://nygoldmarket.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="nygoldmarket@gmail.com"
SMTP_PASS="abcdefghijklmnop"
FROM_EMAIL="New York Gold Market <nygoldmarket@gmail.com>"
NODE_ENV="production"
PORT="3000"
```

## Important Notes

1. **Never commit this file to Git** - It's already in `.gitignore`
2. **Use HTTPS** - Your `NEXT_PUBLIC_APP_URL` must start with `https://`
3. **Strong secrets** - Use long, random strings for `SESSION_SECRET`
4. **Gmail App Password** - Use app password, not regular password
5. **Database SSL** - Always include `?sslmode=require` in DATABASE_URL

## Testing Your Configuration

After creating `.env.production`, test it locally:

```bash
# Load production environment and test
NODE_ENV=production npm run build
```

## Security Checklist

- [ ] SESSION_SECRET is 32+ characters and random
- [ ] DATABASE_URL includes `?sslmode=require`
- [ ] NEXT_PUBLIC_APP_URL uses HTTPS
- [ ] SMTP_PASS is a Gmail App Password (not regular password)
- [ ] File is NOT committed to Git (check `.gitignore`)

## Need Help?

- **Database connection issues**: Check Hostinger database panel
- **Gmail setup**: See `EMAIL_SETUP.md`
- **Domain/SSL**: Contact Hostinger support



