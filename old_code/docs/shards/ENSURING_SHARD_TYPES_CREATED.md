# Ensuring Shard Types Are Created in the Application

This guide explains how to ensure all core shard types are created in your Castiel application database.

## Current State

**Shard types are NOT automatically seeded on application startup.** You must manually run the seeding script after:
1. Initializing the database
2. Setting up a new environment
3. Adding new shard types to the codebase

## Prerequisites

Before seeding shard types, ensure:

1. **Database is initialized:**
   ```bash
   pnpm --filter @castiel/api run init-db
   ```

2. **Environment variables are configured:**
   - `COSMOS_DB_ENDPOINT` - Your Cosmos DB endpoint
   - `COSMOS_DB_KEY` - Your Cosmos DB access key
   - `COSMOS_DB_DATABASE_ID` - Database name (default: `castiel`)

   These should be set in your `.env` or `.env.local` file.

## Step 1: Seed Shard Types

### Method 1: Using pnpm script (Recommended)

```bash
pnpm --filter @castiel/api run seed-types
```

This will:
- Connect to your Cosmos DB instance
- Check which shard types already exist
- Create any missing shard types (idempotent - safe to run multiple times)
- Create embedding templates for each shard type
- Display a summary of seeded/skipped/error counts

### Method 2: Using tsx directly

```bash
npx tsx apps/api/src/scripts/seed-core-types.ts
```

### Expected Output

```
🌱 Core Types Seeder Script
===========================
📍 Endpoint: https://your-cosmos-account.documents.azure.com:443...
📁 Database: castiel

📦 Initializing repositories...
   ✅ ShardType repository initialized
   ✅ Shard repository initialized

🌱 Seeding core types...

📊 ShardTypes:
   ✅ Seeded:  60
   ℹ️  Skipped: 0
   
📄 Templates:
   ✅ Seeded:  34
   ℹ️  Skipped: 0

===========================
✅ Core types seeding complete!
```

## Step 2: Verify Shard Types Were Created

### Method 1: Verification Script (Recommended)

Run the verification script to check that all shard types exist:

```bash
pnpm --filter @castiel/api run verify:shard-types
```

This will:
- Check each of the 60 core shard types
- Verify embedding templates are attached
- Report any missing types or templates

**Expected Output:**
```
🔍 Shard Types Verification
===========================
📍 Endpoint: https://your-cosmos-account.documents.azure.com:443...
📁 Database: castiel

📦 Initializing repository...
   ✅ ShardType repository initialized

🔍 Checking core shard types...

📊 Verification Results:

   ✅ Found:           60/60
   ❌ Missing:         0
   📄 With Template:   34
   ⚠️  No Template:     0

===========================
✅ Verification PASSED - All shard types exist with embedding templates.
```

### Method 2: Validation Script

Run the validation script to check configuration correctness:

```bash
pnpm --filter @castiel/api run validate:shard-types
```

This validates:
- All shard types are properly defined in code
- Embedding templates are correctly mapped
- Relationship types have inverse mappings
- Schema structure is valid

**Note:** This validates the *code* configuration, not the database state.

### Method 3: Query Database Directly

You can query the Cosmos DB `shard_types` container to verify:

```typescript
// Example: Query all system shard types
const query = "SELECT * FROM c WHERE c.tenantId = 'system' AND c.isGlobal = true";
const { resources } = await container.items.query(query).fetchAll();
console.log(`Found ${resources.length} system shard types`);
```

### Method 4: API Endpoint

If you have the API running, you can query the shard types endpoint:

```bash
# Example (adjust endpoint as needed)
curl -X GET "http://localhost:3000/api/shard-types?tenantId=system&isGlobal=true"
```

## What Gets Seeded

The seeder creates:

1. **60 Core Shard Types** (from `CORE_SHARD_TYPES`):
   - CRM types: `c_opportunity`, `c_account`, `c_contact`, `c_lead`, etc.
   - Communication types: `c_email`, `c_message`, `c_meeting`, `c_call`, etc.
   - Product types: `c_product`, `c_priceBook`, `c_asset`, etc.
   - Sales types: `c_contract`, `c_order`, `c_invoice`, `c_payment`, etc.
   - Marketing types: `c_campaign`, `c_event`, `c_webinar`, `c_marketingAsset`, etc.
   - File types: `c_file`, `c_folder`, `c_attachment`, etc.
   - And many more...

