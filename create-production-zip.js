const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

// Simple ZIP creation using Node.js built-in modules
// Note: This is a basic implementation. For production, consider using archiver package.

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type] || ''}${message}${colors.reset}`);
}

async function createProductionZip() {
  try {
    log('\n🚀 Starting production build process...', 'info');
    
    // Step 1: Clean previous build
    log('📦 Cleaning previous build...', 'warning');
    const buildDir = path.join(__dirname, 'build');
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
    
    // Step 2: Run production build
    log('🔨 Running production build...', 'warning');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      log('✓ Build completed successfully!', 'success');
    } catch (error) {
      log('✗ Build failed!', 'error');
      process.exit(1);
    }
    
    // Step 3: Verify build directory exists
    if (!fs.existsSync(buildDir)) {
      log('✗ Build directory not found!', 'error');
      process.exit(1);
    }
    
    // Step 4: Remove source maps if any exist
    log('🧹 Cleaning up source maps and unnecessary files...', 'warning');
    function cleanBuildDir(dir) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          cleanBuildDir(filePath);
        } else {
          // Remove source maps
          if (file.endsWith('.map')) {
            fs.unlinkSync(filePath);
            log(`  Removed source map: ${file}`, 'warning');
          }
        }
      });
    }
    cleanBuildDir(buildDir);
    
    // Step 5: Create ZIP using PowerShell (Windows) or zip command (Unix)
    log('📦 Creating production ZIP file...', 'warning');
    const zipPath = path.join(__dirname, 'fire-guide-production.zip');
    
    // Remove existing ZIP if it exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    // Use PowerShell Compress-Archive on Windows
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const buildPath = path.resolve(buildDir).replace(/\\/g, '/');
      const zipPathResolved = path.resolve(zipPath).replace(/\\/g, '/');
      
      try {
        execSync(
          `powershell -Command "Compress-Archive -Path '${buildPath}\\*' -DestinationPath '${zipPathResolved}' -Force"`,
          { stdio: 'inherit', cwd: __dirname }
        );
        
        const stats = fs.statSync(zipPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        
        log('\n✅ Production ZIP created successfully!', 'success');
        log(`📊 File size: ${sizeMB} MB`, 'info');
        log(`📁 Location: ${zipPath}`, 'info');
        log('\n🎉 Ready for deployment!', 'success');
        log('\n📝 Contents included:', 'info');
        log('  - All build output files', 'info');
        log('  - .htaccess file (if exists)', 'info');
        log('  - Optimized and minified assets', 'info');
        log('  - No source maps, node_modules, or dev files', 'info');
      } catch (error) {
        log(`✗ ZIP creation failed: ${error.message}`, 'error');
        log('\n💡 Alternative: Install archiver package:', 'warning');
        log('   npm install archiver --save-dev', 'warning');
        process.exit(1);
      }
    } else {
      // Use zip command on Unix/Linux/Mac
      try {
        execSync(
          `cd ${buildDir} && zip -r ${zipPath} . -q`,
          { stdio: 'inherit', cwd: __dirname }
        );
        
        const stats = fs.statSync(zipPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        
        log('\n✅ Production ZIP created successfully!', 'success');
        log(`📊 File size: ${sizeMB} MB`, 'info');
        log(`📁 Location: ${zipPath}`, 'info');
        log('\n🎉 Ready for deployment!', 'success');
      } catch (error) {
        log(`✗ ZIP creation failed: ${error.message}`, 'error');
        log('\n💡 Please install zip utility or archiver package:', 'warning');
        log('   npm install archiver --save-dev', 'warning');
        process.exit(1);
      }
    }
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

createProductionZip();
