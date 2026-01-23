# Seeding Core Shard Types

This guide explains how to ensure all core shard types are created in your Castiel application.

## Overview

Core shard types are **not automatically seeded** on application startup. You must run the seeding script manually after:
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

## Seeding Shard Types

### Method 1: Using pnpm script (Recommended)

```bash
pnpm --filter @castiel/api run seed-types
```

This will:
- Connect to your Cosmos DB instance
- Check which shard types already exist
- Create any missing shard types
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

## How It Works

The `CoreTypesSeederService`:

1. **Checks for existing types**: For each shard type in `CORE_SHARD_TYPES`, it checks if a shard type with that name already exists for the `system` tenant.

2. **Skips existing types**: If a shard type already exists, it skips it (idempotent operation).

3. **Creates new types**: For missing shard types, it:
   - Creates the `ShardType` record with all schema fields
   - Attaches the embedding template from `EMBEDDING_TEMPLATE_MAP`
   - Sets `isGlobal: true` and `tenantId: 'system'`

4. **Handles errors**: Any errors during seeding are logged and reported in the summary.

## Verifying Shard Types

### Method 1: Validation Script

Run the validation script to check configuration:

```bash
pnpm --filter @castiel/api run validate:shard-types
```

This validates:
- All shard types are properly defined
- Embedding templates are correctly mapped
- Relationship types have inverse mappings

### Method 2: Query Database

You can query the Cosmos DB `shard_types` container to verify:

```typescript
// Example: Query all system shard types
const query = "SELECT * FROM c WHERE c.tenantId = 'system' AND c.isGlobal = true";
const { resources } = await container.items.query(query).fetchAll();
console.log(`Found ${resources.length} system shard types`);
```

### Method 3: API Endpoint

If you have a shard types API endpoint, you can query it:

```bash
# Example (adjust endpoint as needed)
curl -X GET "http://localhost:3000/api/shard-types?tenantId=system&isGlobal=true"
```

## Troubleshooting

### Error: Container not found

```
❌ Fatal error during seeding:
   Container not found. Have you run the init-db script?
   Run: pnpm --filter @castiel/api run init-db
```

**Solution**: Run the database initialization script first.

### Error: Missing environment variables

```
❌ Missing Cosmos DB configuration:
   - COSMOS_DB_ENDPOINT is not set
   - COSMOS_DB_KEY is not set
```

**Solution**: Set the required environment variables in your `.env` or `.env.local` file.

### Some types show as "skipped"

This is **normal** if you've run the seeder before. The seeder is idempotent - it only creates types that don't exist. If you want to update existing types, you'll need to:
1. Delete the existing shard type from the database
2. Re-run the seeder

Or modify the seeder service to handle updates (not recommended for system types).

## Automatic Seeding on Startup

Currently, shard types are **not automatically seeded** on application startup. This is by design to:
- Give you control over when seeding happens
- Avoid unnecessary database operations on every startup
- Allow for manual verification before seeding

If you want automatic seeding, you can add it to `apps/api/src/index.ts`:

```typescript
// In the start() function, after database initialization:
const seeder = new CoreTypesSeederService(
  monitoring,
  shardTypeRepository,
  shardRepository
);
await seeder.seedAll();
```

**Note**: Be careful with automatic seeding in production - it may cause issues if the database is not ready or if there are permission issues.

## Tenant-Specific Shard Types

When a new tenant is created, the `seedForTenant()` method is called to clone system shard types for that tenant. This happens automatically during tenant creation.

## What Gets Seeded

The seeder creates:

1. **60 Core Shard Types** (from `CORE_SHARD_TYPES`):
   - CRM types: `c_opportunity`, `c_account`, `c_contact`, `c_lead`, etc.
   - Communication types: `c_email`, `c_message`, `c_meeting`, etc.
   - Product types: `c_product`, `c_priceBook`, etc.
   - File types: `c_file`, `c_folder`, `c_attachment`, etc.
   - And many more...

2. **34 Embedding Templates** (from `EMBEDDING_TEMPLATE_MAP`):
   - Field weighting configurations
   - Preprocessing instructions
   - Normalization settings
   - Model selection strategies

3. **System Context Templates** (if defined):
   - AI context assembly templates

## Next Steps

After seeding:

1. **Verify**: Run the validation script to ensure everything is correct
2. **Test**: Create a test shard of each type to verify schemas work
3. **Integrate**: Start using the shard types in your integrations

## Related Documentation

- [Core Shard Types Overview](./core-types/README.md)
- [Shard Types Implementation](./IMPLEMENTATION_COMPLETION_SUMMARY.md)
- [Embedding Templates](./README.md#embedding-templates)


