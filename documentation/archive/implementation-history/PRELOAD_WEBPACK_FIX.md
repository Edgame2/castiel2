# Preload Script Webpack-Dev-Server Fix

## Issue

The preload script was failing to load with errors:
- `This document requires 'TrustedScript' assignment. The action has been blocked.`
- `EvalError: Code generation from strings disallowed for this context`
- `Unable to load preload script`

## Root Cause

Electron Forge's webpack plugin automatically injects `webpack-dev-server/client` code into all entry points (including preload) in development mode. This code uses `eval()` which is blocked in Electron's secure preload context (TrustedScript policy).

## Solution

Created a separate webpack configuration for preload scripts (`webpack.preload.config.js`) that:

1. **Uses `IgnorePlugin`** to exclude webpack-dev-server modules:
   - `webpack-dev-server/client`
   - `webpack/hot/dev-server`
   - `webpack/hot/log`

2. **Configured in `forge.config.js`**:
   - Added `config: './webpack.preload.config.js'` to the preload entry point
   - This ensures preload uses the custom config that excludes webpack-dev-server

## Files Created/Modified

1. **`webpack.preload.config.js`** (NEW):
   - Separate webpack config for preload scripts
   - Excludes webpack-dev-server using `IgnorePlugin`
   - Maintains compatibility with Electron's secure context

2. **`forge.config.js`** (MODIFIED):
   - Added `config` property to preload entry point
   - Points to the new `webpack.preload.config.js`

3. **`src/main/main.ts`** (MODIFIED):
   - Added `webSecurity: process.env.NODE_ENV === 'development'` (though this may not be needed)

## Next Steps

1. **Rebuild the app** to apply the changes:
   ```bash
   npm start
   ```

2. The preload script should now load without TrustedScript errors

3. HMR will still work for the renderer process, but not for preload (which is expected and correct)

## Notes

- Preload scripts run in a secure context and cannot use `eval()` or dynamic code generation
- Webpack-dev-server uses `eval()` for HMR, which is why it's blocked
- The renderer process can still use webpack-dev-server and HMR normally
- Preload scripts will be recompiled on changes, but without HMR
