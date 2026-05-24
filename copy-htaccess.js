// Script to copy .htaccess file to build directory after build
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '.htaccess');
const destFile = path.join(__dirname, 'build', '.htaccess');

try {
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error('Error: .htaccess file not found in project root');
    process.exit(1);
  }

  // Check if build directory exists
  if (!fs.existsSync(path.join(__dirname, 'build'))) {
    console.error('Error: build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Copy .htaccess to build directory
  fs.copyFileSync(sourceFile, destFile);
  console.log('✓ Successfully copied .htaccess to build directory');
} catch (error) {
  console.error('Error copying .htaccess file:', error.message);
  process.exit(1);
}
