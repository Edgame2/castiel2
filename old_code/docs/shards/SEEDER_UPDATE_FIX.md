# Seeder Update: Embedding Template Attachment

## Problem

The seeder was skipping existing shard types without updating them. This meant:
- Shard types created before embedding templates were added had no templates
- Running the seeder multiple times wouldn't fix missing templates
- Verification showed 0 types with templates even though templates were defined

## Solution

Updated the seeder to:
1. **Check for missing templates**: When an existing shard type is found, check if it's missing an embedding template
2. **Update existing types**: If a template is available in `EMBEDDING_TEMPLATE_MAP` but the type doesn't have one, update it
3. **Repository support**: Fixed the repository's `update` method to handle `embeddingTemplate` field

## Changes Made

### 1. Repository Update (`shard-type.repository.ts`)

Added `embeddingTemplate` handling to the `update` method:

```typescript
const updated: ShardType = {
  ...existing,
  // ... other fields ...
  embeddingTemplate: input.embeddingTemplate !== undefined 
    ? input.embeddingTemplate 
    : existing.embeddingTemplate,
  // ... rest of fields ...
};
```

### 2. Seeder Update (`core-types-seeder.service.ts`)

Modified `seedCoreShardTypes()` to:
- Check if existing types are missing templates
- Update existing types with templates when available
- Track updates separately from new creations

```typescript
if (existing) {
  // Check if existing type needs embedding template update
  if (embeddingTemplate && !existing.embeddingTemplate) {
    // Update existing type with embedding template
    await this.shardTypeRepository.update(existing.id, SYSTEM_TENANT_ID, {
      embeddingTemplate,
    });
    results.seeded++; // Count as seeded (updated)
    // ...
  } else {
    results.skipped++;
  }
  continue;
}
```

## Usage

Now when you run the seeder:

```bash
pnpm --filter @castiel/api run seed-types
```

It will:
1. **Create** new shard types that don't exist
2. **Update** existing types that are missing embedding templates
3. **Skip** types that already have templates

## Expected Output

After running the seeder, you should see:

```
📊 ShardTypes:
   ✅ Seeded:  34  (includes both new and updated)
   ℹ️  Skipped: 26  (already have templates)
```

Then verify:

```bash
pnpm --filter @castiel/api run verify:shard-types
```

Should show:
```
   📄 With Template:   34
   ⚠️  No Template:     26  (types without templates in EMBEDDING_TEMPLATE_MAP)
```

## Notes

- The seeder is still idempotent - safe to run multiple times
- Only updates types that are missing templates (won't overwrite existing templates)
- Missing types like `c_document` and `c_assistant` are defined in separate seed files and need to be handled separately



