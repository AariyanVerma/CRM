# Quick HTTPS Setup (No ngrok Required)

## Option 1: Simple Setup (Recommended)

### Step 1: Generate SSL Certificates

Run this command in your project directory:

```bash
npm run setup:https
```

This will create self-signed certificates for localhost.

### Step 2: Start Development Server with HTTPS

```bash
npm run dev:https
```

### Step 3: Access from Your Tablet

1. Find your laptop's IP address:
   - Windows: Open PowerShell and run `ipconfig`
   - Look for "IPv4 Address" (e.g., `192.168.1.100`)

2. On your tablet, open:
   ```
   https://192.168.1.100:3000
   ```
   (Replace with your actual IP)

3. Accept the security warning (this is normal for self-signed certificates)

4. Navigate to `/scan` and NFC should work!

---

## Option 2: Manual Certificate Generation (If script fails)

### Windows (using Git Bash or PowerShell):

```bash
# Generate private key
openssl genrsa -out localhost-key.pem 2048

# Generate certificate
openssl req -new -x509 -key localhost-key.pem -out localhost.pem -days 365 -subj "/CN=localhost"
```

### Then run:
```bash
npm run dev:https
```

---

## Option 3: Use ngrok (If you want to sign up)

1. Sign up at https://dashboard.ngrok.com/signup (free)
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Run: `ngrok config add-authtoken YOUR_TOKEN`
4. Run: `npx ngrok http 3000`
5. Use the HTTPS URL on your tablet

---

## Troubleshooting

**"Certificate error" on tablet:**
- This is normal for self-signed certificates
- Click "Advanced" → "Proceed to [your-ip]" (or similar)
- The browser will remember your choice

**"Connection refused":**
- Make sure your laptop and tablet are on the same WiFi network
- Check Windows Firewall allows port 3000
- Try accessing from laptop first: `https://localhost:3000`

**"NFC still not working":**
- Make sure you're using `https://` not `http://`
- Check browser console for errors
- Ensure NFC is enabled in Android settings

---

## Notes

- Self-signed certificates are only for development
- You'll see security warnings - this is expected
- The certificates work for both `localhost` and your local IP address










