# Build & Configuration Module

**Category:** Platform & Infrastructure  
**Location:** Root config files  
**Last Updated:** 2025-01-27

---

## Overview

The Build & Configuration Module provides the build system, bundling configuration, and development tooling for the Coder IDE application. It handles TypeScript compilation, code bundling, Electron packaging, and development/production builds.

## Purpose

- Code bundling and optimization
- TypeScript compilation
- Electron packaging and distribution
- Development/production build configurations
- Hot module replacement (HMR) in development
- Asset management and optimization

---

## Key Components

### 1. Webpack Configurations

#### Main Process Config (`webpack.main.config.js`)

**Location:** `webpack.main.config.js`

**Purpose:** Bundles the Electron main process code

**Key Features:**
- Entry point: `src/main/main.ts`
- Target: `electron-main`
- Output: `.webpack/main`
- TypeScript compilation
- Node.js built-in module handling
- Native module support

#### Renderer Process Config (`webpack.renderer.config.js`)

**Location:** `webpack.renderer.config.js`

**Purpose:** Bundles the React renderer process code

**Key Features:**
- Entry point: `src/renderer/index.tsx`
- Target: `electron-renderer`
- Output: `.webpack/renderer/main_window`
- React support
- CSS/PostCSS processing
- Tailwind CSS integration
- Hot Module Replacement (HMR) in development
- Asset optimization

#### Preload Script Config (`webpack.preload.config.js`)

**Location:** `webpack.preload.config.js`

**Purpose:** Bundles the preload script for secure IPC

**Key Features:**
- Entry point: `src/main/preload.ts`
- Target: `electron-preload`
- Output: `.webpack/renderer/main_window/preload.js`
- Context isolation support
- IPC bridge setup

### 2. Electron Forge Configuration (`forge.config.js`)

**Location:** `forge.config.js`

**Purpose:** Electron application packaging and distribution

**Key Features:**
- ASAR packaging (application archive)
- Platform-specific makers:
  - Windows: Squirrel installer
  - macOS: ZIP archive
  - Linux: DEB and RPM packages
- Auto-unpack natives plugin
- Fuses plugin for security
- Webpack plugin integration

**Configuration:**
```javascript
module.exports = {
  packagerConfig: {
    asar: true,  // Package as ASAR archive
  },
  makers: [
    '@electron-forge/maker-squirrel',  // Windows
    '@electron-forge/maker-zip',      // macOS
    '@electron-forge/maker-deb',       // Linux DEB
    '@electron-forge/maker-rpm',       // Linux RPM
  ],
  plugins: [
    '@electron-forge/plugin-auto-unpack-natives',
    '@electron-forge/plugin-webpack',
    '@electron-forge/plugin-fuses',
  ],
};
```

### 3. TypeScript Configurations

#### Root TypeScript Config (`tsconfig.json`)

**Location:** `tsconfig.json`

**Purpose:** Base TypeScript configuration

**Key Settings:**
- Target: ES2020
- Module: ES2020
- JSX: React
- Strict mode enabled
- Path aliases

#### Main Process Config (`tsconfig.main.json`)

**Location:** `tsconfig.main.json`

**Purpose:** TypeScript config for main process

**Extends:** `tsconfig.json`

**Key Settings:**
- Target: Node.js environment
- Includes: `src/main/**/*`
- Excludes: `node_modules`, `**/*.test.ts`

#### Renderer Process Config (`tsconfig.renderer.json`)

**Location:** `tsconfig.renderer.json`

**Purpose:** TypeScript config for renderer process

**Extends:** `tsconfig.json`

**Key Settings:**
- Target: Browser environment
- Includes: `src/renderer/**/*`
- JSX: React
- DOM types included

#### Test Config (`tsconfig.test.json`)

**Location:** `tsconfig.test.json`

**Purpose:** TypeScript config for tests

**Key Settings:**
- Includes test files
- Test framework types
- DOM types for testing

### 4. Package Configuration (`package.json`)

**Location:** `package.json`

**Purpose:** Project metadata, dependencies, and scripts

**Key Scripts:**
```json
{
  "start": "ELECTRON_DISABLE_SANDBOX=1 electron-forge start",
  "package": "electron-forge package",
  "make": "electron-forge make",
  "publish": "electron-forge publish",
  "test": "vitest",
  "test:ui": "vitest --ui"
}
```

**Key Dependencies:**
- Electron framework
- React 19
- TypeScript
- Webpack and loaders
- Electron Forge
- Testing libraries (Vitest)

### 5. PostCSS Configuration (`postcss.config.js`)

**Location:** `postcss.config.js`

**Purpose:** CSS processing configuration

**Plugins:**
- Tailwind CSS
- Autoprefixer
- CSS optimization

### 6. Tailwind Configuration (`tailwind.config.js`)

**Location:** `tailwind.config.js`

**Purpose:** Tailwind CSS configuration

**Features:**
- Content paths for purging
- Theme customization
- Plugin configuration

---

## Build Process

