# Fix npm install Issue

## Problem
The directory path contains spaces and special characters (`&`), which causes npm postinstall scripts to fail on Windows.

**Current path:**
```
NFC-Enabled Membership CRM & Scrap Valuation Transaction System
```

## Solution: Rename Directory

### Option 1: Rename via File Explorer (Easiest)
1. Close your terminal/IDE
2. Navigate to: `C:\Users\aariy\OneDrive\Documentos\Projects\New York Gold Market\`
3. Right-click the folder: `NFC-Enabled Membership CRM & Scrap Valuation Transaction System`
4. Select "Rename"
5. Change it to: `NFC-Membership-CRM` (or any name without spaces/special chars)
6. Reopen your IDE/terminal in the new location
7. Run `npm install` again

### Option 2: Rename via PowerShell
```powershell
cd "C:\Users\aariy\OneDrive\Documentos\Projects\New York Gold Market"
Rename-Item "NFC-Enabled Membership CRM & Scrap Valuation Transaction System" "NFC-Membership-CRM"
cd "NFC-Membership-CRM"
npm install
```

### Option 3: Workaround (if you can't rename)
If you must keep the current directory name, try:

1. **Clear npm cache and node_modules:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Recurse -Force package-lock.json
   npm cache clean --force
   ```

2. **Install with ignore-scripts (temporary workaround):**
   ```powershell
   npm install --ignore-scripts
   npm rebuild
   ```

   **Note:** This may cause some packages to not work correctly.

## Recommended Directory Names
- `NFC-Membership-CRM`
- `nfc-membership-crm`
- `NFC_CRM_System`
- `nfc-crm`

**Avoid:**
- ❌ Spaces
- ❌ Special characters (`&`, `!`, `@`, `#`, etc.)
- ❌ Unicode characters

## After Renaming
Once you've renamed the directory:
1. Open terminal in the new directory
2. Run: `npm install`
3. Continue with setup: `npm run db:generate && npm run db:push && npm run db:seed`

