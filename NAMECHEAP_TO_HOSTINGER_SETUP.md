# Setting Up Namecheap Domain with Hostinger Hosting

Since your domain is registered with **Namecheap** but you're hosting on **Hostinger**, here's exactly what to do:

---

## Option 1: Point Domain to Hostinger (Recommended) ⭐

This is the **easiest** method - you'll manage DNS at Hostinger.

### Step 1: Get Hostinger Nameservers

1. **In Hostinger Control Panel**, go to **Domains**
2. **Find** your domain section (or add your domain)
3. **Look for** "Nameservers" or "DNS Settings"
4. **Note down** the nameservers (usually 2-4 nameservers)

   **Common Hostinger nameservers:**
   - `ns1.dns-parking.com`
   - `ns2.dns-parking.com`
   
   **OR** they might be:
   - `ns1.hostinger.com`
   - `ns2.hostinger.com`
   - `ns3.hostinger.com`
   - `ns4.hostinger.com`

### Step 2: Update Nameservers at Namecheap

1. **Go to**: https://www.namecheap.com
2. **Login** to your Namecheap account
3. **Go to**: **Domain List** → Click **Manage** next to your domain
4. **Find** "Nameservers" section
5. **Select** "Custom DNS" (instead of "Namecheap BasicDNS")
6. **Enter** Hostinger's nameservers (the ones you got in Step 1)
7. **Click** "Save" or "Update"

### Step 3: Wait for DNS Propagation

- **Wait** 24-48 hours for DNS to propagate
- Usually works within 2-4 hours
- You can check status at: https://www.whatsmydns.net

### Step 4: Manage DNS at Hostinger

After nameservers are updated, you'll manage DNS records at **Hostinger** (not Namecheap).

**In Hostinger DNS page**, you'll need to add:

**A Record** (if you have Hostinger hosting):
- **Type**: A
- **Name**: @
- **Points to**: Your Hostinger server IP (get from Hostinger support or hosting panel)
- **TTL**: 14400

**OR if Hostinger gives you a hostname**:
- **Type**: CNAME
- **Name**: @
- **Points to**: `yourdomain.hostinger.com` (or whatever Hostinger provides)

---

## Option 2: Keep DNS at Namecheap (Alternative)

If you prefer to manage DNS at Namecheap, you can keep nameservers at Namecheap and just point to Hostinger.

### Step 1: Get Hostinger Server IP

1. **Contact Hostinger support** and ask: "What IP address should I use for my domain DNS A record?"
2. **OR** check your Hostinger hosting account details
3. **OR** if you have VPS, check your server IP in control panel

### Step 2: Add A Record at Namecheap

1. **Go to**: https://www.namecheap.com
2. **Login** → **Domain List** → **Manage** your domain
3. **Go to**: **Advanced DNS** tab
4. **In "Host Records"** section, click **Add New Record**
5. **Fill in**:
   - **Type**: A Record
   - **Host**: @ (for root domain) or `www` (for www subdomain)
   - **Value**: Your Hostinger server IP (e.g., `185.123.45.67`)
   - **TTL**: Automatic (or 1800)
6. **Click** the checkmark to save

### Step 3: Add CNAME for www (Optional)

If you want `www.yourdomain.com` to work:

1. **Add another record**:
   - **Type**: CNAME Record
   - **Host**: www
   - **Value**: @ (or your root domain)
   - **TTL**: Automatic

### Step 4: Wait for DNS Propagation

- **Wait** 2-24 hours for changes to take effect
- Check at: https://www.whatsmydns.net

---

## Which Option Should You Choose?

### Choose Option 1 (Point to Hostinger) if:
- ✅ You want to manage everything in one place (Hostinger)
- ✅ You're using Hostinger's hosting services
- ✅ You want simpler setup
- ✅ Hostinger provides nameservers

### Choose Option 2 (Keep DNS at Namecheap) if:
- ✅ You want to keep DNS management at Namecheap
- ✅ You're using other services that need DNS records
- ✅ You prefer Namecheap's DNS interface
- ✅ You have email or other services at Namecheap

---

## For Your Current Situation

**Since you're looking at Hostinger's DNS page**, I recommend:

### If Hostinger is your hosting provider:

1. **Get Hostinger nameservers** (from Hostinger control panel)
2. **Update nameservers at Namecheap** (Option 1 above)
3. **Then come back to Hostinger DNS page** and add:
   - **Type**: A
   - **Name**: @
   - **Points to**: Your Hostinger server IP (ask support if you don't know)
   - **TTL**: 14400

### If you want to keep DNS at Namecheap:

1. **Close** the Hostinger DNS page (you don't need it)
2. **Go to Namecheap** → **Advanced DNS**
3. **Add A record** pointing to Hostinger IP (Option 2 above)

---

## Finding Your Hostinger Server IP

**If you don't know your Hostinger server IP:**

1. **Contact Hostinger Support**:
   - Live chat or ticket
   - Ask: "I need the IP address for DNS A record for my domain"
   
2. **Check Hosting Account**:
   - Hostinger Control Panel → **Websites** → Your website
   - Look for "Server IP" or "IP Address"
   
3. **Check VPS Details** (if you have VPS):
   - **VPS** section → Your VPS → **IP Address**

---

## Important Notes

⚠️ **Don't add DNS records in BOTH places!**
- If nameservers point to Hostinger → Manage DNS at Hostinger
- If nameservers point to Namecheap → Manage DNS at Namecheap

⚠️ **DNS Propagation takes time**
- Usually 2-24 hours
- Can take up to 48 hours
- Be patient!

✅ **SSL Certificate**
- After DNS is set up, install SSL at Hostinger
- Let's Encrypt is free and automatic

---

## Quick Summary

**For your setup (Namecheap domain + Hostinger hosting):**

1. **Get Hostinger nameservers** from Hostinger control panel
2. **Update nameservers at Namecheap** to point to Hostinger
3. **Wait 2-24 hours** for DNS propagation
4. **Then manage DNS at Hostinger** (add A record with Hostinger IP)
5. **Install SSL** at Hostinger

**OR** (if you prefer):

1. **Keep nameservers at Namecheap**
2. **Add A record at Namecheap** pointing to Hostinger IP
3. **Wait for DNS propagation**

Both methods work! Option 1 is usually easier if Hostinger is your main hosting provider.