### Development Build

**Command:** `npm start`

**Process:**
1. Webpack compiles TypeScript to JavaScript
2. Hot Module Replacement (HMR) enabled
3. Electron Forge starts development server
4. Main process watches for changes
5. Renderer process hot-reloads on changes

**Features:**
- Fast refresh for React components
- Source maps for debugging
- Development optimizations disabled
- Sandbox disabled for development

### Production Build

**Command:** `npm run package` or `npm run make`

**Process:**
1. TypeScript compilation with optimizations
2. Code minification and tree-shaking
3. Asset optimization
4. ASAR packaging
5. Platform-specific installer creation

**Optimizations:**
- Code minification
- Dead code elimination
- Asset optimization
- Source map generation (optional)
- ASAR packaging for faster startup

---

## Webpack Rules

### TypeScript Rule

```javascript
{
  test: /\.tsx?$/,
  use: [
    {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  ],
}
```

### CSS Rule

```javascript
{
  test: /\.css$/,
  use: [
    'style-loader',
    'css-loader',
    'postcss-loader',
  ],
}
```

### Asset Rules

- Images: `file-loader` or `url-loader`
- Fonts: `file-loader`
- Node.js native modules: `node-loader`

---

## Development Tools

### Hot Module Replacement (HMR)

**Enabled in:** Development mode only

**Features:**
- React Fast Refresh
- CSS hot reload
- State preservation where possible

### Source Maps

**Development:** Full source maps for debugging

**Production:** Optional source maps for error tracking

### Type Checking

**Tool:** `fork-ts-checker-webpack-plugin`

**Features:**
- Separate process for type checking
- Non-blocking compilation
- Type errors in console

---

## Build Outputs

### Development Outputs

- `.webpack/main/` - Main process bundle
- `.webpack/renderer/main_window/` - Renderer bundle
- `.webpack/renderer/main_window/preload.js` - Preload script

### Production Outputs

- `out/` - Packaged application
- Platform-specific installers:
  - Windows: `.exe` installer
  - macOS: `.zip` archive
  - Linux: `.deb` or `.rpm` package

---

## Configuration Files Summary

| File | Purpose |
|------|---------|
| `webpack.main.config.js` | Main process bundling |
| `webpack.renderer.config.js` | Renderer process bundling |
| `webpack.preload.config.js` | Preload script bundling |
| `forge.config.js` | Electron packaging |
| `tsconfig.json` | Base TypeScript config |
| `tsconfig.main.json` | Main process TypeScript |
| `tsconfig.renderer.json` | Renderer TypeScript |
| `tsconfig.test.json` | Test TypeScript |
| `package.json` | Project metadata & scripts |
| `postcss.config.js` | CSS processing |
| `tailwind.config.js` | Tailwind CSS config |
| `vitest.config.js` | Test configuration |

---

## Environment Variables

### Development

- `NODE_ENV=development`
- `ELECTRON_DISABLE_SANDBOX=1` (Linux)
- `WEBPACK_SERVE=true` (HMR)

### Production

- `NODE_ENV=production`
- Sandbox enabled
- Optimizations enabled

---

## Dependencies

### Build Tools

- `@electron-forge/*` - Electron packaging
- `webpack` - Module bundler
- `ts-loader` - TypeScript loader
- `css-loader`, `style-loader` - CSS processing
- `postcss-loader` - PostCSS processing
- `tailwindcss` - CSS framework

### Development Tools

- `vitest` - Test runner
- `@testing-library/*` - Testing utilities
- `fork-ts-checker-webpack-plugin` - Type checking

---

## Best Practices

1. ✅ **Separate Configs** - Separate configs for main/renderer/preload
2. ✅ **Type Safety** - Strict TypeScript configuration
3. ✅ **Code Splitting** - Optimize bundle sizes
4. ✅ **Source Maps** - Enable for debugging
5. ✅ **HMR** - Fast development iteration
6. ✅ **ASAR Packaging** - Faster startup in production
7. ✅ **Platform Support** - Build for all platforms
8. ✅ **Optimization** - Minify and optimize in production

---

## Troubleshooting

### Common Issues

**Issue:** Build fails with TypeScript errors
- **Solution:** Check `tsconfig.json` and fix type errors

**Issue:** HMR not working
- **Solution:** Check webpack dev server configuration

**Issue:** Native modules not loading
- **Solution:** Ensure `@electron-forge/plugin-auto-unpack-natives` is configured

**Issue:** Production build too large
- **Solution:** Enable tree-shaking, check for unnecessary dependencies

---

## Related Modules

- **Electron Main Process Module** - Uses main process bundle
- **IPC Communication Module** - Uses preload bundle
- **Editor & UI Modules** - Uses renderer bundle

---

## Summary

The Build & Configuration Module provides a comprehensive build system for the Coder IDE application. With separate Webpack configurations for main, renderer, and preload processes, TypeScript compilation, Electron Forge packaging, and development tooling, it ensures efficient development and optimized production builds across all platforms.
