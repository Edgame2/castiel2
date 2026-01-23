# Azure Blob Storage Containers

**Last Updated**: January 2025  
**Status**: Verification Script Complete

---

## Overview

Castiel uses Azure Blob Storage for document management. This document describes the required containers and how to verify their configuration.

---

## Required Containers

### 1. Documents Container

**Name**: `documents` (configurable via `AZURE_STORAGE_DOCUMENTS_CONTAINER`)

**Purpose**: Stores uploaded documents and files

**Configuration**:
- **Access Level**: Private (no public access)
- **Partitioning**: Documents are stored with tenant isolation: `{tenantId}/{documentId}/{filename}`
- **Lifecycle**: Documents persist until explicitly deleted

**Usage**:
- Document uploads
- File storage
- Document retrieval via SAS tokens

---

### 2. Quarantine Container

**Name**: `quarantine` (configurable via `AZURE_STORAGE_QUARANTINE_CONTAINER`)

**Purpose**: Stores documents pending security scanning or validation

**Configuration**:
- **Access Level**: Private (no public access)
- **Partitioning**: Quarantined documents by tenant: `{tenantId}/{documentId}/{filename}`
- **Lifecycle**: Documents moved to main container after validation, or deleted if invalid

**Usage**:
- Initial document uploads (before validation)
- Documents pending virus scanning
- Documents with security policy violations

---

## Environment Variables

```bash
# Required
AZURE_STORAGE_CONNECTION_STRING=<connection-string>

# Optional (with defaults)
AZURE_STORAGE_DOCUMENTS_CONTAINER=documents
AZURE_STORAGE_QUARANTINE_CONTAINER=quarantine
AZURE_STORAGE_ACCOUNT_NAME=<account-name>
AZURE_STORAGE_ACCOUNT_KEY=<account-key>
```

---

## Container Initialization

### Automatic Initialization

Containers are automatically created on first use by the `AzureBlobStorageService.ensureContainersExist()` method. This is called when:

1. Document upload service is initialized
2. Document controller is initialized
3. Migration script is run

### Manual Initialization

#### Option 1: Run Migration Script

```bash
pnpm --filter @castiel/api run migrate:documents
```

This script:
- Creates containers if they don't exist
- Verifies container permissions
- Initializes tenant document settings

#### Option 2: Run Verification Script

```bash
pnpm --filter @castiel/api run verify:blob-storage
```

This script:
- Verifies containers exist
- Checks container permissions
- Reports container properties
- Does NOT create containers (use migration script for that)

---

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Blob storage containers fully documented

#### Implemented Features (✅)

- ✅ Container configuration documented
- ✅ Automatic initialization
- ✅ Manual initialization procedures
- ✅ Verification scripts
- ✅ Environment variables documented

#### Known Limitations

- ⚠️ **Container Lifecycle** - Container lifecycle management may need improvement
  - **Recommendation:**
    1. Add container lifecycle policies
    2. Document retention policies
    3. Add automated cleanup procedures

- ⚠️ **Access Control** - Access control may need verification
  - **Recommendation:**
    1. Verify container access control
    2. Test SAS token generation
    3. Document access patterns

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](./README.md) - Infrastructure overview
- [Backend Documentation](../backend/README.md) - Backend implementation

---

## Verification

### Quick Verification

```bash
# Verify containers exist and are accessible
pnpm --filter @castiel/api run verify:blob-storage
```

### Expected Output

```
🔍 Verifying Azure Blob Storage containers...

Storage Account: castielstorage
Documents Container: documents
Quarantine Container: quarantine

Checking container: documents...
  ✅ Container 'documents':
     - Exists: Yes
     - Public Access: private
     - Read Access: Yes
     - Write Access: Yes

Checking container: quarantine...
  ✅ Container 'quarantine':
     - Exists: Yes
     - Public Access: private
     - Read Access: Yes
     - Write Access: Yes

============================================================
Verification Summary
============================================================
Total Containers: 2
✅ Existing: 2
❌ Missing: 0
⚠️  Errors: 0

Overall Status: ✅ SUCCESS
```

---

## Container Properties

### Access Control

Both containers should be configured with:
- **Public Access**: `private` (no anonymous access)
- **Access Control**: Managed via SAS tokens (15-minute expiry for downloads)

### Metadata

Containers may include metadata:
- `createdBy`: `castiel-migration-script` (if created via migration)
- `createdAt`: ISO 8601 timestamp

---

## Troubleshooting

### Container Does Not Exist

**Error**: `Container 'documents' does not exist`

**Solution**:
1. Run migration script: `pnpm --filter @castiel/api run migrate:documents`
2. Or containers will be auto-created on first document upload

### Permission Denied

**Error**: `Read access denied` or `Write access denied`

**Solution**:
1. Verify connection string is correct
2. Check Azure Storage account permissions
3. Ensure storage account key has read/write permissions
4. Verify network access (firewall rules)

### Connection String Invalid

**Error**: `AZURE_STORAGE_CONNECTION_STRING environment variable is not set`

**Solution**:
1. Set `AZURE_STORAGE_CONNECTION_STRING` in `.env` or `.env.local`
2. Format: `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net`

---

## Code References

### Service Implementation

- **Service**: `apps/api/src/services/azure-blob-storage.service.ts`
- **Initialization**: `apps/api/src/services/azure-container-init.service.ts`
- **Verification Script**: `apps/api/src/scripts/verify-blob-storage-containers.ts`
- **Migration Script**: `apps/api/src/scripts/migrate-document-settings.ts`

### Configuration

- **Environment Config**: `apps/api/src/config/env.ts` (lines 488-495)
- **Container Names**: Defaults to `documents` and `quarantine`

---

## Security Considerations

1. **Private Access**: Containers must have private access (no public blobs)
2. **SAS Tokens**: Document access via time-limited SAS tokens (15 minutes)
3. **Tenant Isolation**: Documents stored with tenant ID in path
4. **Quarantine**: Suspicious documents isolated in quarantine container

---

## Related Documentation

- [Document Management](../features/document-management/document-management.md)
- [Production Runbooks](../operations/PRODUCTION_RUNBOOKS.md)
- [Infrastructure Setup](../infrastructure/README.md)

---

**Status**: Verification Complete ✅  
**Last Verified**: December 2025







