# Disaster Recovery Test Procedures

**Last Updated**: January 2025  
**Status**: Production Test Procedures

---

## Overview

This document provides comprehensive disaster recovery (DR) test procedures for the Castiel platform. Regular DR testing ensures that backup and recovery procedures work correctly and that recovery objectives (RTO/RPO) can be met.

---

## Recovery Objectives

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour (continuous backup)

---

## Test Schedule

### Regular Test Schedule

| Test Type | Frequency | Duration | Owner | Next Test Date |
|-----------|-----------|----------|-------|----------------|
| Backup Verification | Monthly | 30 minutes | DevOps Team | TBD |
| Point-in-Time Recovery | Quarterly | 2-4 hours | DevOps Team | TBD |
| Full System Recovery | Annually | 4-8 hours | DevOps Team | TBD |
| Regional Failover | Annually | 4-8 hours | DevOps Team | TBD |
| Data Corruption Recovery | Quarterly | 2-4 hours | DevOps Team | TBD |
| Resource Deletion Recovery | Annually | 2-4 hours | DevOps Team | TBD |

### Test Calendar

- **Monthly**: Backup verification (automated)
- **Quarterly**: Point-in-time recovery, data corruption recovery
- **Annually**: Full system recovery, regional failover, resource deletion recovery

### Test Notification

- **1 Week Before**: Notify team of upcoming DR test
- **1 Day Before**: Confirm test environment availability
- **Day of Test**: Execute test and document results
- **1 Week After**: Review results and update procedures

---

## Pre-Test Preparation

### Prerequisites Checklist

- [ ] Test environment is isolated from production
- [ ] Backups are verified and current
- [ ] Test data is prepared (if needed)
- [ ] Recovery scripts are tested
- [ ] Monitoring is enabled
- [ ] Team members are notified
- [ ] Test window is scheduled
- [ ] Rollback plan is prepared

### Test Environment Setup

1. **Isolated Test Environment**:
   ```bash
   # Use staging environment or dedicated DR test environment
   # Ensure it's isolated from production
   ```

2. **Backup Verification**:
   ```bash
   # Run backup verification script
   ./scripts/verify-backups.sh
   ```

3. **Document Baseline**:
   ```bash
   # Export current state
   terraform state pull > pre-test-state.json
   
   # Document resource configurations
   az resource list --resource-group <rg> --output table > pre-test-resources.txt
   ```

---

## Test Scenarios

### Test 1: Backup Verification

**Purpose**: Verify that backups are configured correctly and are being created.

**Frequency**: Monthly

**Duration**: 30 minutes

**Procedure**:

1. **Verify Cosmos DB Backups**:
   ```bash
   # Check continuous backup status
   az cosmosdb account show \
     --name <cosmos-account> \
     --resource-group <rg> \
     --query "backupPolicy"
   
   # List restorable containers
   az cosmosdb sql restorable-container list \
     --account-name <cosmos-account> \
     --location <location> \
     --resource-group <rg>
   ```

2. **Verify Redis Backups**:
   ```bash
   # Check RDB backup status
   az redis show \
     --name <redis-name> \
     --resource-group <rg> \
     --query "redisConfiguration.rdbBackupEnabled"
   
   # List backup blobs
   az storage blob list \
     --account-name <redis-backup-storage> \
     --container-name <redis-backup-container> \
     --query "[].{Name:name, LastModified:properties.lastModified}"
   ```

3. **Verify Terraform State Backup**:
   ```bash
   # Check Terraform state backup
   ls -lh terraform.tfstate.backup*
   ```

**Success Criteria**:
- ✅ Cosmos DB continuous backup is enabled
- ✅ Restorable containers are available
- ✅ Redis RDB backup is enabled (production)
- ✅ Backup blobs exist in storage account
- ✅ Terraform state backups exist

**Documentation**: Record results in test log

---

### Test 2: Point-in-Time Recovery

**Purpose**: Verify ability to restore data to a specific point in time.

**Frequency**: Quarterly

**Duration**: 2-4 hours

**Procedure**:

1. **Prepare Test Data**:
   ```bash
   # Create test shard via API
   curl -X POST https://api-staging.castiel.app/api/v1/shard-types \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"DR-Test-Shard","type":"document"}'
   
   # Record timestamp
   RESTORE_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
   echo "Test timestamp: $RESTORE_TIMESTAMP"
   ```

2. **Wait for Backup** (if needed):
   ```bash
   # Wait 5 minutes for continuous backup to capture
   sleep 300
   ```

