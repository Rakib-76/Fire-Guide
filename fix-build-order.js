// Script to fix module preload order in index.html
// Ensures react-vendor loads before other vendor chunks and main vendor loads last.

const fs = require('fs');
const path = require('path');

const buildIndexPath = path.join(__dirname, 'build', 'index.html');

if (!fs.existsSync(buildIndexPath)) {
  console.error('Error: build/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

let html = fs.readFileSync(buildIndexPath, 'utf8');

const modulePreloadRegex = /<link rel="modulepreload"[^>]*>/g;
const modulePreloadMatches = html.match(modulePreloadRegex) || [];

if (modulePreloadMatches.length === 0) {
  console.log('No modulepreload links found. Skipping reorder.');
  process.exit(0);
}

function chunkKind(link) {
  if (link.includes('react-vendor')) return 'react';
  if (link.includes('router-vendor')) return 'router';
  if (link.includes('ui-vendor')) return 'ui';
  if (link.includes('charts-vendor')) return 'charts';
  if (/\/vendor-[^"']+\.js/.test(link)) return 'main-vendor';
  return 'other';
}

const reactVendorLinks = modulePreloadMatches.filter((link) => chunkKind(link) === 'react');
const routerVendorLinks = modulePreloadMatches.filter((link) => chunkKind(link) === 'router');
const uiVendorLinks = modulePreloadMatches.filter((link) => chunkKind(link) === 'ui');
const chartsVendorLinks = modulePreloadMatches.filter((link) => chunkKind(link) === 'charts');
const otherLinks = modulePreloadMatches.filter((link) => chunkKind(link) === 'other');
const mainVendorLinks = modulePreloadMatches.filter((link) => chunkKind(link) === 'main-vendor');

html = html.replace(modulePreloadRegex, '');

const titleMatch = html.match(/<title>[^<]*<\/title>/);
if (titleMatch) {
  const titleEnd = html.indexOf(titleMatch[0]) + titleMatch[0].length;

  const orderedLinks = [
    ...reactVendorLinks,
    ...routerVendorLinks,
    ...uiVendorLinks,
    ...chartsVendorLinks,
    ...otherLinks,
    ...mainVendorLinks,
  ];
  const newPreloadLinks = orderedLinks.join('\n    ');

  html = html.slice(0, titleEnd) + '\n    ' + newPreloadLinks + html.slice(titleEnd);

  fs.writeFileSync(buildIndexPath, html, 'utf8');
  console.log('✓ Fixed module preload order in index.html');
  console.log(`  - react-vendor loads FIRST (${reactVendorLinks.length} link(s))`);
  console.log(`  - router/ui/charts load next (${routerVendorLinks.length + uiVendorLinks.length + chartsVendorLinks.length} link(s))`);
  console.log(`  - main vendor loads LAST (${mainVendorLinks.length} link(s))`);

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
