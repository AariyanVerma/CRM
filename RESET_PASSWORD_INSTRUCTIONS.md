# Admin Password Reset Instructions

## Method 1: Using API Endpoint (Easiest)

1. Make a POST request to: `https://your-domain:3000/api/admin/reset-password`

   Using curl:
   ```bash
   curl -X POST https://192.168.1.108:3000/api/admin/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-admin-email@example.com",
       "newPassword": "your-new-password",
       "secretKey": "RESET_ADMIN_2024"
     }'
   ```

   Or using a tool like Postman, or create an HTML file:

2. Create a file `reset-password.html` in your project root:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Reset Admin Password</title>
   </head>
   <body>
     <h1>Reset Admin Password</h1>
     <form id="resetForm">
       <label>Email: <input type="email" id="email" required></label><br><br>
       <label>New Password: <input type="password" id="password" required minlength="6"></label><br><br>
       <label>Secret Key: <input type="text" id="secretKey" value="RESET_ADMIN_2024"></label><br><br>
       <button type="submit">Reset Password</button>
     </form>
     <div id="result"></div>
     
     <script>
       document.getElementById('resetForm').addEventListener('submit', async (e) => {
         e.preventDefault();
         const email = document.getElementById('email').value;
         const password = document.getElementById('password').value;
         const secretKey = document.getElementById('secretKey').value;
         
         try {
           const response = await fetch('https://192.168.1.108:3000/api/admin/reset-password', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email, newPassword: password, secretKey })
           });
           
           const data = await response.json();
           document.getElementById('result').innerHTML = 
             response.ok ? `<p style="color: green;">✅ ${data.message}</p>` : 
             `<p style="color: red;">❌ ${data.message}</p>`;
         } catch (error) {
           document.getElementById('result').innerHTML = 
             `<p style="color: red;">Error: ${error.message}</p>`;
         }
       });
     </script>
   </body>
   </html>
   ```

## Method 2: Using Script

1. Edit `scripts/reset-admin-password.ts` and change the `newPassword` variable to your desired password
2. Run: `npx tsx scripts/reset-admin-password.ts`

## ⚠️ IMPORTANT SECURITY NOTES:

1. **DELETE** `app/api/admin/reset-password/route.ts` after resetting your password
2. **DELETE** `scripts/reset-admin-password.ts` after use
3. Change your password to something secure after logging in
4. The secret key in the API endpoint is temporary - change it if you want more security


