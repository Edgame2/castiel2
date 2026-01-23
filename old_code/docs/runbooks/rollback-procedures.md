# Rollback Procedures

**Last Updated:** 2025-01-XX  
**Status:** Production Runbook

---

## Overview

This runbook provides procedures for rolling back deployments, database changes, and infrastructure updates in the Castiel platform.

---

## Code Rollback

### Blue-Green Deployment Rollback

#### Azure Container Apps

1. **Swap Slots:**
   ```bash
   az containerapp revision copy \
     --name castiel-api \
     --resource-group <rg> \
     --revision <previous-revision-name>
   ```

2. **Or Use Azure Portal:**
   - Navigate to Container App
   - Go to Revisions
   - Activate previous revision

#### Docker Compose (Local)

1. **Stop Current Version:**
   ```bash
   docker-compose stop api
   ```

2. **Checkout Previous Version:**
   ```bash
   git checkout <previous-commit>
   ```

3. **Rebuild and Start:**
   ```bash
   docker-compose build api
   docker-compose up -d api
   ```

### GitHub Actions Rollback

1. **Manual Workflow:**
   - Go to Actions tab
   - Run "Rollback Production" workflow
   - Select previous deployment

2. **Or Re-run Previous Successful Deployment:**
   - Find previous successful workflow run
   - Click "Re-run jobs"

---

## Database Rollback

### Point-in-Time Restore (Cosmos DB)

1. **Identify Restore Point:**
   ```bash
   # List available restore points
   az cosmosdb sql container show \
     --account-name <account> \
     --database-name castiel \
     --name <container> \
     --resource-group <rg> \
     --query "backupPolicy"
   ```

2. **Restore Container:**
   ```bash
   az cosmosdb sql container restore \
     --account-name <account> \
     --database-name castiel \
     --name <container> \
     --resource-group <rg> \
     --restore-timestamp <timestamp> \
     --restore-source <source-container-id>
   ```

3. **Verify Restore:**
   - Check data integrity
   - Verify schema
   - Test application

### Migration Rollback

1. **Run Rollback Script:**
   ```bash
   cd apps/api
   pnpm run migrate:down
   ```

2. **Or Manual Rollback:**
   - Execute reverse migration SQL
   - Verify schema reverted
   - Test application

---

## Infrastructure Rollback

### Terraform Rollback

1. **Checkout Previous State:**
   ```bash
   cd infrastructure/terraform
   git checkout <previous-commit>
   ```

2. **Review Changes:**
   ```bash
   terraform plan
   ```

3. **Apply Previous State:**
   ```bash
   terraform apply
   ```

4. **Verify:**
   - Check resource status
   - Verify application connectivity
   - Test critical functions

### Configuration Rollback

1. **Revert Configuration:**
   ```bash
   # Update environment variables
   # Or revert config files
   git checkout <previous-commit> -- apps/api/src/config/
   ```

2. **Restart Services:**
   ```bash
   docker-compose restart api
   ```

3. **Verify:**
   - Check configuration loaded
   - Test application
   - Monitor logs

---

## Rollback Decision Matrix

| Issue Type | Rollback Method | Time Required | Risk Level |
|------------|----------------|---------------|------------|
| Code Bug | Blue-Green Swap | < 5 minutes | Low |
| Database Schema | Migration Rollback | 10-30 minutes | Medium |
| Data Corruption | Point-in-Time Restore | 30-60 minutes | High |
| Infrastructure | Terraform Apply | 15-45 minutes | Medium |
| Configuration | Env Var Update | < 5 minutes | Low |

---

## Rollback Checklist

### Pre-Rollback
- [ ] Identify root cause
- [ ] Confirm rollback is necessary
- [ ] Notify team
- [ ] Prepare rollback procedure
- [ ] Verify backup/previous state available

### During Rollback
- [ ] Execute rollback steps
- [ ] Monitor progress
- [ ] Verify each step completes
- [ ] Document any issues

### Post-Rollback
- [ ] Verify service restored
- [ ] Test critical functions
- [ ] Monitor for 1 hour
- [ ] Update status page
- [ ] Schedule post-mortem

---

## Emergency Rollback

### P0 Incident Rollback

1. **Immediate Actions:**
   - Stop deployment if in progress
   - Execute fastest rollback method
   - Notify team immediately

2. **Quick Rollback Options:**
   - **Code:** Swap to previous revision (< 2 minutes)
   - **Config:** Revert env vars (< 1 minute)
   - **Database:** Only if data corruption (< 30 minutes)

3. **Communication:**
   - Update status page immediately
   - Notify customers if needed
   - Document incident

---

## Rollback Testing

### Regular Testing
- Test rollback procedures quarterly
- Verify backups are restorable
- Test in staging environment
- Document any issues found

### Test Scenarios
1. **Code Rollback:**
   - Deploy test version
   - Rollback to previous
   - Verify functionality

2. **Database Rollback:**
   - Create test data
   - Run migration
   - Rollback migration
   - Verify data restored

3. **Infrastructure Rollback:**
   - Make test infrastructure change
   - Rollback change
   - Verify resources restored

---

## Related Documentation

- [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md)
- [Database Migrations](./database-migrations.md)
- [Troubleshooting Runbook](./troubleshooting.md)
- [Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md)
