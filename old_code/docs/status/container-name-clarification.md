# Container Name Clarification

**Date:** 2025-01-XX  
**Status:** ✅ **CLARIFIED**

---

## Container Name Discrepancy

There are two container names mentioned in the codebase:

1. **`collaboration`** - Referenced in:
   - `config/env.ts`: Defaults to `'collaboration'`
   - `init-cosmos-db.ts`: Defined with incorrect partition key `/partitionKey`
   - Documentation: Referenced in some docs

2. **`collaborative-insights`** - Used in:
   - `routes/index.ts`: Defaults to `'collaborative-insights'` (when env var not set)
   - `init-cosmos-db.ts`: Properly configured with HPK `[tenantId, id]`
   - `CollaborativeInsightsRepository`: Uses this container name

---

## Current Implementation

**The actual working implementation uses `collaborative-insights`:**

- Routes use: `process.env.COSMOS_DB_COLLABORATION_CONTAINER || 'collaborative-insights'`
- Repository expects: `collaborative-insights` container
- Init script has: `collaborative-insights` with proper HPK configuration

**The `collaboration` container:**
- Exists in init script but has incorrect partition key (`/partitionKey`)
- May be legacy/unused
- Config references it but routes don't use it by default

---

## Recommendation

**Use `collaborative-insights` container** - This is what the implementation actually uses and is properly configured.

**To align everything:**
1. Set environment variable: `COSMOS_DB_COLLABORATION_CONTAINER=collaborative-insights`
2. Or update config default to match routes default
3. The `collaboration` container in init script can be removed or fixed if needed

---

## Status

✅ **IMPLEMENTATION ALIGNED** - All references now use `collaborative-insights` container:

- ✅ Config default: `'collaborative-insights'` (updated)
- ✅ Routes default: `'collaborative-insights'` (already correct)
- ✅ Init script: `collaborative-insights` with proper HPK (already correct)
- ✅ Legacy `collaboration` container definition removed from init script

**All components are now aligned and consistent.**

---

*Last Updated: 2025-01-XX*

