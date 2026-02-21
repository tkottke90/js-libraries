import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'neutral',
  format: 'esm',
  target: 'es2020',
  sourcemap: true,
  external: ['zod', '@tkottke90/express-client'],
};

async function runBuild() {
  try {
    // Clean and create dist directory
    rmSync('dist', { recursive: true, force: true });
    mkdirSync('dist', { recursive: true });

    // Build JavaScript with esbuild
    if (isWatch) {
      const ctx = await build({
        ...buildOptions,
        logLevel: 'info',
      });
      await ctx.watch();
      console.log('👀 Watching for changes...');
    } else {
      await build(buildOptions);
      console.log('✅ JavaScript build complete');
    }

    // Generate TypeScript declarations
    return new Promise((resolve, reject) => {
      const tsc = spawn('npx', ['tsc'], { stdio: 'inherit', shell: true });
      
      tsc.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Type declarations generated');
          resolve();
        } else {
          console.error('❌ Type declaration generation failed');
          reject(new Error('tsc failed'));
        }
      });
    });

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

runBuild();
