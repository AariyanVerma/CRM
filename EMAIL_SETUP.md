# Gmail Email Setup Guide

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
FROM_EMAIL="New York Gold Market <your-email@gmail.com>"
```

## How to Get Gmail App Password

1. **Enable 2-Step Verification** (if not already enabled):
   - Go to your Google Account: https://myaccount.google.com/
   - Navigate to Security → 2-Step Verification
   - Follow the prompts to enable it

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" as the app
   - Select "Other (Custom name)" as the device
   - Enter a name like "NY Gold Market CRM"
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Add to .env.local**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop  # Spaces will be automatically removed
   FROM_EMAIL="New York Gold Market <your-email@gmail.com>"
   ```

## Testing Email Configuration

The email service will automatically be used when:
- Users request password reset OTP
- OTP is sent via Gmail SMTP

## Troubleshooting

### "Invalid login" error
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the App Password doesn't have spaces

### "Connection timeout" error
- Check your firewall/network settings
- Verify Gmail SMTP is not blocked
- Try using `smtp.gmail.com` with port 587 (already configured)

### Emails not sending
- Check server logs for detailed error messages
- Verify all environment variables are set correctly
- Test with a simple email first

## Security Notes

- **Never commit** `.env.local` to git (already in .gitignore)
- App Passwords are safer than regular passwords
- Each app should have its own App Password
- You can revoke App Passwords anytime from Google Account settings

