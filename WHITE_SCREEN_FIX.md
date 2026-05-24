# White Screen Fix - Two Solutions

## Why White Screen Occurred

1. **Missing basename**: React Router didn't know the app was in `/professional/dashboard`, so routes like `/pricing` tried to load from root instead of subdirectory.
2. **Server 404 on reload**: Apache tried to serve `/professional/dashboard/pricing` as a file, which doesn't exist, causing 404.
3. **Asset loading**: Without relative base path, assets couldn't load correctly in subdirectory.

## Solution A: BrowserRouter + .htaccess (Recommended)

### vite.config.ts
```typescript
base: './',
```

### src/App.tsx
```typescript
<BrowserRouter basename="/professional/dashboard">
```

### .htaccess
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /professional/dashboard/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>
```

## Solution B: HashRouter (No Server Config)

### vite.config.ts
```typescript
base: './',
```

### src/App.tsx
```typescript
import { HashRouter } from "react-router-dom";
// ...
<HashRouter>
```

### .htaccess
Not needed - works without server configuration.

**Note**: URLs will have `#` (e.g., `/professional/dashboard/#/pricing`)
