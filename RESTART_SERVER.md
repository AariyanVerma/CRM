# Restart Server with HTTPS

## The Problem
HTTPS stopped working on localhost. The server needs to be restarted with the correct command.

## Solution: Restart the Server

### Step 1: Stop Current Server
Press `Ctrl+C` in the terminal where the server is running.

### Step 2: Start with HTTPS
Run this command:

```bash
npm run dev:https
```

### Step 3: Verify HTTPS is Working

You should see in the terminal:
```
✓ HTTPS enabled for development
✓ Server will be accessible from network devices
```

### Step 4: Test on Laptop

Open in browser:
- `https://localhost:3000`

You should see:
- A security warning (normal for self-signed certificates)
- Click "Advanced" → "Proceed to localhost"
- The app should load

## If HTTPS Still Doesn't Work

### Check Certificates Exist
```bash
dir localhost*.pem
```

Should show:
- `localhost-key.pem`
- `localhost.pem`

### Regenerate Certificates
If certificates are missing or corrupted:

```bash
npm run setup:https
```

Then restart:
```bash
npm run dev:https
```

## Common Issues

**"Port 3000 already in use":**
- Another process is using port 3000
- Stop all Node processes or use a different port

**"Certificate error":**
- Certificates might be corrupted
- Run `npm run setup:https` again

**"Server starts but HTTPS doesn't work":**
- Make sure you're using `npm run dev:https` not `npm run dev`
- Check terminal for "✓ HTTPS enabled" message



