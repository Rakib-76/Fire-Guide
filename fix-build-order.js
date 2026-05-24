// Script to fix module preload order in index.html
// Ensures react-core loads before vendor chunks

const fs = require('fs');
const path = require('path');

const buildIndexPath = path.join(__dirname, 'build', 'index.html');

if (!fs.existsSync(buildIndexPath)) {
  console.error('Error: build/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

let html = fs.readFileSync(buildIndexPath, 'utf8');

// Find all modulepreload links
const modulePreloadRegex = /<link rel="modulepreload"[^>]*>/g;
const modulePreloadMatches = html.match(modulePreloadRegex) || [];

if (modulePreloadMatches.length === 0) {
  console.log('No modulepreload links found. Skipping reorder.');
  process.exit(0);
}

// Separate chunks by priority - CRITICAL: vendor must load AFTER react-vendor
const reactVendorLinks = modulePreloadMatches.filter(link => link.includes('react-vendor'));
const vendorLinks = modulePreloadMatches.filter(link => 
  link.includes('vendor') && 
  !link.includes('react-vendor')
);
const otherLinks = modulePreloadMatches.filter(link => 
  !link.includes('vendor')
);

// Remove all modulepreload links
html = html.replace(modulePreloadRegex, '');

// Find the position after the title tag (before scripts)
const titleMatch = html.match(/<title>[^<]*<\/title>/);
if (titleMatch) {
  const titleEnd = html.indexOf(titleMatch[0]) + titleMatch[0].length;
  
  // CRITICAL ORDER: react-vendor FIRST, then others, vendor LAST
  // Vendor must load AFTER React is available
  const orderedLinks = [
    ...reactVendorLinks,  // React MUST load first
    ...otherLinks,        // Other chunks
    ...vendorLinks        // Vendor loads LAST (after React is available)
  ];
  const newPreloadLinks = orderedLinks.join('\n    ');
  
  // Insert before the main script tag
  html = html.slice(0, titleEnd) + '\n    ' + newPreloadLinks + html.slice(titleEnd);
  
  fs.writeFileSync(buildIndexPath, html, 'utf8');
  console.log('✓ Fixed module preload order in index.html');
  console.log(`  - react-vendor loads FIRST (${reactVendorLinks.length} link(s))`);
  console.log(`  - other chunks load second (${otherLinks.length} link(s))`);
  console.log(`  - vendor loads LAST (${vendorLinks.length} link(s))`);
  
  // Verify react-vendor is first
  const finalHtml = fs.readFileSync(buildIndexPath, 'utf8');
  const firstPreload = finalHtml.match(/<link rel="modulepreload"[^>]*>/);
  if (firstPreload && firstPreload[0].includes('react-vendor')) {
    console.log('  ✓ Verified: react-vendor is the first preload link');
  } else {
    console.error('  ✗ ERROR: react-vendor is NOT first!');
    console.error('    First preload:', firstPreload ? firstPreload[0] : 'none');
    process.exit(1);
  }
} else {
  console.warn('Warning: Could not find title tag. Preload order may be incorrect.');
}
