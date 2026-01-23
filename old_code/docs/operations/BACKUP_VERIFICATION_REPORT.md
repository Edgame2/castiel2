# Backup Verification and Restore Test Report

**Last Updated**: January 2025  
**Status**: Production Verification Report

---

## Overview

This document verifies that Cosmos DB and Redis backups are properly configured and documents the restore test procedures. This ensures that data can be recovered in the event of data loss or corruption.

---

## Backup Configuration Verification

### Cosmos DB Backup Configuration

#### Terraform Configuration

**File**: `infrastructure/terraform/cosmos-db.tf`

```terraform
backup {
  type = "Continuous"
  # Note: For Continuous backup, retention is fixed at 7-35 days based on tier
  # retention_in_hours cannot be specified for Continuous backup type
}
```

**Status**: ✅ **CONFIGURED**

**Configuration Details**:
- **Backup Type**: Continuous (point-in-time restore)
- **Retention Period**: 7-35 days (based on Cosmos DB tier)
- **Coverage**: All containers in the Cosmos DB account
- **RPO (Recovery Point Objective)**: < 1 hour (continuous backup)

#### Verification Commands

```bash
# Verify Cosmos DB continuous backup is enabled
az cosmosdb account show \
  --name <cosmos-account-name> \
  --resource-group <resource-group> \
  --query "backupPolicy"

# Expected output should show:
# {
#   "continuousModeProperties": {
#     "tier": "Continuous7Days" or "Continuous30Days"
#   },
#   "type": "Continuous"
# }

# List all containers with backup status
az cosmosdb sql container list \
  --account-name <cosmos-account-name> \
  --database-name castiel \
  --resource-group <resource-group> \
  --query "[].{Name:name, BackupEnabled:backupPolicy}"
```

#### Verification Checklist

- [x] Continuous backup enabled in Terraform
- [ ] Verified in Azure Portal (manual verification required)
- [ ] Verified via Azure CLI (run verification commands)
- [ ] Documented retention period
- [ ] Tested restore procedure (see Restore Test section)

---

### Redis Backup Configuration

#### Terraform Configuration

**File**: `infrastructure/terraform/redis.tf`

```terraform
redis_configuration {
  # Enable Redis persistence for production only
  rdb_backup_enabled            = var.environment == "production" ? true : null
  rdb_backup_frequency          = var.environment == "production" ? 60 : null
  rdb_backup_max_snapshot_count = var.environment == "production" ? 1 : null
  rdb_storage_connection_string = var.environment == "production" ? azurerm_storage_account.redis_backup[0].primary_blob_connection_string : null
}
```

**Status**: ✅ **CONFIGURED** (Production only)

**Configuration Details**:
- **Backup Type**: RDB (Redis Database Backup)
- **Backup Frequency**: Every 60 minutes (production)
- **Max Snapshots**: 1 (production)
- **Storage**: Azure Blob Storage (GRS - Geo-Redundant Storage)
- **Coverage**: Production environment only
- **RPO (Recovery Point Objective)**: < 60 minutes (hourly backups)

#### Storage Account Configuration

**File**: `infrastructure/terraform/redis.tf`

```terraform
resource "azurerm_storage_account" "redis_backup" {
  count = var.environment == "production" ? 1 : 0
  
  name                     = "${var.resource_prefix}redisbkp${var.environment}${random_string.suffix.result}"
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-Redundant Storage
  min_tls_version          = "TLS1_2"
}
```

**Status**: ✅ **CONFIGURED** (Production only)

#### Verification Commands

```bash
# Verify Redis backup configuration
az redis show \
  --name <redis-name> \
  --resource-group <resource-group> \
  --query "redisConfiguration.rdbBackupEnabled"

# Expected output: true (for production)

# Check backup frequency
az redis show \
  --name <redis-name> \
  --resource-group <resource-group> \
  --query "redisConfiguration.rdbBackupFrequency"

# Expected output: 60 (minutes)

# Verify storage account exists
az storage account show \
  --name <redis-backup-storage-account> \
  --resource-group <resource-group> \
  --query "{Name:name, Replication:sku.name, TLS:minimumTlsVersion}"

# List backup blobs
az storage blob list \
  --account-name <redis-backup-storage-account> \
  --container-name <redis-backup-container> \
  --query "[].{Name:name, LastModified:properties.lastModified}"
```