2. **34 Embedding Templates** (from `EMBEDDING_TEMPLATE_MAP`):
   - Field weighting configurations
   - Preprocessing instructions (chunking, normalization)
   - Normalization settings
   - Model selection strategies

3. **System Context Templates** (if defined):
   - AI context assembly templates

## Troubleshooting

### Error: Container not found

```
❌ Fatal error during seeding:
   Container not found. Have you run the init-db script?
   Run: pnpm --filter @castiel/api run init-db
```

**Solution**: Run the database initialization script first:
```bash
pnpm --filter @castiel/api run init-db
```

### Error: Missing environment variables

```
❌ Missing Cosmos DB configuration:
   - COSMOS_DB_ENDPOINT is not set
   - COSMOS_DB_KEY is not set
```

**Solution**: Set the required environment variables in your `.env` or `.env.local` file:
```bash
COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_DB_KEY=your-key-here
COSMOS_DB_DATABASE_ID=castiel
```

### Some types show as "skipped"

This is **normal** if you've run the seeder before. The seeder is idempotent - it only creates types that don't exist. If you want to update existing types, you'll need to:
1. Delete the existing shard type from the database
2. Re-run the seeder

### Verification shows missing types

If verification reports missing types:
1. Check that the seeding script completed successfully
2. Verify database connectivity
3. Check for errors in the seeding output
4. Re-run the seeding script: `pnpm --filter @castiel/api run seed-types`

## Optional: Automatic Seeding on Startup

Currently, shard types are **not automatically seeded** on application startup. This is by design to:
- Give you control over when seeding happens
- Avoid unnecessary database operations on every startup
- Allow for manual verification before seeding

If you want automatic seeding, you can add it to `apps/api/src/index.ts` in the `start()` function, after database initialization:

```typescript
// After database initialization, add:
import { CoreTypesSeederService } from './services/core-types-seeder.service.js';
import { ShardTypeRepository } from './repositories/shard-type.repository.js';

// ... in the start() function, after repositories are initialized:

// Initialize Core Types Seeder
try {
  const shardTypeRepository = new ShardTypeRepository(monitoring);
  const shardRepository = new ShardRepository(monitoring);
  
  const coreTypesSeeder = new CoreTypesSeederService(
    monitoring,
    shardTypeRepository,
    shardRepository
  );
  
  const seedResults = await coreTypesSeeder.seedAll();
  server.log.info({
    shardTypesSeeded: seedResults.shardTypes.seeded,
    templatesSeeded: seedResults.templates.seeded,
  }, '✅ Core shard types seeded');
} catch (seedError) {
  server.log.warn({ err: seedError }, '⚠️ Failed to seed core shard types');
  // Don't fail startup - types may already exist
}
```

**⚠️ Important Notes:**
- Be careful with automatic seeding in production
- It may cause issues if the database is not ready
- It may cause issues if there are permission problems
- Consider adding a feature flag to enable/disable automatic seeding
- Consider adding a check to skip seeding if types already exist (the seeder is already idempotent)

## Tenant-Specific Shard Types

When a new tenant is created, the `seedForTenant()` method is called to clone system shard types for that tenant. This happens automatically during tenant creation - you don't need to manually seed tenant-specific types.

## Next Steps

After seeding:

1. **Verify**: Run the verification script to ensure everything is correct
   ```bash
   pnpm --filter @castiel/api run verify:shard-types
   ```

2. **Test**: Create a test shard of each type to verify schemas work
   ```bash
   # Use the API to create test shards
   ```

3. **Integrate**: Start using the shard types in your integrations

4. **Monitor**: Check that embedding generation works correctly for shard types with templates

## Related Documentation

- [Core Shard Types Overview](./core-types/README.md)
- [Shard Types Implementation](./IMPLEMENTATION_COMPLETION_SUMMARY.md)
- [Seeding Shard Types](./SEEDING_SHARD_TYPES.md)



