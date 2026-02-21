#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 Express Client Library Setup\n');

  // Step 1: Choose build type
  console.log('Select a build type:');
  console.log('  1) TypeScript Compiler (tsc) - Standard TypeScript compilation');
  console.log('  2) ESBuild (Recommended) - Faster builds with bundling\n');
  
  let buildType;
  while (!buildType) {
    const answer = await question('Enter your choice (1 or 2): ');
    if (answer === '1') {
      buildType = 'tsc';
    } else if (answer === '2') {
      buildType = 'esbuild';
    } else {
      console.log('Invalid choice. Please enter 1 or 2.');
    }
  }

  // Step 2: Get client directory location
  const defaultPath = 'client';
  const clientPath = await question(`\nWhere should the client library be created? (default: ${defaultPath}): `);
  const targetPath = clientPath.trim() || defaultPath;

  // Step 3: Get app name for package.json
  let appName = 'my-app';
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      // Remove scope from name if present (e.g., @company/app -> app)
      appName = packageJson.name ? packageJson.name.replace(/^@[^/]+\//, '') : 'my-app';
    }
  } catch {
    // Use default if can't read package.json
  }

  console.log(`\n📦 Creating client library at: ${targetPath}`);
  console.log(`📝 Build type: ${buildType}`);
  console.log(`🏷️  Package name: ${appName}-client\n`);

  const confirm = await question('Proceed with setup? (y/n): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('Setup cancelled.');
    rl.close();
    process.exit(0);
  }

  try {
    // Step 1: Create the client directory
    const fullPath = join(process.cwd(), targetPath);
    
    if (existsSync(fullPath)) {
      console.log(`\n⚠️  Directory ${targetPath} already exists.`);
      const overwrite = await question('Overwrite existing files? (y/n): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        rl.close();
        process.exit(0);
      }
    }
    
    mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${targetPath}`);

    // Step 2: Create package.json
    const packageJson = {
      name: `${appName}-client`,
      version: '1.0.0',
      type: 'module',
      main: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: buildType === 'esbuild' 
        ? {
            build: 'node build.mjs',
            'build:watch': 'node build.mjs --watch'
          }
        : {
            build: 'tsc',
            'build:watch': 'tsc --watch'
          },
      dependencies: {
        'zod': '^3.23.8'
      }
    };

    if (buildType === 'esbuild') {
      packageJson.devDependencies = {
        'esbuild': '^0.20.0'
      };
    } else {
      packageJson.devDependencies = {
        'typescript': '^5.0.0'
      };
    }

    writeFileSync(
      join(fullPath, 'package.json'),
      JSON.stringify(packageJson, null, 2) + '\n'
    );
    console.log('✅ Created package.json');

    // Step 3: Copy template files
    const templatePath = join(__dirname, 'templates', buildType);
    const files = buildType === 'esbuild' 
      ? ['tsconfig.json', 'build.mjs']
      : ['tsconfig.json'];

    for (const file of files) {
      const sourcePath = join(templatePath, file);
      const targetFilePath = join(fullPath, file);
      
      if (existsSync(sourcePath)) {
        cpSync(sourcePath, targetFilePath);
        console.log(`✅ Created ${file}`);
      } else {
        console.warn(`⚠️  Template file ${file} not found`);
      }
    }

    // Step 4: Create src directory
    const srcPath = join(fullPath, 'src');
    mkdirSync(srcPath, { recursive: true });
    console.log('✅ Created src/ directory');

    // Step 5: Create empty index.ts with example
    const indexContent = `// Export your API client methods here
// Example:
// import { createClientMethod } from '@tkottke90/express-client';
// import { z } from 'zod';
//
// export const getUsers = createClientMethod(
//   '/api/users',
//   { method: 'get' },
//   async (response) => response.json()
// );
`;
    writeFileSync(join(srcPath, 'index.ts'), indexContent);
    console.log('✅ Created src/index.ts');

    console.log('\n🎉 Setup complete!\n');
    console.log('Next steps:');
    console.log(`  1. cd ${targetPath}`);
    console.log('  2. npm install');
    console.log('  3. npm install @tkottke90/express-client (or add as dependency)');
    console.log('  4. Define your API methods in src/index.ts');
    console.log('  5. npm run build');
    console.log(`  6. Install in your frontend: npm install file:../${targetPath}\n`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
