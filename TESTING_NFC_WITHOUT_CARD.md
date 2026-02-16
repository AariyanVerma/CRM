# Testing NFC Without a Physical Card

## Option 1: Use Manual Entry (Recommended for Now)

You can test the entire transaction flow using manual entry:

1. **Create a test customer:**
   - Go to `/customers/new`
   - Fill in customer details
   - Create the customer

2. **Issue a card (to get a token):**
   - Go to the customer detail page
   - Click "Issue New Card"
   - Copy the token shown (64-character hex string)

3. **Test the transaction flow:**
   - Go to `/scan`
   - Scroll down to "Enter Card Token Manually"
   - Paste the token you copied
   - Click "Start Transaction"
   - This will take you to the transaction page where you can test everything

## Option 2: Use Another Phone as NFC Tag

If you have another Android phone with NFC:

1. **Install NFC Tools** (free app on Google Play)

2. **Create an NDEF URL:**
   - Open NFC Tools
   - Go to "Write" tab
   - Select "Add a record" → "URL/URI"
   - Enter: `https://192.168.1.108:3000/scan/YOUR_TOKEN_HERE`
   - Replace `YOUR_TOKEN_HERE` with a token from step 2 above

3. **Write to phone:**
   - Use NFC Tools to write the URL
   - Some phones can act as NFC tags (check if your phone supports "NFC Tag" mode)

4. **Test scanning:**
   - On your tablet, go to `/scan`
   - Tap the other phone (with the written URL) on your tablet
   - It should detect and redirect

## Option 3: Get a Blank NFC Tag

You can order cheap NFC tags online:

- **Amazon**: Search "NTAG216 NFC tags" or "NFC stickers"
- **Cost**: Usually $5-10 for a pack of 5-10 tags
- **Recommended**: NTAG216 (works best with Web NFC)

Once you have tags:
1. Issue a card in the system (get the token)
2. Use NFC Tools app to write the URL to the tag
3. Test by tapping on your tablet

## Option 4: Test NFC Scanning UI (Without Card)

You can test that the NFC scanning interface works:

1. **Go to `/scan` on your tablet**
2. **Click "Start NFC Scan"**
3. **You should see:**
   - "Tap Your Membership Card" message
   - Spinning animation
   - The UI is ready and waiting

4. **Check browser console (F12):**
   - Should see: "Starting NFC scan..."
   - Should see: "✓ NFC scan active - ready to read tags"
   - This confirms the NFC API is working

5. **The scanner will wait indefinitely** until you tap an NDEF card

## Quick Test Token

To quickly test the manual entry flow, you can use this test token format:
- Any 64-character hex string (0-9, a-f)
- Example: `a6e2c3428c42f5f2a2c8828bf15ad05d220a0d75cf80799f7ef5153e8c4019cd`

But note: This token won't exist in your database, so you'll get an "Invalid Card" error. To test properly:
1. Create a real customer
2. Issue a real card
3. Use that token for testing

## What You Can Test Right Now

✅ **Manual entry flow** - Full transaction system
✅ **NFC scanning UI** - Interface and waiting state
✅ **Transaction pages** - All pricing, DWT input, calculations
✅ **Print functionality** - 4x6 label generation
✅ **All other features** - Customer management, prices, etc.

❌ **Actual NFC card detection** - Requires NDEF-formatted card

## Recommendation

For now, use **Option 1 (Manual Entry)** to test the full system. The NFC scanning is just an alternative input method - the rest of the system works identically whether you scan or enter manually.

