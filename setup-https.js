// Simple HTTPS setup script for Next.js development
// This creates a self-signed certificate using Node.js (no OpenSSL required)

const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function setupHTTPS() {
  console.log('Setting up HTTPS for local development...\n');

  const certDir = path.join(__dirname);
  const keyPath = path.join(certDir, 'localhost-key.pem');
  const certPath = path.join(certDir, 'localhost.pem');

  // Get all local IP addresses for network access
  let ipAddresses = ['127.0.0.1'];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddresses.push(iface.address);
        }
      }
    }
  } catch (e) {
    // Use default
  }
  
  // Remove duplicates
  ipAddresses = [...new Set(ipAddresses)];
  const primaryIP = ipAddresses.find(ip => ip !== '127.0.0.1') || '127.0.0.1';

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✓ Certificates already exist');
    console.log(`  Key: ${keyPath}`);
    console.log(`  Cert: ${certPath}`);
    console.log(`  IPs: ${ipAddresses.join(', ')}\n`);
    console.log('To regenerate with updated IPs, delete these files and run this script again.\n');
    console.log('Deleting old certificates to regenerate with all IPs...\n');
    fs.unlinkSync(keyPath);
    fs.unlinkSync(certPath);
  } else {
    console.log('Generating self-signed certificate...');
    
    try {
      // Generate certificate using selfsigned package (async in v5.0+)
      const attrs = [{ name: 'commonName', value: 'localhost' }];
      // Build altNames array with all IP addresses
      const altNames = [
        { type: 2, value: 'localhost' },
        { type: 2, value: '*.localhost' },
      ];
      
      // Add all IP addresses
      for (const ip of ipAddresses) {
        altNames.push({ type: 7, ip });
      }
      
      const options = {
        keySize: 2048,
        algorithm: 'sha256',
        extensions: [
          {
            name: 'subjectAltName',
            altNames: altNames,
          },
        ],
      };
      
      // Await the promise
      const pems = await selfsigned.generate(attrs, options);

      // Write certificate and key to files
      fs.writeFileSync(certPath, pems.cert);
      fs.writeFileSync(keyPath, pems.private);

      console.log('\n✓ Certificates generated successfully!');
      console.log(`  Key: ${keyPath}`);
      console.log(`  Cert: ${certPath}`);
      console.log(`  IPs included: ${ipAddresses.join(', ')}\n`);
      console.log('Note: Certificate is valid for localhost and all your network IPs');
      console.log(`For network access, use: https://${primaryIP}:3000`);
      console.log('You may need to accept the security warning.\n');
    } catch (error) {
      console.error('\n✗ Failed to generate certificates');
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  console.log('Next steps:');
  console.log('1. Run: npm run dev:https');
  console.log(`2. Access via: https://localhost:3000 or https://${primaryIP}:3000`);
  console.log('3. Accept the security warning in your browser');
  console.log(`4. On your tablet, use: https://${primaryIP}:3000`);
  if (ipAddresses.length > 2) {
    console.log(`   (Or try: ${ipAddresses.filter(ip => ip !== '127.0.0.1').join(', ')})\n`);
  } else {
    console.log('');
  }
}

// Run the async function
setupHTTPS().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
