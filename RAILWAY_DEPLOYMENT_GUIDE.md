# Railway Deployment Guide - Step by Step

Complete guide to deploy your New York Gold Market app on Railway.

## 🎯 Prerequisites

- [ ] GitHub account
- [ ] Your code pushed to a GitHub repository
- [ ] Neon PostgreSQL database (or any PostgreSQL database)
- [ ] Gmail app password for email (already set up)

## 📋 Step 1: Create Railway Account

1. **Go to Railway**: https://railway.app
2. **Click "Start a New Project"** (or "Login" if you have an account)
3. **Sign up with GitHub** (recommended):
   - Click "Login with GitHub"
   - Authorize Railway to access your GitHub account
   - Railway will automatically detect your repositories

## 📦 Step 2: Create New Project

1. **In Railway dashboard**, click **"New Project"**
2. **Select "Deploy from GitHub repo"**
3. **Choose your repository**:
   - Find `NFC-Enabled-Membership-CRM-and-Scrap-Valuation-Transaction-System`
   - Click on it
4. Railway will start deploying automatically (this will fail initially - that's OK!)

## ⚙️ Step 3: Configure Environment Variables

1. **In your Railway project**, click on the service (your app)
2. **Go to "Variables" tab**
3. **Click "New Variable"** and add each of these:

### Required Environment Variables

Add these one by one:

```env
# Database (Your Neon PostgreSQL URL)
DATABASE_URL=postgresql://neondb_owner:npg_3Tj5qxYhHyFc@ep-restless-smoke-aif6smxj-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require

# Session Secret (Generate a random string - at least 32 characters)
SESSION_SECRET=your-random-secret-here-minimum-32-characters

# App URL (Railway will provide this - see Step 4)
NEXT_PUBLIC_APP_URL=https://your-app-name.railway.app

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply.newyorkgoldmarket@gmail.com
SMTP_PASS=uzkx nlpu bkfv aklx
FROM_EMAIL=New York Gold Market <noreply.newyorkgoldmarket@gmail.com>

# Node Environment
NODE_ENV=production

# Port (Railway sets this automatically, but you can add it)
PORT=3000
```

**Important Notes:**
- Replace `SESSION_SECRET` with a random string (use https://randomkeygen.com/)
- Replace `NEXT_PUBLIC_APP_URL` with your Railway URL (see Step 4)
- Keep your Neon database URL as is (or update if you have a different one)

## 🔧 Step 4: Configure Build and Start Commands

1. **In Railway project**, click on your service
2. **Go to "Settings" tab**
3. **Scroll to "Build & Deploy" section**
4. **Set these:**

   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start:server`
   - **Root Directory**: `/` (leave as default)

5. **Click "Save"**

## 🌐 Step 5: Get Your Railway URL

1. **In Railway project**, click on your service
2. **Go to "Settings" tab**
3. **Scroll to "Domains" section**
4. **Copy the generated domain** (e.g., `your-app-name.railway.app`)
5. **Go back to "Variables" tab**
6. **Update `NEXT_PUBLIC_APP_URL`** with your Railway domain:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app-name.railway.app
   ```
7. **Railway will automatically redeploy** when you save

## 🚀 Step 6: Deploy

1. **Railway will automatically deploy** when you:
   - First connect the repo
   - Save environment variables
   - Push new code to GitHub

2. **Watch the deployment**:
   - Go to "Deployments" tab
   - You'll see build logs in real-time
   - Wait for "Deploy Successful" message

3. **Check logs** if there are errors:
   - Click on the deployment
   - View logs to see what went wrong

## ✅ Step 7: Verify Deployment

1. **Visit your Railway URL**: `https://your-app-name.railway.app`
2. **You should see**: Your landing page
3. **Test login**: Go to `/login` and login with:
   - Email: `admin@example.com`
   - Password: `admin123`

## 🔗 Step 8: Connect Custom Domain (Optional)

If you want to use `app.newyorkgoldmarket.com`:

1. **In Railway project**, go to "Settings" → "Domains"
2. **Click "Custom Domain"**
3. **Enter**: `app.newyorkgoldmarket.com`
4. **Railway will provide DNS records**:
   - Type: `CNAME`
   - Name: `app`
   - Value: `your-app-name.railway.app` (or similar)
5. **Go to Namecheap** (where your domain is):
   - Go to DNS settings
   - Add CNAME record:
     - **Host**: `app`
     - **Value**: `your-app-name.railway.app` (from Railway)
     - **TTL**: Automatic
6. **Wait 5-10 minutes** for DNS to propagate
7. **Railway will automatically provision SSL** certificate

## 🐛 Troubleshooting

### Build Fails

**Error**: "ERESOLVE could not resolve" or peer dependency conflicts
- **Solution**: The `.npmrc` file in the repo already has `legacy-peer-deps=true` which fixes this. Make sure it's committed to your GitHub repo.

**Error**: "Out of memory" or build timeout
- **Solution**: Railway free tier has limits. Consider upgrading or optimize build

**Error**: "Prisma generate failed"
- **Solution**: Make sure `DATABASE_URL` is correct and database is accessible

### App Doesn't Start

**Error**: "Port already in use"
- **Solution**: Railway sets PORT automatically. Don't hardcode it.

**Error**: "Cannot connect to database"
- **Solution**: 
  - Check `DATABASE_URL` is correct
  - Verify Neon database allows connections from Railway IPs
  - Check SSL mode is `require`

### Socket.IO Not Working

**Error**: WebSocket connection fails
- **Solution**: 
  - Make sure `NEXT_PUBLIC_APP_URL` matches your Railway domain exactly
  - Check Railway logs for Socket.IO errors
  - Verify CORS settings in `server.production.js`

### Environment Variables Not Working

**Error**: Variables not found
- **Solution**:
  - Make sure variables are added in Railway dashboard
  - Check spelling (case-sensitive)
  - Redeploy after adding variables

## 📊 Monitoring

1. **View Logs**: Click on your service → "Deployments" → Click on a deployment
2. **Metrics**: Railway shows CPU, Memory, Network usage
3. **Alerts**: Set up notifications for deployment failures

## 💰 Railway Pricing

- **Free Tier**: 
  - $5 credit/month
  - Enough for small apps
  - Sleeps after inactivity (wakes on request)
  
- **Hobby Plan**: $5/month
  - Always on
  - More resources
  - Better for production

## 🎉 Success Checklist

- [ ] Railway account created
- [ ] GitHub repo connected
- [ ] All environment variables added
- [ ] Build command set: `npm run build`
- [ ] Start command set: `npm run start:server`
- [ ] App deployed successfully
- [ ] Landing page loads
- [ ] Login works
- [ ] Socket.IO works (test real-time features)
- [ ] Custom domain connected (if applicable)

## 🆘 Need Help?

1. **Check Railway logs** for errors
2. **Verify environment variables** are correct
3. **Test database connection** from Railway
4. **Check Railway status page**: https://status.railway.app

## 📝 Quick Reference

**Railway Dashboard**: https://railway.app/dashboard

**Your App URL**: `https://your-app-name.railway.app`

**Environment Variables Location**: Project → Service → Variables tab

**Build/Start Commands**: Project → Service → Settings → Build & Deploy

---

**That's it!** Your app should be live on Railway in about 10-15 minutes! 🚀

