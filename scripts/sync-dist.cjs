const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../artifacts/iic-study-app-replit/dist/public');
const destDir = path.resolve(__dirname, '../dist');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('✓ Successfully synchronized build artifacts to root dist folder.');
}
