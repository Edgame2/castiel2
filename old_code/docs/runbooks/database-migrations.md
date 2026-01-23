# Database Migration Runbook

**Last Updated:** 2025-01-XX  
**Status:** Production Runbook

---

## Overview

This runbook provides procedures for executing database migrations safely in the Castiel platform using Cosmos DB.

---

## Pre-Migration Checklist

### 1. Backup Verification
- [ ] Verify Cosmos DB continuous backup is enabled
- [ ] Confirm backup retention period (30 days)
- [ ] Test restore procedure in staging
- [ ] Document current database state

### 2. Migration Review
- [ ] Review migration script
- [ ] Test migration in staging environment
- [ ] Verify migration is reversible
- [ ] Estimate migration duration
- [ ] Identify rollback procedure

### 3. Communication
- [ ] Notify team of planned migration
- [ ] Schedule maintenance window if needed
- [ ] Prepare status page update
- [ ] Set up monitoring alerts

### 4. Environment Preparation
- [ ] Verify staging environment matches production
- [ ] Test migration in staging
- [ ] Prepare rollback script
- [ ] Document rollback steps

---

## Migration Execution

### Step 1: Pre-Migration Backup

```bash
# Export current state (if needed)
az cosmosdb sql container show \
  --account-name <account> \
  --database-name castiel \
  --name <container> \
  --resource-group <rg> > backup-state.json

# Verify continuous backup status
az cosmosdb sql container show \
  --account-name <account> \
  --database-name castiel \
  --name <container> \
  --resource-group <rg> \
  --query "backupPolicy"
```

### Step 2: Execute Migration

#### Option A: Automated Migration Script
```bash
# Run migration script
cd apps/api
pnpm run migrate:up

# Verify migration completed
pnpm run migrate:status
```

#### Option B: Manual Migration
```bash
# Connect to Cosmos DB
# Execute migration SQL/commands
# Verify changes
```

### Step 3: Verification

1. **Verify Schema Changes:**
   ```bash
   # Check container properties
   az cosmosdb sql container show \
     --account-name <account> \
     --database-name castiel \
     --name <container> \
     --resource-group <rg>
   ```

2. **Test Application:**
   - Run smoke tests
   - Verify critical endpoints
   - Check error rates
   - Monitor performance

3. **Verify Data Integrity:**
   - Sample data queries
   - Count records
   - Verify relationships

### Step 4: Post-Migration

1. **Monitor:**
   - Watch error rates for 1 hour
   - Monitor performance metrics
   - Check application logs

2. **Document:**
   - Record migration completion
   - Update schema documentation
   - Note any issues encountered

---

## Rollback Procedures

### When to Rollback

- Migration fails partway through
- Data corruption detected
- Application errors after migration
- Performance degradation

### Rollback Steps

1. **Stop Application:**
   ```bash
   # Stop services
   docker-compose stop api
   ```

2. **Restore from Backup:**
   ```bash
   # Point-in-time restore (if available)
   az cosmosdb sql container restore \
     --account-name <account> \
     --database-name castiel \
     --name <container> \
     --resource-group <rg> \
     --restore-timestamp <timestamp>
   ```

3. **Or Execute Rollback Script:**
   ```bash
   # Run rollback migration
   cd apps/api
   pnpm run migrate:down
   ```

4. **Verify Rollback:**
   - Check schema reverted
   - Test application
   - Verify data integrity

5. **Restart Application:**
   ```bash
   docker-compose start api
   ```

---

## Migration Best Practices

### 1. Idempotency
- Migrations should be idempotent
- Can be run multiple times safely
- Check state before making changes

### 2. Reversibility
- Always provide rollback script
- Test rollback in staging
- Document rollback procedure

### 3. Incremental Changes
- Break large migrations into smaller steps
- Migrate data in batches
- Test each step independently

### 4. Zero-Downtime Migrations
- Use feature flags when possible
- Support both old and new schema during transition
- Migrate data in background
- Switch to new schema after migration complete

### 5. Testing
- Always test in staging first
- Use production-like data volumes
- Test rollback procedure
- Load test after migration

---

## Common Migration Scenarios

### Adding New Container

1. **Create Container:**
   ```bash
   az cosmosdb sql container create \
     --account-name <account> \
     --database-name castiel \
     --name <container-name> \
     --partition-key-path "/tenantId" \
     --resource-group <rg>
   ```

2. **Update Application:**
   - Add container to configuration
   - Update repository code
   - Deploy application

### Modifying Container Schema

1. **Cosmos DB is schema-less:**
   - No schema migration needed
   - Update application code
   - Handle both old and new formats during transition

2. **If Index Changes Needed:**
   - Update indexing policy
   - Monitor index build progress
   - Verify queries use indexes

### Data Migration

1. **Plan Migration:**
   - Estimate data volume
   - Plan batch size
   - Schedule migration window

2. **Execute Migration:**
   - Migrate in batches
   - Monitor progress
   - Verify data integrity

3. **Verify:**
   - Sample data checks
   - Count verification
   - Application testing

---

## Troubleshooting

### Migration Fails Partway

1. **Stop Migration:**
   - Identify failure point
   - Document partial state

2. **Assess Impact:**
   - Check data integrity
   - Verify application still works

3. **Decide:**
   - Continue migration (if safe)
   - Rollback (if unsafe)

### Performance Degradation

1. **Monitor:**
   - Check query performance
   - Review index usage
   - Monitor RU consumption

2. **Optimize:**
   - Add missing indexes
   - Optimize queries
   - Adjust indexing policy

### Data Inconsistency

1. **Identify:**
   - Find inconsistent records
   - Determine scope

2. **Fix:**
   - Run data fix script
   - Verify consistency
   - Monitor for recurrence

---

## Related Documentation

- [Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md)
- [Troubleshooting Runbook](./troubleshooting.md)
- [Rollback Procedures](./rollback-procedures.md)
