# Railway Custom Domain Setup Guide

Complete guide to connect your Railway app to `app.newyorkgoldmarket.com`.

## 🎯 Overview

You'll need to:
1. Add the custom domain in Railway
2. Configure DNS records in Namecheap
3. Update environment variables
4. Wait for SSL certificate

---

## Step 1: Add Custom Domain in Railway

1. **Go to Railway Dashboard**: https://railway.app
2. **Open your project**: `truthful-light`
3. **Click on your service**: `CRM`
4. **Go to "Settings" tab**
5. **Scroll to "Domains" section**
6. **Click "Custom Domain"** or **"+ Add Domain"**
7. **Enter your domain**: `app.newyorkgoldmarket.com`
8. **Click "Add"** or **"Save"**

Railway will show you DNS records you need to add. **Copy these values** - you'll need them in Step 2.

**What Railway will show you:**
- **Type**: `CNAME` (or sometimes `A` record)
- **Name/Host**: `app`
- **Value/Target**: Something like `crm-production-c77b.up.railway.app` (your Railway URL)

---

## Step 2: Configure DNS in Namecheap

1. **Go to Namecheap**: https://www.namecheap.com
2. **Login** to your account
3. **Go to**: **Domain List** → Click **"Manage"** next to `newyorkgoldmarket.com`
4. **Click on "Advanced DNS"** tab
5. **In "Host Records" section**, click **"Add New Record"**

### Add CNAME Record (Most Common)

1. **Select Type**: `CNAME Record`
2. **Host**: `app` (just `app`, not `app.newyorkgoldmarket.com`)
3. **Value**: Paste the value Railway gave you (e.g., `crm-production-c77b.up.railway.app`)
4. **TTL**: `Automatic` (or `30 min`)
5. **Click the checkmark** to save

### If Railway Requires A Record Instead

1. **Select Type**: `A Record`
2. **Host**: `app`
3. **Value**: The IP address Railway provides
4. **TTL**: `Automatic`
5. **Click the checkmark** to save

---

## Step 3: Update Environment Variables in Railway

After adding the domain, update your app's environment variables:

1. **In Railway**: Go to your `CRM` service → **"Variables"** tab
2. **Find** `NEXT_PUBLIC_APP_URL`
3. **Update it to**:
   ```
   https://app.newyorkgoldmarket.com
   ```
4. **Click "Save"**

Railway will automatically redeploy with the new URL.

---

## Step 4: Wait for DNS Propagation

1. **DNS Propagation**: Usually takes **5-30 minutes**, but can take up to 24 hours
2. **Check Status**: 
   - Railway dashboard will show domain status
   - You can check DNS propagation at: https://www.whatsmydns.net
   - Search for: `app.newyorkgoldmarket.com`
3. **SSL Certificate**: Railway will automatically provision an SSL certificate (HTTPS) once DNS is propagated
   - This usually takes an additional 5-10 minutes after DNS propagation

---

## Step 5: Verify It's Working

1. **Check Railway Dashboard**:
   - Go to Settings → Domains
   - You should see `app.newyorkgoldmarket.com` with a green checkmark ✅
   - Status should say "Active" or "Provisioned"

2. **Test Your Domain**:
   - Visit: `https://app.newyorkgoldmarket.com`
   - You should see your app (not a 502 error)
   - The URL should show a padlock icon (HTTPS is working)

3. **Test Your App**:
   - Try logging in
   - Make sure Socket.IO works (test real-time features)
   - Verify all pages load correctly

---

## 🐛 Troubleshooting

### Domain Not Working After 30 Minutes

1. **Check DNS Records**:
   - Go back to Namecheap → Advanced DNS
   - Verify the CNAME record is correct
   - Make sure Host is `app` (not `app.newyorkgoldmarket.com`)
   - Make sure Value matches exactly what Railway provided

2. **Check DNS Propagation**:
   - Visit: https://www.whatsmydns.net/#CNAME/app.newyorkgoldmarket.com
   - If it shows different values in different locations, DNS is still propagating
   - Wait a bit longer

3. **Check Railway Dashboard**:
   - Go to Settings → Domains
   - Check if there are any error messages
   - Verify the domain is listed and active

### SSL Certificate Not Provisioned

- Railway automatically provisions SSL certificates
- If it's been more than 1 hour and SSL isn't working:
  1. Check Railway dashboard for errors
  2. Try removing and re-adding the domain
  3. Contact Railway support if needed

### App Works on Railway URL But Not Custom Domain

1. **Check Environment Variables**:
   - Make sure `NEXT_PUBLIC_APP_URL` is set to `https://app.newyorkgoldmarket.com`
   - Redeploy after updating

2. **Check CORS Settings**:
   - Your `server.production.js` should allow your custom domain
   - It should already work since it uses `NEXT_PUBLIC_APP_URL`

### "Domain Already in Use" Error

- This means the domain is already connected to another Railway project
- Delete it from the other project first, then add it to this one

---

## ✅ Success Checklist

After setup, you should have:

- [ ] Custom domain added in Railway
- [ ] CNAME record added in Namecheap
- [ ] `NEXT_PUBLIC_APP_URL` updated to `https://app.newyorkgoldmarket.com`
- [ ] DNS propagated (check with whatsmydns.net)
- [ ] SSL certificate active (padlock in browser)
- [ ] App accessible at `https://app.newyorkgoldmarket.com`
- [ ] All features working (login, Socket.IO, etc.)

---

## 📝 Important Notes

- **Keep both URLs working**: Your Railway URL (`crm-production-c77b.up.railway.app`) will continue to work
- **HTTPS is automatic**: Railway provides free SSL certificates
- **No downtime**: Your app stays online during domain setup
- **DNS changes**: Can take up to 24 hours, but usually work in 5-30 minutes

---

**Once setup is complete, your app will be accessible at `https://app.newyorkgoldmarket.com`!** 🎉


