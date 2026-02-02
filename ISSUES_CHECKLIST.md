# Project scan – issues checklist

Scan covered: missing imports, unused code, inconsistent types, unreachable branches, async errors, env vars referenced but not defined.

**Status:** Checklist items 1, 2, 5, 6 have been fixed (regex, duplicate block, env.example, UI ESLint config).

---

## 1. Missing imports / TypeScript syntax errors (blocking) — FIXED

### 1.1 `containers/ai-conversation/src/services/PromptInjectionDefenseService.ts`
- **Lines 24–26:** Invalid regex syntax. The `/` in `\[/INST\]` is interpreted as end of regex, causing “Invalid character” and “; expected” errors.
- **Fix:** Escape the slash or use a character class, e.g. `/\[INST\]|\[\/INST\]/i` or `/\[INST\]|\[\/INST\]/i`.

### 1.2 `containers/data-enrichment/src/services/ShardEmbeddingService.ts`
- **Lines 277–288:** Orphaned duplicate block. Code after the `for` loop and `if (embeddings.length === 0)` references `embeddingResponse` and `normalized`, which are out of scope (they exist only inside the loop). This causes “'catch' or 'finally' expected” and cascading parse errors.
- **Fix:** Remove the duplicate block (lines 277–288). The logic is already handled inside the loop (lines 234–270).

---

## 2. Unreachable branches / duplicate code — FIXED

- **ShardEmbeddingService.ts (277–288):** Same as 1.2 – removed.

---

## 3. Inconsistent types

- TypeScript cannot fully check the repo while the two files above have parse errors. After fixing 1.1 and 1.2, run:
  - `pnpm exec tsc --noEmit` (root and/or per container)
  - `pnpm run type-check:all`
- Root `.eslintrc.json` uses `@typescript-eslint/no-explicit-any`, `no-floating-promises`, `no-misused-promises` – re-run lint after fixing TS so type-related rules can run.

---

## 4. Async errors

- No `.then(...);` without `.catch()` found in `containers/**/*.ts`.
- Root ESLint has `@typescript-eslint/no-floating-promises` and `no-misused-promises`; once TS compiles, run `pnpm run lint:all` to catch floating promises and misused promises.

---

## 5. Env vars referenced but not defined in `env.example` — FIXED

Variables used in source or config (excluding test-only `TEST_*` and obvious test setup):

| Env var | Used in | In env.example? |
|--------|---------|-------------------|
| `NEXT_PUBLIC_API_BASE_URL` | UI (many pages, components) | **No** – only `NEXT_PUBLIC_API_URL` is defined |
| `SECRET_MANAGEMENT_SERVICE_URL` | auth (SecretManagementClient, SAMLHandler) | **No** – only `SECRET_MANAGEMENT_URL` (and `SECRET_MASTER_KEY`, etc.) |
| `FRONTEND_PROTOCOL` | auth (auth.ts redirect) | **No** |
| `OPENAI_API_KEY` | ai-service (CompletionService tests/setup) | **No** |
| `CONSUMER_TYPE` | integration-processors | **No** |
| `USE_WIN_PROBABILITY_ML`, `USE_RISK_SCORING_ML`, `USE_REVENUE_FORECASTING_ML` | ml-service config | **No** |
| `AZURE_ML_*` (workspace_name, resource_group, subscription_id, endpoints, API key, WIN_PROBABILITY_URL, RISK_SCORING_URL) | ml-service config | **No** |
| `PORT`, `HOST` | multiple containers (overrides) | Yes (HOST only; PORT often from config) |

**Recommended:**
- Add `NEXT_PUBLIC_API_BASE_URL` to `env.example` (or standardize UI on `NEXT_PUBLIC_API_URL` and document).
- Add `SECRET_MANAGEMENT_SERVICE_URL` (auth code uses this; env.example has `SECRET_MANAGEMENT_URL` only) or document mapping in config.
- Add `FRONTEND_PROTOCOL`, `OPENAI_API_KEY`, `CONSUMER_TYPE`, ML-related flags and `AZURE_ML_*` to `env.example` with short comments.

---

## 6. Unused code / lint

- **UI container:** `pnpm run lint:all` fails because **ESLint 9** is used and expects `eslint.config.(js|mjs|cjs)`; UI has no flat config, so ESLint doesn’t pick up root `.eslintrc.json`.
- **Fix:** Add `eslint.config.js` (or equivalent) in `containers/ui/` for ESLint 9, or downgrade/configure UI to use `.eslintrc.*` and ensure the lint script uses it.
- Unused vars are enforced by `@typescript-eslint/no-unused-vars` in root `.eslintrc.json`; full lint (including unused code) will run once TS and UI ESLint config are fixed.

---

## 7. Summary checklist

| # | Category | Item | Action |
|---|----------|------|--------|
| 1 | **Missing/syntax** | Fix regex in `PromptInjectionDefenseService.ts` (line 24) | Done |
| 2 | **Unreachable/duplicate** | Remove duplicate block in `ShardEmbeddingService.ts` (lines 277–288) | Done |
| 3 | **Types** | Re-run `pnpm exec tsc --noEmit` and `pnpm run type-check:all` | Optional; other containers may have pre-existing TS errors |
| 4 | **Async** | Re-run lint (no-floating-promises, no-misused-promises) | Optional |
| 5 | **Env vars** | Add to env.example: `NEXT_PUBLIC_API_BASE_URL`, `SECRET_MANAGEMENT_SERVICE_URL`, `FRONTEND_PROTOCOL`, `OPENAI_API_KEY`, `CONSUMER_TYPE`, ML/AZURE_ML_* | Done |
| 6 | **Lint** | Fix UI ESLint config for ESLint 9 (add eslint.config.mjs) | Done |

---

*Generated from project scan. Address items 1 and 2 first so TypeScript and lint can run on the full codebase.*
