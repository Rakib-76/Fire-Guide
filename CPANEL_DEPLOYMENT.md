# cPanel Deployment Guide

## Folder Structure

After building, upload the **entire contents** of the `build/` folder to your cPanel `public_html/` directory:

```
public_html/
├── index.html          (Main entry point)
├── .htaccess          (Apache configuration - CRITICAL)
├── js/
│   ├── react-vendor-[hash].js
│   ├── vendor-[hash].js
│   └── index-[hash].js
└── assets/
    ├── index-[hash].css
    └── [other assets]
```

## Deployment Steps

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Upload to cPanel:**
   - Extract `fire-guide-production.zip` (if using build:zip)
   - Upload ALL contents of `build/` folder to `public_html/`
   - **Enable "Show Hidden Files"** in cPanel File Manager
   - Verify `.htaccess` is uploaded

3. **Set File Permissions:**
   - Files: 644
   - Folders: 755
   - `.htaccess`: 644

## Verification Checklist

After deployment, verify:

- [ ] **index.html loads** - Visit root URL, should see React app
- [ ] **No white screen** - App renders correctly
- [ ] **Assets load** - Check Network tab, all JS/CSS files return 200
- [ ] **React Router works** - Navigate to different routes
- [ ] **Page refresh works** - Refresh on any route, should not show 404
- [ ] **MIME types correct** - Network tab shows `application/javascript` for .js files
- [ ] **No console errors** - Browser console shows no critical errors (extension errors are OK)

## Troubleshooting

**White screen:**
- Check browser console for errors
- Verify all JS files load (Network tab)
- Check `.htaccess` is present and has correct permissions
- Verify `base: '/'` in vite.config.ts

**404 on refresh:**
- Verify `.htaccess` rewrite rules are active
- Check Apache `mod_rewrite` is enabled (contact hosting if needed)

**MIME type errors:**
- Verify `.htaccess` MIME type rules are present
- Check file permissions (644 for files)