#### Verification Checklist

- [x] RDB backup enabled in Terraform (production)
- [x] Storage account configured (production)
- [ ] Verified in Azure Portal (manual verification required)
- [ ] Verified via Azure CLI (run verification commands)
- [ ] Verified backup blobs exist in storage account
- [ ] Tested restore procedure (see Restore Test section)

---

## Restore Test Procedures

### Cosmos DB Point-in-Time Restore Test

#### Prerequisites

- Azure CLI installed and authenticated
- Access to Cosmos DB account
- Test data in Cosmos DB containers
- Staging/test environment for restore

#### Test Procedure

1. **Document Current State**:
   ```bash
   # Record current timestamp
   RESTORE_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
   echo "Restore timestamp: $RESTORE_TIMESTAMP"
   
   # Document current data
   az cosmosdb sql container query \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards \
     --resource-group <rg> \
     --query-text "SELECT COUNT(1) as count FROM c" \
     > pre-restore-state.json
   ```

2. **Create Test Data**:
   ```bash
   # Create a test shard (via API or direct insert)
   # This will be used to verify restore works
   ```

3. **Wait for Backup** (if needed):
   ```bash
   # Continuous backup is automatic, but wait a few minutes
   # to ensure backup is available
   sleep 300  # Wait 5 minutes
   ```

4. **List Available Restore Points**:
   ```bash
   # List restorable containers
   az cosmosdb sql restorable-container list \
     --account-name <cosmos-account> \
     --database-rid <database-rid> \
     --location <location> \
     --resource-group <rg>
   
   # Get restore timestamp range
   az cosmosdb sql restorable-database list \
     --account-name <cosmos-account> \
     --location <location> \
     --resource-group <rg>
   ```

5. **Perform Point-in-Time Restore**:
   ```bash
   # Restore to a new container (cannot restore to existing)
   az cosmosdb sql container create \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards-restored \
     --resource-group <rg> \
     --restore-timestamp "$RESTORE_TIMESTAMP" \
     --restore-source "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.DocumentDB/databaseAccounts/<cosmos-account>/restorableDatabaseAccounts/<cosmos-account>/restorableDatabases/<db-rid>/restorableContainers/<container-rid>"
   ```

6. **Verify Restore**:
   ```bash
   # Query restored container
   az cosmosdb sql container query \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards-restored \
     --resource-group <rg> \
     --query-text "SELECT COUNT(1) as count FROM c"
   
   # Compare with pre-restore state
   diff pre-restore-state.json restored-state.json
   ```

7. **Cleanup**:
   ```bash
   # Delete restored container after verification
   az cosmosdb sql container delete \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards-restored \
     --resource-group <rg> \
     --yes
   ```

#### Success Criteria

- ✅ Restore command executes successfully
- ✅ Restored container contains expected data
- ✅ Data matches pre-restore state
- ✅ Restore completes within RTO (4 hours)
- ✅ RPO is met (< 1 hour)

#### Test Frequency

- **Initial Test**: Before production deployment
- **Regular Testing**: Quarterly
- **After Major Changes**: Test after infrastructure changes

---

### Redis Restore Test

#### Prerequisites

- Azure CLI installed and authenticated
- Access to Redis cache
- Access to backup storage account
- Test data in Redis

#### Test Procedure

1. **Document Current State**:
   ```bash
   # Connect to Redis and get current keys
   redis-cli -h <redis-host> -p 6380 -a <password> --tls \
     --scan --pattern "*" > pre-restore-keys.txt
   
   # Get key counts
   redis-cli -h <redis-host> -p 6380 -a <password> --tls \
     DBSIZE > pre-restore-dbsize.txt
   ```

