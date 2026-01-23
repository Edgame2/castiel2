# Adaptive Learning Utility Scripts

Utility scripts for managing and monitoring the CAIS adaptive learning system.

## Scripts

### check-learning-status.ts

Check the learning status for a tenant, context, and/or service type.

**Usage:**
```bash
pnpm tsx scripts/adaptive-learning/check-learning-status.ts <tenantId> [contextKey] [serviceType]
```

**Examples:**
```bash
# Check all learning records for a tenant
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123

# Check specific context
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123 "tech:large:proposal"

# Check specific service type
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123 "tech:large:proposal" risk
```

**Output:**
- Learning records found
- Examples collected
- Learning stage
- Blend ratio
- Active weights (with comparison to defaults)
- Performance metrics
- Validation status
- Rollback status

---

### reset-learning.ts

Reset learned parameters to defaults for a specific tenant/context/service.

**⚠️ WARNING:** This will clear all learned parameters and start learning from scratch!

**Usage:**
```bash
pnpm tsx scripts/adaptive-learning/reset-learning.ts <tenantId> <contextKey> <serviceType>
```

**Example:**
```bash
pnpm tsx scripts/adaptive-learning/reset-learning.ts tenant-123 "tech:large:proposal" risk
```

**What it does:**
- Resets learned weights to defaults
- Clears examples count
- Sets blend ratio to 0%
- Marks as rolled back
- System will start learning from scratch

---

### export-learning-data.ts

Export learning data for analysis or backup.

**Usage:**
```bash
pnpm tsx scripts/adaptive-learning/export-learning-data.ts <tenantId> [outputFile]
```

**Examples:**
```bash
# Export to file
pnpm tsx scripts/adaptive-learning/export-learning-data.ts tenant-123 learning-data.json

# Export to stdout
pnpm tsx scripts/adaptive-learning/export-learning-data.ts tenant-123
```

**Exports:**
- Learning records
- Outcomes
- Performance metrics (if available)

---

## Prerequisites

1. **Environment Variables:**
   - `COSMOS_DB_ENDPOINT` - Cosmos DB endpoint
   - `COSMOS_DB_KEY` - Cosmos DB key
   - `COSMOS_DB_DATABASE` - Database name

2. **Dependencies:**
   - `@azure/cosmos` - Cosmos DB client
   - `tsx` - TypeScript execution

## Installation

Scripts use the project's existing dependencies. No additional installation needed.

## Common Use Cases

### Monitor Learning Progress

```bash
# Check status weekly
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123
```

### Troubleshoot Issues

```bash
# Check specific context that's having issues
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123 "tech:large:proposal" risk

# Export data for analysis
pnpm tsx scripts/adaptive-learning/export-learning-data.ts tenant-123 debug-data.json
```

### Reset After Issues

```bash
# Reset if learning went wrong
pnpm tsx scripts/adaptive-learning/reset-learning.ts tenant-123 "tech:large:proposal" risk
```

### Backup Learning Data

```bash
# Export before major changes
pnpm tsx scripts/adaptive-learning/export-learning-data.ts tenant-123 backup-$(date +%Y%m%d).json
```

---

## Notes

- All scripts require Cosmos DB access
- Scripts are read-only except `reset-learning.ts`
- Use with caution in production
- Consider adding to CI/CD for automated monitoring

---

## Future Scripts

Potential future additions:
- `import-learning-data.ts` - Import learning data
- `compare-learning.ts` - Compare learning across tenants
- `validate-learning.ts` - Validate learning parameters
- `migrate-learning.ts` - Migrate learning data