3. **Modify Test Data**:
   ```bash
   # Update or delete test shard
   curl -X DELETE https://api-staging.castiel.app/api/v1/shard-types/<test-shard-id> \
     -H "Authorization: Bearer $TOKEN"
   ```

4. **List Available Restore Points**:
   ```bash
   # List restorable containers
   az cosmosdb sql restorable-container list \
     --account-name <cosmos-account> \
     --location <location> \
     --resource-group <rg> \
     --output table
   ```

5. **Perform Point-in-Time Restore**:
   ```bash
   # Restore to new container
   az cosmosdb sql container create \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards-restored-test \
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
     --name shards-restored-test \
     --resource-group <rg> \
     --query-text "SELECT * FROM c WHERE c.name = 'DR-Test-Shard'"
   
   # Verify test shard exists in restored container
   ```

7. **Measure RPO**:
   ```bash
   # Calculate time difference between restore timestamp and actual restore
   # RPO should be < 1 hour
   ```

8. **Cleanup**:
   ```bash
   # Delete restored test container
   az cosmosdb sql container delete \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards-restored-test \
     --resource-group <rg> \
     --yes
   ```

**Success Criteria**:
- ✅ Restore command executes successfully
- ✅ Restored container contains expected data
- ✅ Data matches pre-modification state
- ✅ RPO is met (< 1 hour)
- ✅ Restore completes within acceptable time

**Documentation**: Record restore time, RPO achieved, and any issues

---

### Test 3: Full System Recovery

**Purpose**: Verify complete system recovery from backup in isolated environment.

**Frequency**: Annually (or after major infrastructure changes)

**Duration**: 4-8 hours

**Procedure**:

1. **Document Current State**:
   ```bash
   # Export Terraform state
   terraform state pull > pre-recovery-state.json
   
   # Document resource configurations
   az resource list --resource-group <rg> --output json > pre-recovery-resources.json
   
   # Export application settings
   az containerapp show \
     --name <app-name> \
     --resource-group <rg> \
     --query "properties.configuration" > pre-recovery-config.json
   ```

2. **Create Isolated Recovery Environment**:
   ```bash
   # Create new resource group for recovery test
   az group create \
     --name castiel-dr-test-recovery \
     --location <location>
   ```

3. **Restore Infrastructure**:
   ```bash
   # Initialize Terraform in recovery environment
   cd infrastructure/terraform
   terraform init -backend-config=backend-dr-test.hcl
   
   # Apply infrastructure
   terraform apply -var="environment=dr-test"
   ```

4. **Restore Cosmos DB**:
   ```bash
   # Create Cosmos DB account in recovery environment
   az cosmosdb account create \
     --name <cosmos-account-dr-test> \
     --resource-group castiel-dr-test-recovery \
     --location <location>
   
   # Restore containers from backup
   # (Use point-in-time restore procedures)
   ```

5. **Restore Redis**:
   ```bash
   # Create Redis cache in recovery environment
   az redis create \
     --name <redis-dr-test> \
     --resource-group castiel-dr-test-recovery \
     --location <location> \
     --sku Standard \
     --vm-size c2
   
   # Restore from backup blob (if available)
   ```

6. **Restore Application Configuration**:
   ```bash
   # Deploy application to recovery environment
   az containerapp create \
     --name <app-dr-test> \
     --resource-group castiel-dr-test-recovery \
     --environment <container-env> \
     --image <app-image> \
     --set-env-vars @pre-recovery-config.json
   ```

7. **Verify System**:
   ```bash
   # Health checks
   curl https://<app-dr-test-url>/health
   curl https://<app-dr-test-url>/ready
   
   # Functional tests
   # - Test authentication
   # - Test data access
   # - Test critical user flows
   ```

8. **Measure RTO**:
   ```bash
   # Calculate time from disaster simulation to full recovery
   # RTO should be < 4 hours
   ```

9. **Cleanup**:
   ```bash
   # Delete recovery test environment
   az group delete \
     --name castiel-dr-test-recovery \
     --yes
   ```

**Success Criteria**:
- ✅ Infrastructure is restored
- ✅ Data is restored and accessible
- ✅ Application is functional
- ✅ Health checks pass
- ✅ Critical user flows work
- ✅ RTO is met (< 4 hours)
- ✅ RPO is met (< 1 hour)

**Documentation**: Record recovery time, RTO/RPO achieved, issues encountered, and lessons learned

---

### Test 4: Regional Failover

