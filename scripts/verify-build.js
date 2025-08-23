#!/usr/bin/env node

/**
 * Build verification script for Criteria Assistant Web
 * Ensures all required files are present and properly configured for deployment
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

console.log('🔍 Verifying build output...\n');

// Required files in dist directory
const requiredFiles = [
  'index.html',
  'assets',
  'pdf.worker.min.js',
  '_redirects'
];

// Check if dist directory exists
if (!existsSync(distDir)) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

let allChecksPass = true;

// Verify required files
console.log('📁 Checking required files:');
for (const file of requiredFiles) {
  const filePath = join(distDir, file);
  if (existsSync(filePath)) {
    const stats = statSync(filePath);
    const size = stats.isDirectory() ? 'directory' : `${Math.round(stats.size / 1024)}KB`;
    console.log(`  ✅ ${file} (${size})`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allChecksPass = false;
  }
}

// Verify index.html contains required elements
console.log('\n📄 Checking index.html:');
const indexPath = join(distDir, 'index.html');
if (existsSync(indexPath)) {
  const indexContent = readFileSync(indexPath, 'utf-8');
  
  const checks = [
    { name: 'React root div', test: /<div id="root">/ },
    { name: 'Module script', test: /<script type="module"/ },
    { name: 'CSS assets', test: /\.css/ },
    { name: 'JS assets', test: /\.js/ }
  ];
  
  for (const check of checks) {
    if (check.test.test(indexContent)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name} - NOT FOUND`);
      allChecksPass = false;
    }
  }
}

// Verify _redirects file
console.log('\n🔀 Checking _redirects:');
const redirectsPath = join(distDir, '_redirects');
if (existsSync(redirectsPath)) {
  const redirectsContent = readFileSync(redirectsPath, 'utf-8');
  if (redirectsContent.includes('/*    /index.html   200')) {
    console.log('  ✅ SPA routing configured');
  } else {
    console.log('  ❌ SPA routing not properly configured');
    allChecksPass = false;
  }
}

// Final result
console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('🎉 Build verification PASSED! Ready for deployment.');
  console.log('\nNext steps:');
  console.log('1. Push changes to your main branch');
  console.log('2. Deploy to Render as a Static Site');
  console.log('3. Use build command: npm ci && npm run build');
  console.log('4. Use publish directory: dist');
} else {
  console.log('❌ Build verification FAILED! Please fix the issues above.');
  process.exit(1);
}
