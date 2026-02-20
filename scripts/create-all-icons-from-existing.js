/**
 * Create all required icon files from existing icon-192.png and icon-512.png
 * This script uses sharp to resize existing icons to all required sizes
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Check if sharp is available
let sharpAvailable = false;
try {
  require.resolve('sharp');
  sharpAvailable = true;
} catch (e) {
  console.log('⚠️  Sharp not installed. Will provide manual instructions.');
}

async function createIcons() {
  const icon192Path = path.join(publicDir, 'icon-192.png');
  const icon512Path = path.join(publicDir, 'icon-512.png');

  // Check if source icons exist
  if (!fs.existsSync(icon192Path)) {
    console.error('❌ icon-192.png not found in public folder');
    return;
  }

  if (!fs.existsSync(icon512Path)) {
    console.error('❌ icon-512.png not found in public folder');
    return;
  }

  if (!sharpAvailable) {
    console.log('\n📝 Manual Instructions:');
    console.log('Since sharp is not installed, please resize your icons manually:');
    console.log('\n1. Use an online tool: https://www.iloveimg.com/resize-image');
    console.log('2. Upload icon-192.png and create these sizes:');
    console.log('   - 70x70 → mstile-70x70.png');
    console.log('   - 144x144 → mstile-144x144.png');
    console.log('   - 150x150 → mstile-150x150.png');
    console.log('3. Upload icon-512.png and create:');
    console.log('   - 310x310 → mstile-310x310.png');
    console.log('   - 310x150 → mstile-310x150.png (crop to wide)');
    console.log('4. Copy icon-192.png to icon-maskable-192.png');
    console.log('5. Copy icon-512.png to icon-maskable-512.png');
    return;
  }

  console.log('🔄 Creating all icon files from existing icons...\n');

  try {
    // Create maskable icons (just copy existing ones)
    console.log('✓ Creating maskable icons...');
    await sharp(icon192Path).toFile(path.join(publicDir, 'icon-maskable-192.png'));
    await sharp(icon512Path).toFile(path.join(publicDir, 'icon-maskable-512.png'));

    // Create Windows tiles from icon-192.png
    console.log('✓ Creating Windows tiles...');
    await sharp(icon192Path).resize(70, 70).toFile(path.join(publicDir, 'mstile-70x70.png'));
    await sharp(icon192Path).resize(144, 144).toFile(path.join(publicDir, 'mstile-144x144.png'));
    await sharp(icon192Path).resize(150, 150).toFile(path.join(publicDir, 'mstile-150x150.png'));

    // Create larger Windows tiles from icon-512.png
    await sharp(icon512Path).resize(310, 310).toFile(path.join(publicDir, 'mstile-310x310.png'));
    
    // Create wide tile (310x150) - crop from center
    await sharp(icon512Path)
      .resize(310, 310, { fit: 'cover', position: 'center' })
      .extract({ left: 0, top: 80, width: 310, height: 150 })
      .toFile(path.join(publicDir, 'mstile-310x150.png'));

    console.log('\n✅ All icons created successfully!');
    console.log('\nCreated files:');
    console.log('  - icon-maskable-192.png');
    console.log('  - icon-maskable-512.png');
    console.log('  - mstile-70x70.png');
    console.log('  - mstile-144x144.png');
    console.log('  - mstile-150x150.png');
    console.log('  - mstile-310x310.png');
    console.log('  - mstile-310x150.png');
  } catch (error) {
    console.error('❌ Error creating icons:', error.message);
    console.log('\n📝 Please create icons manually using the instructions above.');
  }
}

createIcons();