**Purpose**: Verify multi-region failover capability.

**Frequency**: Annually

**Duration**: 4-8 hours

**Procedure**:

1. **Verify Multi-Region Configuration**:
   ```bash
   # Check Cosmos DB multi-region setup
   az cosmosdb show \
     --name <cosmos-account> \
     --resource-group <rg> \
     --query "locations"
   
   # Verify secondary region resources exist
   az resource list \
     --resource-group <rg-secondary> \
     --output table
   ```

2. **Document Primary Region State**:
   ```bash
   # Export current state
   terraform state pull > pre-failover-state.json
   
   # Document active region
   echo "Primary region: <region>" > failover-log.txt
   ```

3. **Initiate Failover**:
   ```bash
   # Failover Cosmos DB to secondary region
   az cosmosdb failover-priority-change \
     --account-name <cosmos-account> \
     --resource-group <rg> \
     --failover-policies <primary-region>=0 <secondary-region>=1
   
   # Update Traffic Manager (if configured)
   az network traffic-manager profile update \
     --name <tm-profile> \
     --resource-group <rg> \
     --routing-method Priority
   ```

4. **Scale Secondary Region Resources**:
   ```bash
   # Scale up secondary App Service
   az containerapp update \
     --name <app-secondary> \
     --resource-group <rg-secondary> \
     --scale-rule-name http-scale \
     --min-replicas 2 \
     --max-replicas 10
   ```

5. **Verify Failover**:
   ```bash
   # Check Cosmos DB write region
   az cosmosdb show \
     --name <cosmos-account> \
     --resource-group <rg> \
     --query "writeLocations[0].locationName"
   
   # Test application functionality
   curl https://<app-secondary-url>/health
   curl https://<app-secondary-url>/api/v1/shard-types
   ```

6. **Measure Failover Time**:
   ```bash
   # Record time from failover initiation to application functional
   # Target: < 30 minutes for failover
   ```

7. **Failback to Primary** (after test):
   ```bash
   # Failback Cosmos DB to primary region
   az cosmosdb failover-priority-change \
     --account-name <cosmos-account> \
     --resource-group <rg> \
     --failover-policies <primary-region>=0 <secondary-region>=1
   ```

**Success Criteria**:
- ✅ Failover completes successfully
- ✅ Secondary region becomes primary
- ✅ Application functions in secondary region
- ✅ No data loss
- ✅ Failover time < 30 minutes
- ✅ Performance is acceptable

**Documentation**: Record failover time, data consistency, and any issues

---

### Test 5: Data Corruption Recovery

**Purpose**: Verify ability to recover from data corruption.

**Frequency**: Quarterly

**Duration**: 2-4 hours

**Procedure**:

1. **Create Test Data**:
   ```bash
   # Create test shard with known data
   curl -X POST https://api-staging.castiel.app/api/v1/shards \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Corruption-Test","type":"document","data":{"test":"value"}}'
   
   # Record timestamp
   CORRUPTION_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
   ```

2. **Simulate Corruption**:
   ```bash
   # Manually corrupt data (in test environment only)
   # Or use a script to introduce data inconsistencies
   ```

3. **Detect Corruption**:
   ```bash
   # Run data validation scripts
   # Check application logs for errors
   # Verify data integrity checks
   ```

4. **Identify Corruption Point**:
   ```bash
   # Review Application Insights logs
   # Identify timestamp of corruption
   # Document affected containers
   ```

5. **Restore from Point-in-Time**:
   ```bash
   # Restore affected container to timestamp before corruption
   az cosmosdb sql container restore \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name <corrupted-container> \
     --resource-group <rg> \
     --restore-timestamp "<timestamp-before-corruption>"
   ```

6. **Verify Recovery**:
   ```bash
   # Verify data integrity
   # Run validation scripts
   # Test application functionality
   # Verify test data is restored correctly
   ```

**Success Criteria**:
- ✅ Corruption is detected
- ✅ Corruption point is identified
- ✅ Restore succeeds
- ✅ Data integrity is restored
- ✅ Application functions correctly
- ✅ RPO is met (< 1 hour)

**Documentation**: Record corruption detection time, restore time, and data validation results

---

### Test 6: Resource Deletion Recovery

**Purpose**: Verify ability to recover from accidental resource deletion.

**Frequency**: Annually

**Duration**: 2-4 hours

**Procedure**:

