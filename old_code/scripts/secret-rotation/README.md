# Secret Rotation Scripts

This directory contains automation scripts for rotating secrets in the Castiel platform.

## Available Scripts

### 1. `rotate-jwt-secrets.sh`
Rotates JWT access and refresh token secrets.

**Usage**:
```bash
./rotate-jwt-secrets.sh --environment production
```

**Options**:
- `--environment`: Target environment (required)
- `--dry-run`: Preview changes without applying
- `--force`: Skip confirmation prompts
- `--rollback`: Rollback to previous version

### 2. `rotate-database-credentials.sh`
Rotates Cosmos DB primary and secondary keys.

**Usage**:
```bash
./rotate-database-credentials.sh --environment production --key-type primary
```

**Options**:
- `--environment`: Target environment (required)
- `--key-type`: Key type to rotate (primary, secondary, or both)
- `--dry-run`: Preview changes without applying
- `--force`: Skip confirmation prompts
- `--rollback`: Rollback to previous version

### 3. `check-expiring-credentials.sh`
Checks for credentials expiring within specified days.

**Usage**:
```bash
./check-expiring-credentials.sh --days 14 --environment production
```

**Options**:
- `--days`: Number of days to check ahead (default: 14)
- `--environment`: Target environment (optional)
- `--notify`: Send notifications for expiring credentials

## Prerequisites

1. **Azure CLI**: Must be installed and configured
   ```bash
   az --version
   az login
   ```

2. **Permissions**: Must have Key Vault access
   - Key Vault Secrets Officer role
   - Cosmos DB Account Contributor (for database rotation)

3. **Environment Variables**: None required (uses Azure CLI authentication)

## Common Workflow

### 1. Check Expiring Credentials
```bash
./check-expiring-credentials.sh --days 14 --environment production
```

### 2. Rotate Secrets (Dry Run First)
```bash
./rotate-jwt-secrets.sh --environment production --dry-run
```

### 3. Rotate Secrets (Actual)
```bash
./rotate-jwt-secrets.sh --environment production
```

### 4. Monitor and Verify
- Check Application Insights for errors
- Monitor health endpoints
- Verify service functionality

### 5. Rollback if Needed
```bash
./rotate-jwt-secrets.sh --environment production --rollback
```

## Security Best Practices

1. **Always use dry-run first**: Preview changes before applying
2. **Rotate during maintenance windows**: Minimize impact
3. **Monitor after rotation**: Watch for errors and issues
4. **Keep rollback ready**: Know how to rollback if needed
5. **Document rotations**: Log all rotation activities

## Troubleshooting

### Script Fails with "Not logged in to Azure"
```bash
az login
az account set --subscription <subscription-id>
```

### Script Fails with "Permission denied"
Ensure you have the required Azure RBAC roles:
- Key Vault Secrets Officer
- Cosmos DB Account Contributor (for database rotation)

### Secret Not Found
Verify the secret exists in Key Vault:
```bash
az keyvault secret list --vault-name kv-castiel-production
```

## Related Documentation

- [Secret Rotation Procedures](../../docs/operations/SECRET_ROTATION_PROCEDURES.md) - Comprehensive rotation procedures
- [Key Vault Setup](../../docs/setup/azure-key-vault.md) - Key Vault configuration
- [Production Runbooks](../../docs/operations/PRODUCTION_RUNBOOKS.md) - Operational procedures
