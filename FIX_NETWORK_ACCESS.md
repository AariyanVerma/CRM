# Fix: Page Keeps Loading - Network Access Issue

## The Problem
When accessing `https://192.168.1.108:3000` from your tablet, the page just keeps loading without showing anything.

## Most Likely Cause: Windows Firewall

Windows Firewall is probably blocking incoming connections on port 3000.

## Quick Fix (Run as Administrator)

Open PowerShell as Administrator and run:

```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## Manual Firewall Fix

1. **Open Windows Defender Firewall:**
   - Press `Win + R`
   - Type: `wf.msc` and press Enter

2. **Create Inbound Rule:**
   - Click **Inbound Rules** in left panel
   - Click **New Rule...** in right panel
   - Select **Port** → **Next**
   - Select **TCP**
   - Enter port: **3000**
   - Select **Allow the connection** → **Next**
   - Check all three (Domain, Private, Public) → **Next**
   - Name: **Next.js Dev Server**
   - Click **Finish**

3. **Restart your dev server:**
   ```bash
   npm run dev:https
   ```

## Verify Server is Running

**Check if server is listening:**
```powershell
netstat -an | findstr :3000
```

**Should show:**
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING
```

If you see `127.0.0.1:3000` instead of `0.0.0.0:3000`, the server isn't binding to all interfaces.

## Test from Laptop First

Before testing on tablet:

1. **Test localhost:**
   - Open `https://localhost:3000` on laptop
   - Should work immediately

2. **Test network IP:**
   - Open `https://192.168.1.108:3000` on laptop
   - Accept security warning
   - If this works, firewall is fixed

3. **Then test on tablet:**
   - Open `https://192.168.1.108:3000` on tablet
   - Should now work

## Which IP to Use?

Your laptop has two IPs:
- `192.168.56.1` - VirtualBox/Hyper-V adapter (usually not on WiFi)
- `192.168.1.108` - WiFi adapter (this is the one you want)

**Use `192.168.1.108`** - this is your WiFi network IP.

## Still Not Working?

1. **Verify both devices on same WiFi:**
   - Check WiFi network names match exactly
   - Both should show same network name

2. **Try the other IP:**
   - `https://192.168.56.1:3000` (if 192.168.1.108 doesn't work)

3. **Check server logs:**
   - Look for connection attempts in terminal
   - If you see requests, server is working but browser can't connect

4. **Restart everything:**
   - Stop server (Ctrl+C)
   - Restart server: `npm run dev:https`
   - Restart tablet WiFi
   - Try again

## Certificates Updated ✅

Certificates have been regenerated to include both IPs:
- ✅ `192.168.56.1`
- ✅ `192.168.1.108`
- ✅ `127.0.0.1` (localhost)

So either IP should work once firewall is fixed.