1. **Document Resources**:
   ```bash
   # List all resources
   az resource list --resource-group <rg> --output table > pre-deletion-resources.txt
   
   # Export Terraform state
   terraform state pull > pre-deletion-state.json
   ```

2. **Simulate Deletion** (in test environment):
   ```bash
   # Delete a test resource (e.g., storage account, Redis cache)
   az storage account delete \
     --name <test-storage-account> \
     --resource-group <rg> \
     --yes
   ```

3. **Detect Deletion**:
   ```bash
   # Check Terraform state
   terraform state list
   
   # Check Azure Portal
   # Review Application Insights alerts
   ```

4. **Recover Resource**:
   ```bash
   # Option 1: Restore from Terraform
   terraform import azurerm_storage_account.test <resource-id>
   terraform apply -target=azurerm_storage_account.test
   
   # Option 2: Recreate from Terraform state
   terraform apply -target=azurerm_storage_account.test
   ```

5. **Verify Recovery**:
   ```bash
   # Verify resource exists
   az storage account show \
     --name <test-storage-account> \
     --resource-group <rg>
   
   # Verify application functionality
   curl https://<app-url>/health
   ```

**Success Criteria**:
- ✅ Deletion is detected
- ✅ Resource is recovered
- ✅ Application functions correctly
- ✅ Recovery time < 2 hours

**Documentation**: Record detection time, recovery time, and method used

---

## Test Execution Checklist

### Pre-Test

- [ ] Test environment is isolated
- [ ] Backups are verified
- [ ] Test data is prepared
- [ ] Team is notified
- [ ] Test window is scheduled
- [ ] Monitoring is enabled
- [ ] Rollback plan is ready

### During Test

- [ ] Execute test procedure step-by-step
- [ ] Document each step
- [ ] Record timestamps
- [ ] Monitor system behavior
- [ ] Capture metrics
- [ ] Take screenshots (if applicable)
- [ ] Note any issues

### Post-Test

- [ ] Verify system is restored
- [ ] Clean up test resources
- [ ] Document test results
- [ ] Calculate RTO/RPO achieved
- [ ] Review lessons learned
- [ ] Update runbooks if needed
- [ ] Create improvement tickets
- [ ] Schedule next test

---

## Test Results Documentation

### Test Result Template

For each test execution, document:

1. **Test Information**:
   - Test type and scenario
   - Date and time
   - Test environment
   - Test duration
   - Testers involved

2. **Test Results**:
   - Success/failure status
   - RTO achieved
   - RPO achieved
   - Issues encountered
   - Performance metrics

3. **Findings**:
   - What worked well
   - What didn't work
   - Bottlenecks identified
   - Improvement opportunities

4. **Actions**:
   - Runbooks updated
   - Procedures improved
   - Automation added
   - Follow-up tests scheduled

### Test Results Storage

- Store test results in: `docs/test-results/dr-tests/`
- Format: Markdown with timestamps
- Include: Metrics, logs, screenshots
- Archive: Keep results for 2 years

---

## Test Automation

### Automated Backup Verification

The backup verification script (`scripts/verify-backups.sh`) can be run automatically:

```bash
# Add to cron or scheduled task
# Run monthly
0 0 1 * * /path/to/scripts/verify-backups.sh >> /var/log/dr-tests/backup-verification.log 2>&1
```

### CI/CD Integration

DR tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: DR Test - Backup Verification

on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly on 1st
  workflow_dispatch:

jobs:
  backup-verification:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify Backups
        run: ./scripts/verify-backups.sh
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: backup-verification-results
          path: backup-verification.log
```

---

## Continuous Improvement

### Test Procedure Updates

- Review test procedures quarterly
- Update based on:
  - Test results
  - Infrastructure changes
  - New services added
  - Lessons learned

### Metrics Tracking

Track the following metrics over time:
- Test execution frequency
- Test success rate
- RTO achieved vs target
- RPO achieved vs target
- Recovery time improvements
- Issues discovered per test

---

## Related Documentation

- [Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md) - DR recovery procedures
- [Backup Verification Report](./BACKUP_VERIFICATION_REPORT.md) - Backup configuration and verification
- [Test Procedures](./TEST_PROCEDURES.md) - General test procedures including DR tests
- [Rollback Procedures](../runbooks/rollback-procedures.md) - Rollback procedures
- [Database Migrations](../runbooks/database-migrations.md) - Database migration procedures

---

**Document Version**: 1.0  
**Last Review**: January 2025  
**Next Review**: Quarterly  
**Next Scheduled Test**: TBD (See test schedule above)
