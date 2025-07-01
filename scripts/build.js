#!/usr/bin/env node

import { build } from 'esbuild';
import fs from 'fs';

async function buildCLI() {
  try {
    // Ensure dist directory exists
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist', { recursive: true });
    }

    // Build with esbuild
    await build({
      entryPoints: ['bin/swordfight.js'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: 'dist/swordfight.js',
      external: ['swordfight-engine'],
      minify: false,
      sourcemap: false
    });

    // Read the built file and handle shebang
    let builtCode = fs.readFileSync('dist/swordfight.js', 'utf8');

    // Remove any existing shebang lines
    builtCode = builtCode.replace(/^#!.*\n/gm, '');

    // Add the shebang at the beginning
    const codeWithShebang = '#!/usr/bin/env node\n' + builtCode;
    fs.writeFileSync('dist/swordfight.js', codeWithShebang);

    // Make the output file executable
    fs.chmodSync('dist/swordfight.js', '755');

    console.log('✅ Build completed successfully!');
    console.log('📦 Output: dist/swordfight.js');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildCLI();
