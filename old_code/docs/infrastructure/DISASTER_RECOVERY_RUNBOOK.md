# Disaster Recovery Runbook

**Last Updated**: January 2025  
**Status**: Production Runbook

---

## Overview

This runbook provides step-by-step procedures for disaster recovery scenarios in the Castiel Azure deployment.

---

## Recovery Objectives

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour (continuous backup)

---

## Pre-Disaster Preparation

### 1. Backup Verification

Verify backups are working:

```bash
# Cosmos DB continuous backup status
az cosmosdb sql container show \
  --account-name <cosmos-account> \
  --database-name castiel \
  --name shards \
  --resource-group <rg-name>

# Redis backup status
az redis show \
  --name <redis-name> \
  --resource-group <rg-name> \
  --query "redisConfiguration.rdbBackupEnabled"
```

### 2. Document Current State

Before any disaster recovery:

1. Export current Terraform state: `terraform state pull > backup-state.json`
2. Document current resource IDs and configurations
3. Verify managed identity assignments

---

## Scenario 1: Regional Outage (Primary Region)

### Detection

- Monitor Azure Service Health dashboard
- Application Insights availability tests failing
- Traffic Manager health checks failing

### Recovery Steps

1. **Failover Traffic Manager**
   ```bash
   az network traffic-manager profile update \
     --name <tm-profile-name> \
     --resource-group <rg-name> \
     --routing-method Priority \
     --monitor-status Enabled
   ```

2. **Promote Secondary Region (if configured)**
   - Update Cosmos DB failover priority
   - Scale up secondary App Service
   - Update DNS records

3. **Restore from Backup (if needed)**
   ```bash
   # Cosmos DB point-in-time restore
   az cosmosdb sql container restore \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards \
     --restore-timestamp <timestamp>
   ```

---

## Scenario 2: Data Corruption

### Detection

- Application errors indicating data inconsistencies
- Validation failures in application logs
- Customer reports of missing/incorrect data

### Recovery Steps

1. **Identify Affected Containers**
   - Review Application Insights logs
   - Identify timestamp of corruption

2. **Restore from Point-in-Time Backup**
   ```bash
   # Restore specific container
   az cosmosdb sql container restore \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name <container-name> \
     --restore-timestamp <timestamp-before-corruption>
   ```

3. **Validate Data Integrity**
   - Run data validation scripts
   - Verify application functionality
   - Monitor for errors

---

## Scenario 3: Accidental Resource Deletion

### Detection

- Terraform state shows resource missing
- Application errors indicating missing resources
- Azure Portal shows deleted resources

### Recovery Steps

1. **Check Resource Locks**
   ```bash
   az lock list --resource-group <rg-name>
   ```

2. **Restore from Terraform State**
   ```bash
   # Import resource if still exists
   terraform import azurerm_linux_web_app.main_api /subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/...
   
   # Or recreate from Terraform
   terraform apply -target=azurerm_linux_web_app.main_api
   ```

3. **Restore Configuration**
   - Re-apply app settings
   - Restore managed identity assignments
   - Reconfigure connections

---

## Scenario 4: Security Breach

### Detection

- Unusual access patterns in logs
- Key Vault access alerts
- Unauthorized API calls

### Recovery Steps

1. **Immediate Actions**
   - Rotate all secrets in Key Vault
   - Revoke compromised credentials
   - Enable additional logging

2. **Investigate**
   - Review Application Insights logs
   - Check Key Vault access logs
   - Review managed identity usage

3. **Remediate**
   - Update access policies
   - Rotate certificates
   - Review and update NSG rules

---

## Post-Recovery Validation

After any recovery:

1. **Health Checks**
   ```bash
   curl https://api.castiel.com/health
   curl https://api.castiel.com/api/version
   ```

2. **Functional Tests**
   - Test critical user flows
   - Verify data integrity
   - Check monitoring and alerts

3. **Documentation**
   - Document what happened
   - Update runbook with lessons learned
   - Review and improve procedures

---

## Contact Information

- **On-Call Engineer**: See PagerDuty
- **Azure Support**: Premium support ticket
- **Internal Escalation**: ops@castiel.com

---

## Appendix: Useful Commands

```bash
# Export Terraform state
terraform state pull > state-backup.json

# List all resources in resource group
az resource list --resource-group <rg-name> --output table

# Check resource health
az monitor metrics list \
  --resource <resource-id> \
  --metric "Availability"

# View recent activity logs
az monitor activity-log list \
  --resource-group <rg-name> \
  --max-events 50
```

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Disaster recovery runbook fully documented

#### Implemented Features (✅)

- ✅ Recovery objectives defined
- ✅ Pre-disaster preparation
- ✅ Regional outage recovery
- ✅ Data corruption recovery
- ✅ Resource deletion recovery

#### Known Limitations

- ⚠️ **Runbook Testing** - Runbook procedures may not be regularly tested
  - **Recommendation:**
    1. Test runbook procedures in staging
    2. Conduct disaster recovery drills
    3. Update runbook based on actual recovery scenarios

- ⚠️ **Multi-Region Setup** - Multi-region deployment may not be fully configured
  - **Recommendation:**
    1. Verify multi-region setup
    2. Test failover procedures
    3. Document multi-region configuration

### Related Documentation

- [Disaster Recovery Test Procedures](../operations/DISASTER_RECOVERY_TEST_PROCEDURES.md) - DR test procedures and schedule
- [Backup Verification Report](../operations/BACKUP_VERIFICATION_REPORT.md) - Backup configuration and verification
- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](./README.md) - Infrastructure overview
- [Production Runbooks](../operations/PRODUCTION_RUNBOOKS.md) - Production procedures



