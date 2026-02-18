# HTTPS Setup for Local Development

Web NFC API requires HTTPS (secure context) to work. When accessing your app over the network (e.g., `http://192.168.x.x:3000`), it's not considered secure.

## Quick Solution: Use ngrok

The easiest way to get HTTPS for local development:

### Install ngrok
```bash
npm install -g ngrok
# or
npx ngrok http 3000
```

### Run ngrok
```bash
ngrok http 3000
```

This will give you an HTTPS URL like `https://abc123.ngrok.io` that you can access from your tablet.

## Alternative: Local HTTPS with mkcert

### 1. Install mkcert
- Windows: `choco install mkcert` or download from https://github.com/FiloSottile/mkcert
- Mac: `brew install mkcert`
- Linux: See mkcert GitHub page

### 2. Create local CA
```bash
mkcert -install
```

### 3. Generate certificate
```bash
mkcert localhost 127.0.0.1 ::1 192.168.x.x
```
Replace `192.168.x.x` with your laptop's local IP address.

This creates:
- `localhost+3.pem` (certificate)
- `localhost+3-key.pem` (private key)

### 4. Update Next.js config

Create or update `next.config.js`:

```javascript
const fs = require('fs');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable HTTPS in development
  ...(process.env.NODE_ENV === 'development' && {
    server: {
      https: {
        key: fs.readFileSync(path.join(__dirname, 'localhost+3-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost+3.pem')),
      },
    },
  }),
}

module.exports = nextConfig
```

### 5. Update package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:https": "NODE_ENV=development next dev"
  }
}
```

### 6. Access via HTTPS
- On your laptop: `https://localhost:3000`
- On your tablet: `https://192.168.x.x:3000` (accept the security warning)

## Note on Security Warnings

When using self-signed certificates, browsers will show a security warning. This is normal for local development. Click "Advanced" → "Proceed to localhost" (or your IP).

## Testing NFC

Once HTTPS is set up:
1. Access the app via HTTPS from your tablet
2. Navigate to `/scan`
3. The NFC scanner should automatically start
4. Tap your membership card on the screen






