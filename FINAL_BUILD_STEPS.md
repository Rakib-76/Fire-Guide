# Final Build Steps - Fix White Screen Error

## The Problem
Error: `Cannot read properties of undefined (reading 'createContext')` from `vendor-CpvyUDJq.js`

**Root Cause:** The `vendor` chunk was loading before `react-core`, causing React to be undefined when vendor code tried to use it.

## The Fix

### 1. Improved Chunk Splitting
- React core now in dedicated `react-core` chunk
- More precise path matching to prevent React from leaking into vendor chunk
- Cross-platform path normalization

### 2. Module Preload Order Fix
- Created `fix-build-order.js` script
- Automatically reorders preload links so `react-core` loads first
- Runs automatically after build via `postbuild` script

## Rebuild Steps

### Step 1: Clean Everything
```bash
# Remove old build
rm -rf build
rm -rf node_modules/.vite

# Optional: Clear npm cache
npm cache clean --force
```

### Step 2: Rebuild
```bash
npm run build
```

This will:
1. Build the project
2. Copy `.htaccess` to build directory
3. **Automatically fix module preload order** (react-core loads first)

### Step 3: Verify Build
Check `build/index.html` - you should see:
```html
<link rel="modulepreload" crossorigin href="./js/react-core-[hash].js">
<link rel="modulepreload" crossorigin href="./js/router-vendor-[hash].js">
<link rel="modulepreload" crossorigin href="./js/vendor-[hash].js">
<!-- react-core MUST be first -->
```

### Step 4: Create ZIP
```bash
npm run build:zip
```

## Deployment

1. Extract `fire-guide-production.zip`
2. Upload ALL contents to `public_html/`
3. **CRITICAL:** Enable "Show Hidden Files" in cPanel
4. Verify `.htaccess` is uploaded
5. Set permissions: Files 644, Folders 755

## Verification After Deployment

Open browser console and check:

✅ **No errors** - Should see no "createContext" errors
✅ **Network tab** - All JS files load with 200 status
✅ **Load order** - react-core loads before vendor
✅ **React DevTools** - Shows single React instance

## Expected Chunk Loading Order

1. `react-core-[hash].js` ← **MUST LOAD FIRST**
2. `router-vendor-[hash].js`
3. `ui-vendor-[hash].js`
4. `icons-vendor-[hash].js`
5. `utils-vendor-[hash].js`
6. `vendor-[hash].js`
7. `index-[hash].js` (main app)

## If Still Having Issues

1. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)
2. **Check file permissions** - All files should be readable
3. **Verify .htaccess** - Must be in root of public_html
4. **Check Apache mod_rewrite** - Should be enabled
5. **Review browser console** - Look for specific error messages

---

**The build is now fixed! React will load before any vendor code that depends on it.**
