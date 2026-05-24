# Production Build Instructions

This guide will help you create an optimized production ZIP file for deployment.

## Quick Start

Run the following command to build and create the production ZIP:

```bash
npm run build:zip
```

Or manually:

```bash
npm run build
node create-production-zip.js
```

## What Gets Included

The production ZIP (`fire-guide-production.zip`) includes:

✅ **Build Output** (`build/` directory):
   - `index.html` - Main HTML file
   - `assets/` - All optimized images, fonts, and static assets
   - `js/` - Minified JavaScript bundles
   - `.htaccess` - Apache configuration for SPA routing

❌ **Excluded** (to keep ZIP small):
   - `node_modules/` - Dependencies (not needed for deployment)
   - Source maps (`.map` files)
   - Test files
   - Development files (`.git`, `.env.example`, docs)
   - Source code (`src/` directory)
   - Configuration files (`vite.config.ts`, `package.json`, etc.)

## Build Optimization

The build process automatically:

1. **Minifies** all JavaScript and CSS using esbuild
2. **Removes source maps** for smaller file size
3. **Code splits** vendor libraries for better caching
4. **Optimizes assets** (images, fonts)
5. **Uses relative paths** for flexible deployment

## Deployment

### For cPanel / Shared Hosting:

1. Extract the ZIP file
2. Upload all contents to your `public_html` directory (or subdirectory)
3. Ensure `.htaccess` is uploaded (it's included in the ZIP)
4. Your site should be live!

### File Structure After Extraction:

```
public_html/
├── index.html
├── .htaccess
├── assets/
│   └── [optimized assets]
└── js/
    └── [minified JavaScript bundles]
```

## ZIP File Size

The production ZIP is optimized to be as small as possible:
- No development dependencies
- No source maps
- Minified and compressed assets
- Only production-ready files

Typical size: **2-5 MB** (depending on assets)

## Troubleshooting

### If ZIP creation fails:

**Windows:** Uses PowerShell `Compress-Archive` (built-in)

**Linux/Mac:** Requires `zip` utility:
```bash
# Install zip (if not available)
# Ubuntu/Debian:
sudo apt-get install zip

# macOS:
brew install zip
```

### Alternative: Use archiver package

If PowerShell/zip command fails, install archiver:
```bash
npm install archiver --save-dev
```

Then modify `create-production-zip.js` to use archiver instead.

## Manual ZIP Creation

If the script doesn't work, you can manually create the ZIP:

1. Run `npm run build`
2. Navigate to the `build` directory
3. Select all files and folders
4. Create a ZIP file named `fire-guide-production.zip`
5. Ensure `.htaccess` is included

## Verification

After creating the ZIP:

1. Extract it to a test directory
2. Verify `index.html` exists
3. Verify `.htaccess` exists
4. Check that `assets/` and `js/` folders contain files
5. Test in a local server if possible

---

**Ready to deploy!** 🚀
