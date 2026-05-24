# Why Page Reload Was Failing

## The Problem

When you reloaded a page like `/professional/dashboard/bookings` or accessed it directly, you got a white screen or 404 error.

## Root Causes

1. **Missing basename in BrowserRouter**: React Router didn't know the app was in a subdirectory, so it tried to route to `/bookings` instead of `/professional/dashboard/bookings`.

2. **Wrong base path in Vite**: Using `base: './'` (relative) caused issues with asset loading in subdirectories. The browser couldn't find JS/CSS files on reload.

3. **Incorrect .htaccess RewriteBase**: The rewrite rule used `/` instead of `/professional/dashboard/`, so Apache tried to serve `index.html` from the wrong location.

4. **MIME type errors**: JS/CSS files were sometimes served as `text/html` because Apache didn't recognize them in the subdirectory context.

## The Fix

1. **Vite config**: Changed `base: './'` to `base: '/professional/dashboard/'` (absolute path)
2. **BrowserRouter**: Added `basename="/professional/dashboard"` so React Router knows the subdirectory
3. **.htaccess**: Updated `RewriteBase` to `/professional/dashboard/` and added explicit MIME type headers
4. **Asset exclusion**: Added rewrite condition to skip rewriting actual files (js, css, images)

Now when you reload `/professional/dashboard/bookings`:
- Apache serves `index.html` from the correct subdirectory
- React Router knows the basename and routes correctly
- All assets load with correct MIME types
- No white screen or 404 errors