2. **Create Test Data**:
   ```bash
   # Set test keys
   redis-cli -h <redis-host> -p 6380 -a <password> --tls \
     SET "test:restore:key" "test-value-$(date +%s)"
   ```

3. **Wait for Backup**:
   ```bash
   # Wait for next scheduled backup (up to 60 minutes)
   # Or trigger manual backup if supported
   ```

4. **List Available Backups**:
   ```bash
   # List backup blobs in storage account
   az storage blob list \
     --account-name <redis-backup-storage-account> \
     --container-name <redis-backup-container> \
     --query "[].{Name:name, LastModified:properties.lastModified}" \
     --output table
   ```

5. **Download Backup**:
   ```bash
   # Download latest backup
   LATEST_BACKUP=$(az storage blob list \
     --account-name <redis-backup-storage-account> \
     --container-name <redis-backup-container> \
     --query "[0].name" -o tsv)
   
   az storage blob download \
     --account-name <redis-backup-storage-account> \
     --container-name <redis-backup-container> \
     --name "$LATEST_BACKUP" \
     --file redis-backup.rdb
   ```

6. **Restore from Backup** (Test Environment):
   ```bash
   # Note: Cannot restore to production Redis directly
   # Must restore to a new Redis instance or test environment
   
   # Option 1: Restore to new Redis instance (test)
   az redis create \
     --name <redis-test-restore> \
     --resource-group <rg> \
     --location <location> \
     --sku Standard \
     --vm-size c2
   
   # Option 2: Use redis-cli to restore (if direct access available)
   # Stop Redis, replace RDB file, restart Redis
   # (Only in test environment, not production)
   ```

7. **Verify Restore**:
   ```bash
   # Connect to restored Redis and verify data
   redis-cli -h <restored-redis-host> -p 6380 -a <password> --tls \
     --scan --pattern "*" > restored-keys.txt
   
   # Compare keys
   diff pre-restore-keys.txt restored-keys.txt
   
   # Verify test key exists
   redis-cli -h <restored-redis-host> -p 6380 -a <password> --tls \
     GET "test:restore:key"
   ```

8. **Cleanup**:
   ```bash
   # Delete test Redis instance
   az redis delete \
     --name <redis-test-restore> \
     --resource-group <rg> \
     --yes
   ```

#### Success Criteria

- ✅ Backup file exists in storage account
- ✅ Backup file can be downloaded
- ✅ Restore to test environment succeeds
- ✅ Restored data matches pre-backup state
- ✅ RPO is met (< 60 minutes)

#### Test Frequency

- **Initial Test**: Before production deployment
- **Regular Testing**: Quarterly
- **After Major Changes**: Test after infrastructure changes

---

## Automated Backup Verification Script

### Script Location

**File**: `scripts/verify-backups.sh`

### Script Purpose

Automated script to verify backup configuration and status for both Cosmos DB and Redis.

### Usage

```bash
# Run backup verification
./scripts/verify-backups.sh

# With specific resource group
./scripts/verify-backups.sh --resource-group <rg-name>

# With specific environment
./scripts/verify-backups.sh --environment production
```

### What It Checks

1. **Cosmos DB**:
   - Continuous backup enabled
   - Backup policy configuration
   - Restorable containers available

2. **Redis** (Production only):
   - RDB backup enabled
   - Backup frequency configured
   - Storage account exists
   - Backup blobs present

### Expected Output

```
✅ Cosmos DB continuous backup: ENABLED
✅ Cosmos DB backup retention: 7-35 days
✅ Redis RDB backup: ENABLED (production)
✅ Redis backup frequency: 60 minutes
✅ Redis backup storage: CONFIGURED
✅ Latest Redis backup: 2025-01-17T10:30:00Z
```

---

## Backup Monitoring

### Cosmos DB Backup Monitoring

#### Metrics to Monitor

