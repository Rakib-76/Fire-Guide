# React Build Fix for cPanel Deployment

## Problem
White screen with error: "Cannot read properties of undefined (reading 'createContext')"

## Root Causes Fixed

1. **Multiple React Instances** - Fixed by explicit aliasing and deduplication
2. **Incorrect Chunk Splitting** - React now loads in a single chunk
3. **Module Resolution Issues** - Added explicit React path resolution
4. **Build Output Issues** - Improved chunk naming and format

## Changes Made

### 1. Vite Configuration (`vite.config.ts`)

- ✅ Added explicit React aliases to force single instance
- ✅ Improved chunk splitting to keep React core together
- ✅ Enhanced deduplication for React, React-DOM, and jsx-runtime
- ✅ Set proper ES module format for browser compatibility
- ✅ Added module preload polyfill

### 2. Build Process

The build now:
- Ensures React loads first in `react-core` chunk
- Separates React Router into its own chunk
- Properly bundles all dependencies
- Uses relative paths for subdomain compatibility

## Rebuild Steps

1. **Clean previous build:**
   ```bash
   rm -rf build
   rm -rf node_modules/.vite
   ```

2. **Reinstall dependencies (optional but recommended):**
   ```bash
   npm install
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Verify build output:**
   - Check `build/index.html` exists
   - Check `build/js/react-core-[hash].js` exists
   - Check `.htaccess` is in build directory

5. **Create deployment ZIP:**
   ```bash
   npm run build:zip
   ```

## Deployment Checklist

### Before Uploading:

- [ ] Build completed without errors
- [ ] `build/index.html` exists
- [ ] `build/.htaccess` exists
- [ ] `build/js/` folder contains JavaScript files
- [ ] `build/assets/` folder contains assets

### cPanel Upload:

1. **Extract ZIP file** to a temporary location
2. **Upload ALL contents** of the `build` folder to your `public_html` directory
3. **Ensure `.htaccess` is uploaded** (it may be hidden - enable "Show Hidden Files" in cPanel File Manager)
4. **Set proper permissions:**
   - Files: 644
   - Folders: 755
   - `.htaccess`: 644

### Verify Deployment:

1. **Check browser console** - should have no errors
2. **Check Network tab** - all JS files should load (200 status)
3. **Test routing** - navigate to different pages
4. **Check React DevTools** - should show single React instance

## Troubleshooting

### If white screen persists:

1. **Check browser console** for specific errors
2. **Verify file paths** - ensure all files uploaded correctly
3. **Check `.htaccess`** - ensure it's in the root of public_html
4. **Clear browser cache** - hard refresh (Ctrl+Shift+R)
5. **Check file permissions** - ensure files are readable

### Common Issues:

**Issue:** 404 errors for JS files
- **Fix:** Check `.htaccess` is present and correct
- **Fix:** Verify base path in `vite.config.ts` is `'./'`

**Issue:** React still undefined
- **Fix:** Clear build folder and rebuild
- **Fix:** Check `react-core-[hash].js` loads before other chunks

**Issue:** Routing doesn't work
- **Fix:** Ensure `.htaccess` rewrite rules are active
- **Fix:** Check Apache mod_rewrite is enabled

## File Structure After Deployment

```
public_html/
├── index.html          (Main entry point)
├── .htaccess          (Apache config - CRITICAL!)
├── js/
│   ├── react-core-[hash].js    (React core - loads first)
│   ├── router-vendor-[hash].js
│   ├── ui-vendor-[hash].js
│   ├── icons-vendor-[hash].js
│   ├── utils-vendor-[hash].js
│   ├── vendor-[hash].js
│   └── [name]-[hash].js        (Main app bundle)
└── assets/
    └── [optimized assets]
```

## Verification Script

After deployment, open browser console and run:

```javascript
// Check React is loaded
console.log('React:', typeof React !== 'undefined' ? '✅ Loaded' : '❌ Missing');
console.log('ReactDOM:', typeof ReactDOM !== 'undefined' ? '✅ Loaded' : '❌ Missing');

// Check for multiple React instances (should be 1)
console.log('React instances:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.length || 'Unknown');
```

## Additional Notes

- The build uses **relative paths** (`base: './'`) so it works in any subdirectory
- All chunks are **preloaded** for better performance
- Source maps are **disabled** for smaller file size
- Assets are **minified and optimized**

---

**If issues persist, check the browser console for specific error messages and share them for further debugging.**
