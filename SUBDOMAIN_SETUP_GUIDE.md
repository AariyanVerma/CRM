# Subdomain Setup: Namecheap Domain → Hostinger Hosting

This guide shows you how to host your app on a subdomain (like `app.newyorkgoldmarket.com`) using:
- **Domain**: Registered on Namecheap
- **Hosting**: Hostinger

---

## 🎯 Quick Answer: What to Fill in Hostinger DNS

Since you're in Hostinger's DNS management page, here's what to fill:

### For the DNS Record You're Looking At:

**Type**: `A` ✅ (already selected - correct!)

**Name**: `app` (NOT "@")
- "@" means the root domain
- For subdomain, use the subdomain name: `app`
- This will create: `app.newyorkgoldmarket.com`

**Points to**: `YOUR_HOSTINGER_SERVER_IP`
- You need to get this from Hostinger
- See "How to Find Hostinger IP" below

**TTL**: `14400` ✅ (already filled - this is fine!)

**Then click**: "Add Record"

---

## 📋 Complete Setup Process

You have **2 options**. Choose ONE:

---

## OPTION 1: Use Hostinger Nameservers (Recommended) ⭐

**Best if**: You want Hostinger to manage all DNS records

### Step 1: Point Domain to Hostinger Nameservers (in Namecheap)

1. **Login to Namecheap**: https://www.namecheap.com
2. **Go to**: **Domain List** → Click **Manage** on your domain
3. **Go to**: **Advanced DNS** tab
4. **Find**: "Nameservers" section
5. **Select**: "Custom DNS" (instead of "Namecheap BasicDNS")
6. **Enter Hostinger nameservers**:
   ```
   ns1.dns-parking.com
   ns2.dns-parking.com
   ```
   
   Or check your Hostinger control panel for the exact nameservers (they might be different)

7. **Click**: "Save" or "Apply"
8. **Wait**: 24-48 hours for DNS propagation (usually faster)

### Step 2: Create Subdomain in Hostinger

1. **In Hostinger Control Panel**, go to **Domains**
2. **Find your domain**: `newyorkgoldmarket.com`
3. **Click**: "Manage" or "DNS"
4. **Add DNS Record**:
   - **Type**: `A`
   - **Name**: `app`
   - **Points to**: Your Hostinger server IP (see below)
   - **TTL**: `14400`
   - **Click**: "Add Record"

### Step 3: Get Hostinger Server IP

**Method 1: From Hostinger Control Panel**
1. Go to **Websites** → Your website
2. Look for **Server IP** or **IP Address**
3. Copy the IP address

**Method 2: From Hosting Details**
1. Go to **Hosting** → Your hosting plan
2. Look for **Server Information** or **IP Address**
3. Copy the IP address

**Method 3: Contact Support**
- Ask Hostinger: "What IP address should I use for DNS A record for my subdomain?"

### Step 4: Verify Setup

1. **Wait** 1-2 hours for DNS to propagate
2. **Test**: Visit `http://app.newyorkgoldmarket.com`
3. **Should show**: Your Hostinger server (or "Site not found" if app not deployed yet)

---

## OPTION 2: Keep Namecheap Nameservers (Advanced)

**Best if**: You want to manage DNS in Namecheap

### Step 1: Get Hostinger Server IP

1. **In Hostinger Control Panel**, find your server IP (see methods above)
2. **Copy** the IP address

### Step 2: Add A Record in Namecheap

1. **Login to Namecheap**: https://www.namecheap.com
2. **Go to**: **Domain List** → Click **Manage** on your domain
3. **Go to**: **Advanced DNS** tab
4. **In "Host Records" section**, click **Add New Record**:
   - **Type**: `A Record`
   - **Host**: `app` (just the subdomain name, not the full domain)
   - **Value**: `YOUR_HOSTINGER_IP` (paste the IP you got from Hostinger)
   - **TTL**: `Automatic` or `30 min`
5. **Click**: Save (checkmark icon)

### Step 3: Wait for DNS Propagation

- **Wait**: 1-24 hours (usually 1-2 hours)
- **Test**: Visit `http://app.newyorkgoldmarket.com`