- **Backup Status**: Verify continuous backup is active
- **Restore Availability**: Monitor available restore points
- **Backup Retention**: Track retention period

#### Alerts

Currently, Cosmos DB continuous backup status is monitored through:
- Azure Portal dashboard
- Application Insights (if custom metrics added)
- Manual verification (quarterly)

**Recommendation**: Add automated alert for backup status changes.

### Redis Backup Monitoring

#### Metrics to Monitor

- **Backup Status**: Verify RDB backup is enabled
- **Backup Frequency**: Monitor backup execution
- **Storage Account**: Monitor backup storage availability
- **Backup Blobs**: Track backup blob creation

#### Alerts

Currently, Redis backup status is monitored through:
- Azure Portal dashboard
- Storage account blob monitoring
- Manual verification (quarterly)

**Recommendation**: Add automated alert for backup failures.

---

## Backup Configuration Summary

| Service | Backup Type | Retention | Frequency | RPO | Status |
|---------|------------|-----------|-----------|-----|--------|
| Cosmos DB | Continuous | 7-35 days | Continuous | < 1 hour | ✅ Configured |
| Redis (Production) | RDB | 1 snapshot | 60 minutes | < 60 minutes | ✅ Configured |
| Redis (Non-Prod) | None | N/A | N/A | N/A | ⚠️ Not configured (by design) |

---

## Restore Test Results

### Last Test Date

**Date**: TBD (To be completed)

### Cosmos DB Restore Test

- **Test Date**: TBD
- **Status**: ⏳ Pending
- **Result**: TBD
- **RTO Achieved**: TBD
- **RPO Achieved**: TBD
- **Issues Found**: None

### Redis Restore Test

- **Test Date**: TBD
- **Status**: ⏳ Pending
- **Result**: TBD
- **RTO Achieved**: TBD
- **RPO Achieved**: TBD
- **Issues Found**: None

---

## Recommendations

### Immediate Actions

1. **Run Initial Verification**:
   - Execute verification commands in production
   - Document actual backup configuration
   - Verify backup storage accounts exist

2. **Perform Restore Tests**:
   - Test Cosmos DB point-in-time restore in staging
   - Test Redis restore in test environment
   - Document test results

3. **Set Up Monitoring**:
   - Add alerts for backup status changes
   - Monitor backup blob creation
   - Track restore availability

### Long-Term Improvements

1. **Automated Testing**:
   - Schedule quarterly restore tests
   - Automate backup verification
   - Add restore tests to CI/CD

2. **Documentation**:
   - Create detailed restore runbooks
   - Document restore procedures for each service
   - Update disaster recovery plan with test results

3. **Monitoring Enhancements**:
   - Add custom metrics for backup status
   - Create backup health dashboard
   - Set up automated backup verification alerts

---

## Verification Script

A backup verification script is available at `scripts/verify-backups.sh` that automates the verification of backup configuration for both Cosmos DB and Redis.

### Usage

```bash
# Run backup verification
./scripts/verify-backups.sh

# The script will:
# 1. Check Cosmos DB continuous backup configuration
# 2. Check Redis RDB backup configuration (production)
# 3. Verify backup storage accounts exist
# 4. Report backup status
```

### Integration with CI/CD

The verification script can be integrated into CI/CD pipelines to ensure backups are always configured:

```yaml
# Example GitHub Actions step
- name: Verify Backups
  run: |
    chmod +x scripts/verify-backups.sh
    ./scripts/verify-backups.sh
```

---

## Related Documentation

- [Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md) - Disaster recovery procedures
- [Database Migrations](../runbooks/database-migrations.md) - Migration procedures with backup verification
- [Rollback Procedures](../runbooks/rollback-procedures.md) - Rollback procedures including data restore
- [Test Procedures](./TEST_PROCEDURES.md) - DR test procedures including backup restore tests

---

**Document Version**: 1.0  
**Last Review**: January 2025  
**Next Review**: Quarterly  
**Next Restore Test**: TBD (Schedule quarterly)
