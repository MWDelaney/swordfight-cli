#!/usr/bin/env node

/**
 * Build script for swordfight-cli
 *
 * This script:
 * 1. Reads the flavor-text.json file
 * 2. Inlines the JSON data into the main index.js file
 * 3. Outputs the compiled version to dist/index.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

try {
  console.log('🔨 Building swordfight-cli...');

  // Read the flavor text JSON
  console.log('📖 Reading flavor text data...');
  const flavorText = JSON.parse(readFileSync('src/flavor-text.json', 'utf-8'));

  // Read the main source file
  console.log('📖 Reading source code...');
  let code = readFileSync('src/index.js', 'utf-8');

  // Replace the dynamic file reading with embedded data
  console.log('🔄 Inlining flavor text data...');
  const originalPattern = /const flavorText = JSON\.parse\(\s*readFileSync\(join\(__dirname, 'flavor-text\.json'\), 'utf-8'\)\s*\);/;
  const replacement = `const flavorText = ${JSON.stringify(flavorText, null, 2)};`;

  code = code.replace(originalPattern, replacement);

  // Create dist directory and write the compiled file
  console.log('📁 Creating dist directory...');
  mkdirSync('dist', { recursive: true });

  console.log('💾 Writing compiled file...');
  writeFileSync('dist/index.js', code);

  console.log('✅ Build completed successfully!');
  console.log('📦 Output: dist/index.js');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
