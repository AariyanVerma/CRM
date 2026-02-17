# Network Access Setup

## Fixed Issues

1. ✅ **searchParams Promise error** - Fixed in login page
2. ✅ **Network binding** - Server now binds to all interfaces (0.0.0.0)
3. ✅ **Cross-origin warnings** - Added allowedDevOrigins configuration

## How to Access from Tablet

### Step 1: Restart the Server

Stop the current server (Ctrl+C) and restart:

```bash
npm run dev:https
```

### Step 2: Find Your IP Address

Your IP addresses detected:
- `192.168.56.1` (from certificate generation)
- `192.168.1.108` (from cross-origin warnings)

### Step 3: Access from Tablet

On your Samsung Galaxy Tab, open:
```
https://192.168.56.1:3000
```

OR

```
https://192.168.1.108:3000
```

(Use whichever IP is your laptop's current network IP)

### Step 4: Accept Security Warning

1. You'll see a security warning (normal for self-signed certificates)
2. Tap "Advanced" or "Details"
3. Tap "Proceed to [your-ip]" or "Accept the Risk and Continue"

### Step 5: Test NFC

1. Navigate to `/scan`
2. You should see "Tap Your Membership Card"
3. Tap your NFC card
4. It should automatically read and redirect

## Troubleshooting

**Can't connect from tablet:**
1. Make sure both devices are on the same WiFi network
2. Check Windows Firewall - allow port 3000
3. Try both IP addresses (192.168.56.1 and 192.168.1.108)
4. Verify server is running and shows "✓ HTTPS enabled"

**Still only works on localhost:**
1. Make sure you restarted the server after changes
2. Check that `HOSTNAME=0.0.0.0` is in the dev:https script
3. Try accessing `https://[your-ip]:3000` from your laptop's browser first

**Firewall Issues:**
- Windows Firewall might block incoming connections
- Go to Windows Defender Firewall → Allow an app
- Add Node.js or allow port 3000



