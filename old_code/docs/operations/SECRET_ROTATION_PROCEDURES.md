# Secret Rotation Procedures

**Last Updated**: January 2025  
**Status**: Production Runbook

---

## Executive Summary

This document provides comprehensive procedures for rotating all secrets used by the Castiel platform. Regular secret rotation is critical for security compliance (SOC 2, ISO 27001) and reduces the impact of potential credential compromise.

---

## Table of Contents

1. [Overview](#overview)
2. [Secret Inventory](#secret-inventory)
3. [Rotation Policies](#rotation-policies)
4. [Rotation Procedures by Secret Type](#rotation-procedures-by-secret-type)
5. [Automation Scripts](#automation-scripts)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Rollback Procedures](#rollback-procedures)
8. [Emergency Rotation](#emergency-rotation)

---

## Overview

### Why Rotate Secrets?

1. **Security Compliance**: SOC 2, ISO 27001, and other standards require regular secret rotation
2. **Breach Mitigation**: Limits exposure window if credentials are compromised
3. **Access Control**: Revokes access for former employees or compromised accounts
4. **Best Practices**: Industry standard for production systems

### Rotation Principles

1. **Zero Downtime**: All rotations must be performed without service interruption
2. **Dual-Write Period**: New and old secrets must work simultaneously during transition
3. **Gradual Rollout**: Rotate one service/component at a time
4. **Automated Where Possible**: Use scripts to reduce human error
5. **Audit Trail**: All rotations must be logged and tracked

---

## Secret Inventory

### System Secrets (Infrastructure)

| Secret Name | Type | Rotation Frequency | Stored In | Auto-Rotate |
|-------------|------|-------------------|-----------|-------------|
| `JWT_ACCESS_SECRET` | JWT Signing Key | 90 days | Key Vault | ❌ Manual |
| `JWT_REFRESH_SECRET` | JWT Signing Key | 90 days | Key Vault | ❌ Manual |
| `COSMOS_DB_PRIMARY_KEY` | Database Key | 90 days | Key Vault | ❌ Manual |
| `COSMOS_DB_SECONDARY_KEY` | Database Key | 90 days | Key Vault | ❌ Manual |
| `REDIS_PRIMARY_CONNECTION_STRING` | Cache Connection | 90 days | Key Vault | ❌ Manual |
| `REDIS_SECONDARY_CONNECTION_STRING` | Cache Connection | 90 days | Key Vault | ❌ Manual |
| `AZURE_AD_B2C_CLIENT_SECRET` | OAuth Client Secret | 90 days | Key Vault | ❌ Manual |
| `SENDGRID_API_KEY` | Email API Key | 90 days | Key Vault | ❌ Manual |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | 90 days | Key Vault | ❌ Manual |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret | 90 days | Key Vault | ❌ Manual |
| `MICROSOFT_CLIENT_SECRET` | OAuth Client Secret | 90 days | Key Vault | ❌ Manual |

### Integration Credentials (Per-Tenant)

| Credential Type | Rotation Frequency | Auto-Rotate | Notes |
|----------------|-------------------|-------------|-------|
| OAuth Access Token | N/A | ✅ Yes | Auto-refreshed before expiry |
| OAuth Refresh Token | 90 days | ❌ Manual | Requires re-authentication |
| API Key | 90 days | ❌ Manual | Provider-specific |
| Basic Auth Password | 90 days | ❌ Manual | Provider-specific |
| Client Certificate | 365 days | ❌ Manual | Long-lived certificates |
| Webhook Secret | 180 days | ✅ Yes | Can be auto-rotated |

---

## Rotation Policies

### Standard Rotation Schedule

| Secret Type | Frequency | Warning Period | Auto-Rotate |
|-------------|-----------|----------------|-------------|
| JWT Secrets | 90 days | 14 days | ❌ |
| Database Keys | 90 days | 14 days | ❌ |
| OAuth Client Secrets | 90 days | 14 days | ❌ |
| API Keys | 90 days | 14 days | ❌ |
| OAuth Refresh Tokens | 90 days | 14 days | ❌ |
| Webhook Secrets | 180 days | 14 days | ✅ |
| Client Certificates | 365 days | 30 days | ❌ |

### Rotation Windows

- **Planned Rotations**: During maintenance windows (typically weekends)
- **Emergency Rotations**: Immediately when compromise is suspected
- **Automated Rotations**: Scheduled via Azure Functions or cron jobs

---

## Rotation Procedures by Secret Type

### 1. JWT Secret Rotation

**Secrets**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

**Procedure**:

1. **Pre-Rotation Checklist**:
   - [ ] Verify current secret age (should be < 90 days)
   - [ ] Check for active sessions (may need to invalidate)
   - [ ] Notify team of upcoming rotation
   - [ ] Schedule maintenance window if needed

2. **Generate New Secrets**:
   ```bash
   # Generate new JWT secrets (32+ bytes, base64 encoded)
   openssl rand -base64 32  # For JWT_ACCESS_SECRET
   openssl rand -base64 32  # For JWT_REFRESH_SECRET
   ```

3. **Update Key Vault**:
   ```bash
   # Use automation script
   ./scripts/rotate-jwt-secrets.sh --environment production
   ```

4. **Dual-Write Period** (24-48 hours):
   - New tokens use new secret
   - Old tokens continue to work with old secret
   - Monitor for authentication failures

5. **Invalidate Old Secret**:
   - After all old tokens expire (typically 7-8 hours for access tokens)
   - Remove old secret version from Key Vault

**Automation**: `scripts/rotate-jwt-secrets.sh`

---

### 2. Database Credential Rotation

**Secrets**: `COSMOS_DB_PRIMARY_KEY`, `COSMOS_DB_SECONDARY_KEY`

**Procedure**:

1. **Pre-Rotation Checklist**:
   - [ ] Verify current key age
   - [ ] Check database connection health
   - [ ] Review active connections
   - [ ] Schedule maintenance window

2. **Generate New Keys**:
   - Use Azure Portal or Azure CLI to regenerate Cosmos DB keys
   - Generate both primary and secondary keys

3. **Update Key Vault**:
   ```bash
   # Use automation script
   ./scripts/rotate-database-credentials.sh --environment production --key-type primary
   ```

4. **Update Application Configuration**:
   - Update Key Vault secrets
   - Clear application cache (if any)
   - Restart application services (rolling restart)

5. **Verify Connection**:
   - Check health endpoints
   - Monitor error rates
   - Verify read/write operations

**Automation**: `scripts/rotate-database-credentials.sh`

**Important**: Cosmos DB supports key rotation without downtime. Both old and new keys work simultaneously.

---

### 3. Redis Credential Rotation

**Secrets**: `REDIS_PRIMARY_CONNECTION_STRING`, `REDIS_SECONDARY_CONNECTION_STRING`

**Procedure**:

1. **Pre-Rotation Checklist**:
   - [ ] Verify current connection string age
   - [ ] Check Redis connection health
   - [ ] Review cache hit rates
   - [ ] Schedule maintenance window

2. **Generate New Connection String**:
   - Use Azure Portal to regenerate Redis access keys
   - Generate both primary and secondary keys

3. **Update Key Vault**:
   ```bash
   # Use automation script
   ./scripts/rotate-redis-credentials.sh --environment production
   ```

4. **Update Application Configuration**:
   - Update Key Vault secrets
   - Clear Redis cache (optional, may cause cache misses)
   - Restart application services (rolling restart)

5. **Verify Connection**:
   - Check health endpoints
   - Monitor cache performance
   - Verify cache operations

**Automation**: `scripts/rotate-redis-credentials.sh`

---

### 4. OAuth Client Secret Rotation

**Secrets**: `AZURE_AD_B2C_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, `MICROSOFT_CLIENT_SECRET`

**Procedure**:

1. **Pre-Rotation Checklist**:
   - [ ] Verify current secret age
   - [ ] Check active OAuth sessions
   - [ ] Review OAuth provider settings
   - [ ] Schedule maintenance window

2. **Generate New Secret** (Provider-Specific):

   **Azure AD B2C**:
   ```bash
   # Use Azure CLI
   az ad app credential reset --id <app-id> --append
   ```

   **Google OAuth**:
   - Navigate to Google Cloud Console
   - Create new OAuth 2.0 client secret
   - Keep old secret active during transition

   **GitHub OAuth**:
   - Navigate to GitHub Settings > Developer settings > OAuth Apps
   - Generate new client secret
   - Keep old secret active during transition

   **Microsoft OAuth**:
   - Navigate to Azure Portal > App Registrations
   - Create new client secret
   - Keep old secret active during transition

3. **Update Key Vault**:
   ```bash
   # Use automation script
   ./scripts/rotate-oauth-secrets.sh --environment production --provider azure-ad-b2c
   ```

4. **Dual-Write Period** (24-48 hours):
   - New OAuth flows use new secret
   - Existing sessions continue with old secret
   - Monitor for authentication failures

5. **Invalidate Old Secret**:
   - After all old sessions expire
   - Remove old secret from provider

**Automation**: `scripts/rotate-oauth-secrets.sh`

---

### 5. SendGrid API Key Rotation

**Secret**: `SENDGRID_API_KEY`

**Procedure**:

1. **Pre-Rotation Checklist**:
   - [ ] Verify current API key age
   - [ ] Check email delivery rates
   - [ ] Review SendGrid API usage
   - [ ] Schedule maintenance window

2. **Generate New API Key**:
   - Navigate to SendGrid Dashboard > Settings > API Keys
   - Create new API key with same permissions
   - Keep old key active during transition

3. **Update Key Vault**:
   ```bash
   # Use automation script
   ./scripts/rotate-sendgrid-key.sh --environment production
   ```

4. **Update Application Configuration**:
   - Update Key Vault secret
   - Clear application cache
   - Restart email service (if separate)

5. **Verify Email Delivery**:
   - Send test email
   - Monitor email delivery rates
   - Check for delivery errors

6. **Invalidate Old Key**:
   - After verification period (24-48 hours)
   - Delete old API key from SendGrid

**Automation**: `scripts/rotate-sendgrid-key.sh`

---

### 6. Integration Credential Rotation

**Credentials**: OAuth tokens, API keys, certificates (per-tenant)

**Procedure**:

1. **Identify Expiring Credentials**:
   ```bash
   # Use automation script to list expiring credentials
   ./scripts/check-expiring-credentials.sh --days 14
   ```

2. **Notify Tenant Admins**:
   - Send notification via email/in-app
   - Provide rotation instructions
   - Set deadline for rotation

3. **Manual Rotation** (Tenant Admin):
   - Navigate to Integration Settings
   - Click "Rotate Credentials"
   - Follow provider-specific flow
   - Test connection

4. **Automatic Rotation** (Where Supported):
   - Webhook secrets can be auto-rotated
   - OAuth refresh tokens are auto-refreshed
   - API keys require manual rotation

**Automation**: `scripts/rotate-integration-credentials.sh`

---

## Automation Scripts

### Available Scripts

All rotation scripts are located in `scripts/secret-rotation/`:

1. **`rotate-jwt-secrets.sh`** - JWT secret rotation
2. **`rotate-database-credentials.sh`** - Cosmos DB key rotation
3. **`rotate-redis-credentials.sh`** - Redis connection string rotation
4. **`rotate-oauth-secrets.sh`** - OAuth client secret rotation
5. **`rotate-sendgrid-key.sh`** - SendGrid API key rotation
6. **`rotate-integration-credentials.sh`** - Integration credential rotation
7. **`check-expiring-credentials.sh`** - Check for expiring credentials
8. **`rotate-all-secrets.sh`** - Rotate all secrets (use with caution)

### Script Usage

All scripts follow a common pattern:

```bash
# Basic usage
./scripts/secret-rotation/rotate-<secret-type>.sh --environment production

# With options
./scripts/secret-rotation/rotate-<secret-type>.sh \
  --environment production \
  --dry-run \
  --notify \
  --force
```

**Common Options**:
- `--environment`: Target environment (development, staging, production)
- `--dry-run`: Preview changes without applying
- `--notify`: Send notifications to team
- `--force`: Skip confirmation prompts
- `--rollback`: Rollback to previous version

---

## Monitoring and Alerts

### Key Metrics

1. **Secret Age**: Track age of all secrets
2. **Rotation Frequency**: Monitor rotation events
3. **Rotation Failures**: Alert on failed rotations
4. **Expiring Secrets**: Alert 14 days before expiry

### Application Insights Queries

**Secrets Approaching Expiry**:
```kql
customEvents
| where name == "secret.expiring-soon"
| where timestamp > ago(7d)
| project timestamp, secretName = tostring(customDimensions.secretName), daysUntilExpiry = toint(customDimensions.daysUntilExpiry)
| order by daysUntilExpiry asc
```

**Rotation Events**:
```kql
customEvents
| where name startswith "secret.rotation"
| where timestamp > ago(30d)
| project timestamp, secretName = tostring(customDimensions.secretName), status = tostring(customDimensions.status), rotatedBy = tostring(customDimensions.rotatedBy)
| order by timestamp desc
```

### Alerts

Configure alerts for:
- Secrets expiring in < 14 days
- Failed rotation attempts
- Unusual rotation activity
- Secrets not rotated in > 90 days

---

## Rollback Procedures

### When to Rollback

- Rotation causes service disruption
- Authentication failures increase
- Database connection issues
- Cache connectivity problems

### Rollback Steps

1. **Identify Issue**:
   - Check error logs
   - Review health endpoints
   - Monitor Application Insights

2. **Revert Key Vault Secret**:
   ```bash
   # Restore previous version
   az keyvault secret restore --vault-name <vault-name> --name <secret-name> --version <old-version>
   ```

3. **Clear Application Cache**:
   ```bash
   # Clear Key Vault service cache
   # Restart application services
   ```

4. **Verify Service Recovery**:
   - Check health endpoints
   - Monitor error rates
   - Verify functionality

5. **Document Issue**:
   - Log rollback reason
   - Update rotation procedures
   - Schedule re-rotation

---

## Emergency Rotation

### When to Perform Emergency Rotation

- Credential compromise suspected
- Security breach detected
- Unauthorized access detected
- Compliance requirement

### Emergency Rotation Procedure

1. **Immediate Actions**:
   - [ ] Notify security team
   - [ ] Assess scope of compromise
   - [ ] Identify affected secrets
   - [ ] Prepare new secrets

2. **Rapid Rotation**:
   ```bash
   # Rotate all affected secrets immediately
   ./scripts/secret-rotation/rotate-all-secrets.sh \
     --environment production \
     --force \
     --emergency
   ```

3. **Invalidate Old Secrets**:
   - Immediately revoke old secrets
   - Do not maintain dual-write period
   - Force re-authentication

4. **Monitor and Verify**:
   - Monitor for authentication failures
   - Check service health
   - Verify no unauthorized access

5. **Post-Incident**:
   - Document incident
   - Review access logs
   - Update security procedures
   - Conduct post-mortem

---

## Rotation Schedule

### Recommended Schedule

| Month | Secrets to Rotate |
|-------|-------------------|
| January | JWT Secrets, OAuth Client Secrets |
| April | Database Keys, Redis Credentials |
| July | JWT Secrets, OAuth Client Secrets |
| October | Database Keys, Redis Credentials, SendGrid Key |

### Automated Reminders

- **14 days before expiry**: Email notification to ops team
- **7 days before expiry**: Slack/Teams notification
- **1 day before expiry**: PagerDuty alert

---

## Related Documentation

- [Key Vault Setup](../setup/azure-key-vault.md) - Key Vault configuration
- [Credentials Management](../features/integrations/CREDENTIALS.md) - Integration credentials
- [Disaster Recovery Runbook](./DISASTER_RECOVERY_RUNBOOK.md) - DR procedures
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md) - Incident handling

---

**Document Version**: 1.0  
**Last Review**: January 2025  
**Next Review**: Quarterly  
**Maintained By**: Platform Engineering Team
