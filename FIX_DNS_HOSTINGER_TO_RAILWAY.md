# Fix: app.newyorkgoldmarket.com Showing Hostinger Landing Page

Your DNS is still pointing to Hostinger. Here's how to fix it:

## 🔍 Step 1: Check Current DNS Records in Namecheap

1. **Go to Namecheap**: https://www.namecheap.com
2. **Login** to your account
3. **Go to**: **Domain List** → Click **"Manage"** next to `newyorkgoldmarket.com`
4. **Click on "Advanced DNS"** tab
5. **Look in "Host Records" section** for any records with Host = `app`

**What to look for:**
- Any `A Record` with Host = `app` pointing to a Hostinger IP
- Any `CNAME Record` with Host = `app` pointing to Hostinger
- Any other records for the `app` subdomain

---

## 🗑️ Step 2: Delete Old Hostinger Records

**For each record you found for `app` subdomain:**

1. **Click the trash/delete icon** (🗑️) next to the record
2. **Confirm deletion**
3. **Repeat** for all `app` subdomain records pointing to Hostinger

**Important**: Only delete records for the `app` subdomain. Don't delete records for:
- `@` (root domain)
- `www`
- Other subdomains

---

## ➕ Step 3: Get Railway DNS Information

1. **Go to Railway Dashboard**: https://railway.app
2. **Open your project**: `truthful-light` → `CRM` service
3. **Go to "Settings"** tab
4. **Scroll to "Domains"** section
5. **If you haven't added the domain yet**:
   - Click **"Custom Domain"** or **"+ Add Domain"**
   - Enter: `app.newyorkgoldmarket.com`
   - Click **"Add"**
6. **Copy the DNS record** Railway shows you:
   - **Type**: Usually `CNAME`
   - **Name/Host**: `app`
   - **Value/Target**: Something like `crm-production-c77b.up.railway.app`

---

## ✅ Step 4: Add Railway CNAME Record in Namecheap

1. **Still in Namecheap Advanced DNS** (from Step 1)
2. **Click "Add New Record"**
3. **Select Type**: `CNAME Record`
4. **Host**: `app` (just `app`, NOT `app.newyorkgoldmarket.com`)
5. **Value**: Paste the Railway value (e.g., `crm-production-c77b.up.railway.app`)
6. **TTL**: `Automatic` (or `30 min`)
7. **Click the checkmark** (✓) to save

---

## ⏳ Step 5: Wait for DNS Propagation

1. **DNS changes take 5-30 minutes** to propagate (can take up to 24 hours)
2. **Check propagation status**:
   - Visit: https://www.whatsmydns.net/#CNAME/app.newyorkgoldmarket.com
   - You should see the Railway URL in the results
3. **Clear your browser cache**:
   - Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
   - Clear cached images and files
   - Or use incognito/private browsing mode

---

## 🔍 Step 6: Verify DNS is Correct

**After 10-15 minutes, check:**

1. **In Namecheap Advanced DNS**, you should see:
   - ✅ One `CNAME` record: Host = `app`, Value = `crm-production-c77b.up.railway.app` (or your Railway URL)
   - ❌ NO `A` records for `app` pointing to Hostinger IPs
   - ❌ NO other `CNAME` records for `app`

2. **Test DNS lookup** (in terminal/command prompt):
   ```bash
   nslookup app.newyorkgoldmarket.com
   ```
   - Should show your Railway URL, not Hostinger

3. **Or use online tool**:
   - https://www.whatsmydns.net/#CNAME/app.newyorkgoldmarket.com
   - Should show Railway URL globally

---

## 🎯 Step 7: Verify Railway Domain Setup

1. **In Railway**: Go to Settings → Domains
2. **Check** that `app.newyorkgoldmarket.com` is listed
3. **Status** should show "Active" or "Provisioned" (with green checkmark)
4. **If it shows an error**, click on it to see details

---

## 🐛 Troubleshooting

### Still Showing Hostinger After 30 Minutes

1. **Double-check Namecheap DNS**:
   - Make sure you deleted ALL records for `app` subdomain
   - Make sure you added the Railway CNAME record correctly
   - Host should be exactly `app` (not `app.newyorkgoldmarket.com`)

2. **Check for multiple records**:
   - Sometimes there are multiple records - delete ALL of them
   - Keep only the Railway CNAME record

3. **Clear DNS cache**:
   - **Windows**: Open Command Prompt as Admin → `ipconfig /flushdns`
   - **Mac/Linux**: `sudo dscacheutil -flushcache` or `sudo systemd-resolve --flush-caches`

4. **Try different browser or incognito mode**

### Railway Shows Domain Error

1. **Check Railway dashboard** for specific error message
2. **Common issues**:
   - DNS not propagated yet (wait longer)
   - Wrong DNS record (double-check the value)
   - Domain already in use (check if it's connected to another Railway project)

### DNS Propagation Check Shows Mixed Results

- This is normal during propagation
- Different locations will update at different times
- Wait a bit longer (up to 1 hour)
- Your local area should update first

---

## ✅ Success Checklist

After fixing, you should have:

- [ ] Deleted all old Hostinger DNS records for `app` subdomain
- [ ] Added Railway CNAME record in Namecheap
- [ ] Railway shows domain as "Active" or "Provisioned"
- [ ] DNS propagation check shows Railway URL
- [ ] `https://app.newyorkgoldmarket.com` shows your Railway app (not Hostinger)
- [ ] SSL certificate is active (padlock icon in browser)

---

## 📝 Important Notes

- **DNS changes are not instant** - be patient (5-30 minutes minimum)
- **You can have both** - your main domain can point to Hostinger while `app` subdomain points to Railway
- **Don't delete root domain records** - only delete/modify records for the `app` subdomain
- **Railway URL still works** - `crm-production-c77b.up.railway.app` will continue to work

---

**Once DNS propagates, `app.newyorkgoldmarket.com` will show your Railway app instead of Hostinger!** 🎉