---

## 🔍 How to Find Your Hostinger Server IP

### Method 1: From Hostinger Control Panel

1. **Login** to Hostinger: https://hpanel.hostinger.com
2. **Go to**: **Websites** (in left sidebar)
3. **Click** on your website/hosting account
4. **Look for**: 
   - "Server IP"
   - "IP Address"
   - "Dedicated IP"
   - In server details/information section

### Method 2: From Hosting Plan Details

1. **Go to**: **Hosting** → Your hosting plan
2. **Click**: "Manage" or "Details"
3. **Look for**: Server information section
4. **Find**: IP address listed there

### Method 3: From SSH/Server Details

1. **Go to**: **SSH Access** or **Server Information**
2. **Look for**: Server IP address
3. **Copy** the IP

### Method 4: Contact Hostinger Support

If you can't find it:
1. **Contact Hostinger support** (live chat or ticket)
2. **Ask**: "What IP address should I use for DNS A record to point my subdomain to your server?"
3. **They'll give you** the IP address

---

## ✅ What Your DNS Record Should Look Like

### In Hostinger (if using Hostinger nameservers):

```
Type: A
Name: app
Points to: 185.123.45.67  (your Hostinger IP)
TTL: 14400
```

### In Namecheap (if keeping Namecheap nameservers):

```
Type: A Record
Host: app
Value: 185.123.45.67  (your Hostinger IP)
TTL: Automatic
```

---

## 🚀 After DNS is Set Up

Once your DNS record is added:

1. **Wait** 1-2 hours for DNS propagation
2. **Install SSL** in Hostinger for your subdomain:
   - Go to **SSL** in Hostinger
   - Add `app.newyorkgoldmarket.com`
   - Install Let's Encrypt certificate
3. **Upload your app** to Hostinger (follow main deployment guide)
4. **Configure** your app to work on the subdomain
5. **Test**: Visit `https://app.newyorkgoldmarket.com`

---

## 🔧 Troubleshooting

### Problem: Subdomain Not Working

**Check**:
1. DNS record is added correctly
2. IP address is correct
3. Waited at least 1 hour for DNS propagation
4. Test DNS: Use https://dnschecker.org to see if DNS has propagated

### Problem: Can't Find Hostinger IP

**Solutions**:
1. Check Hostinger control panel thoroughly
2. Contact Hostinger support
3. Check your hosting plan email/confirmation - IP might be there

### Problem: "Site Not Found" After DNS Setup

**This is normal!** It means:
- ✅ DNS is working (domain points to Hostinger)
- ⚠️ Your app is not deployed yet
- **Next step**: Upload and deploy your app (follow main deployment guide)

---

## 📝 Quick Checklist

- [ ] Got Hostinger server IP address
- [ ] Chose Option 1 (Hostinger nameservers) OR Option 2 (Namecheap nameservers)
- [ ] Added DNS A record:
  - Type: `A`
  - Name: `app` (for app.newyorkgoldmarket.com)
  - Points to: Hostinger IP
- [ ] Waited 1-2 hours for DNS propagation
- [ ] Tested: `http://app.newyorkgoldmarket.com` (should reach Hostinger)
- [ ] Installed SSL certificate in Hostinger
- [ ] Ready to deploy app!

---

## 💡 Recommendation

**Use Option 1** (Hostinger nameservers) because:
- ✅ Easier to manage (everything in one place)
- ✅ Better integration with Hostinger services
- ✅ SSL setup is easier
- ✅ Less configuration needed

---

## 🎯 Summary: What to Fill Right Now

Since you're already in Hostinger's DNS management page:

1. **Type**: `A` ✅ (already correct)
2. **Name**: Change from `@` to `app`
3. **Points to**: Get your Hostinger server IP and paste it here
4. **TTL**: `14400` ✅ (already correct)
5. **Click**: "Add Record"

**Then**: Wait 1-2 hours, and your subdomain will point to Hostinger!

Need help finding the Hostinger IP? Check your hosting account details or contact Hostinger support.



