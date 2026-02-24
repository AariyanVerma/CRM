# Railway Cleanup Guide

## 🧹 How to Clean Up Multiple Railway Projects

You have 3 Railway projects, but only "truthful-light" is working. Here's how to clean up:

## Step 1: Identify What to Keep

✅ **Keep**: `truthful-light / production` (your working deployment)
❌ **Delete**: The other 2 projects (they have warnings/errors)

## Step 2: Delete Extra Railway Projects

### Option A: Delete Entire Projects (Recommended)

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Click on each project** you want to delete (NOT "truthful-light")
3. **Go to Settings** (gear icon or Settings tab)
4. **Scroll to the bottom** → Find "Danger Zone"
5. **Click "Delete Project"**
6. **Confirm deletion**

### Option B: Delete Services Within Projects

If you want to keep the projects but remove services:

1. **Open the project** in Railway
2. **Click on the service** you want to delete
3. **Go to Settings tab**
4. **Scroll to "Danger Zone"**
5. **Click "Delete Service"**
6. **Confirm deletion**

## Step 3: Clean Up GitHub Webhooks (Optional)

If Railway created webhooks in your GitHub repo:

1. **Go to GitHub**: https://github.com/AariyanVerma/CRM
2. **Click "Settings"** (in your repo)
3. **Click "Webhooks"** (left sidebar)
4. **Look for Railway webhooks** (they'll have `railway.app` in the URL)
5. **Delete webhooks** for the projects you deleted
6. **Keep only the webhook** for "truthful-light"

## Step 4: Verify Your Working Deployment

After cleanup:

1. **Go to Railway Dashboard**
2. **You should only see**: `truthful-light / production`
3. **Verify it's working**: Visit `https://crm-production-c77b.up.railway.app`
4. **Check status**: Should show "Online" with green indicator

## Step 5: Update Environment Variables (If Needed)

Make sure your "truthful-light" project has all the correct environment variables:

1. **Go to**: Railway → truthful-light → CRM service → Variables
2. **Verify these are set**:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `NEXT_PUBLIC_APP_URL` (should be your Railway URL)
   - `NODE_ENV=production`
   - All SMTP variables

## 🎯 What You Should Have After Cleanup

✅ **One Railway Project**: `truthful-light`
✅ **One Service**: `CRM`
✅ **One Environment**: `production`
✅ **One GitHub Webhook**: For truthful-light only
✅ **Working App**: `https://crm-production-c77b.up.railway.app`

## ⚠️ Important Notes

- **Don't delete "truthful-light"** - that's your working deployment!
- **Deleting projects won't affect your GitHub repo** - your code is safe
- **You can always create new projects** if needed later
- **Railway free tier** allows multiple projects, but it's cleaner to have just one

## 🆘 If You Accidentally Delete the Wrong Project

If you delete "truthful-light" by mistake:

1. **Don't panic** - your code is still on GitHub
2. **Create a new Railway project** from your GitHub repo
3. **Re-add all environment variables**
4. **Redeploy** - it will work again

---

**After cleanup, you'll have a clean Railway setup with just your working deployment!** 🎉


