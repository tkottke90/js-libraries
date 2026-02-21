# Express Client Setup Scripts

This directory contains the setup tooling for creating a client library in your backend project.

## Usage

After installing `@tkottke90/express-client` in your backend project, run:

```bash
npx express-client-init
```

Or if you have it installed globally:

```bash
express-client-init
```

## What it does

The setup script will:

1. **Prompt for build type**: Choose between TypeScript Compiler (tsc) or ESBuild (recommended)
2. **Ask for client directory location**: Default is `client/` in your project root
3. **Detect your app name**: Uses your package.json name to create `<app-name>-client`
4. **Create directory structure**:
   ```
   client/
   ├── package.json
   ├── tsconfig.json
   ├── build.mjs (if ESBuild selected)
   └── src/
       └── index.ts
   ```

## Build Types

### TypeScript Compiler (tsc)
- Standard TypeScript compilation
- Simple, no extra dependencies
- Creates type declarations and JavaScript output
- Good for smaller projects

### ESBuild (Recommended)
- Fast build times with bundling
- Requires `esbuild` devDependency
- Bundles your client code
- Better for larger projects with many dependencies

## Next Steps

After running the setup:

```bash
cd client
npm install
npm install @tkottke90/express-client
npm run build
```

Then in your frontend:

```bash
npm install file:../backend/client
```

## Files

- `init.mjs` - Entry point script
- `setup.mjs` - Main setup logic with interactive prompts
- `templates/tsc/` - TypeScript Compiler templates
- `templates/esbuild/` - ESBuild templates
