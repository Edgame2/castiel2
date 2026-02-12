# UI container – security and “just loading” fix

## If the UI shows “just loading” when opened in a browser

1. **API URL**  
   The app runs in the browser and must call your API. If you open the UI at `http://YOUR_SERVER:3000`, set the API base URL to the same host and the gateway port (e.g. 3001):

   ```bash
   export NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER:3001
   docker-compose up -d
   ```

   Rebuild the UI after changing `NEXT_PUBLIC_API_BASE_URL` (it is baked in at build time):

   ```bash
   docker-compose build --no-cache ui && docker-compose up -d ui
   ```

2. **Malicious activity in logs**  
   If UI logs show connections to unknown IPs, `wget`/`curl` of binaries, or base64 payloads:

   - Treat the current UI image and build cache as compromised.
   - Stop the UI: `docker-compose stop ui`
   - Rebuild from a clean state (no cache, clean `node_modules` and lockfile):
     - On host: in `ui` run `rm -rf node_modules .next` then `npm ci`
     - Rebuild image: `docker-compose build --no-cache ui`
   - Run `npm audit` and fix high/critical issues; review recently added or updated dependencies.
   - Use a clean runner/machine for production builds if the current one may be compromised.

## npm audit – current status and safe fixes

Run in `ui`: `npm audit`.

**Applied (safe):**

- **Next.js** – Bumped to `16.1.6` (and `eslint-config-next`, `@next/bundle-analyzer`) to address high-severity Next advisories (Server Actions, DoS, Image Optimizer, etc.). Re-run `npm install` and rebuild the UI image after pulling.

**Remaining (review when convenient):**

- **vitest / vite / esbuild** (moderate, dev-only) – Advisory is for the dev server. Fix with `npm audit fix --force` would upgrade to vitest@4 (breaking). Options: upgrade to vitest 4 when ready, or accept dev-only risk and avoid exposing the dev server.
- **xlsx** (high, no fix) – Prototype pollution and ReDoS in sheetJS. No patched version. Options: replace with e.g. `exceljs` for parsing/export, or restrict use to trusted inputs and document the risk.
