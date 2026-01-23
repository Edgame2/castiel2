# Secret Management Module - Full Implementation Plan

**Version:** 1.0.0  
**Created:** 2026-01-20  
**Status:** Planning  
**Target:** Complete implementation of all features from specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current State Analysis](#2-current-state-analysis)
3. [Implementation Phases](#3-implementation-phases)
4. [Phase 1: Database Schema & Core Infrastructure](#phase-1-database-schema--core-infrastructure)
5. [Phase 2: Encryption & Local Backend](#phase-2-encryption--local-backend)
6. [Phase 3: Access Control & Scoping](#phase-3-access-control--scoping)
7. [Phase 4: Secret Service API & CRUD Operations](#phase-4-secret-service-api--crud-operations)
8. [Phase 5: Lifecycle Management](#phase-5-lifecycle-management)
9. [Phase 6: Azure Key Vault Integration](#phase-6-azure-key-vault-integration)
10. [Phase 7: Versioning & Soft Delete](#phase-7-versioning--soft-delete)
11. [Phase 8: Import/Export & Migration](#phase-8-importexport--migration)
12. [Phase 9: Audit Logging & Compliance](#phase-9-audit-logging--compliance)
13. [Phase 10: API Endpoints & Routes](#phase-10-api-endpoints--routes)
14. [Phase 11: User Management Integration](#phase-11-user-management-integration)
15. [Phase 12: Notification Integration](#phase-12-notification-integration)
16. [Phase 13: SSO Integration](#phase-13-sso-integration)
17. [Phase 14: Frontend UI Implementation](#phase-14-frontend-ui-implementation)
18. [Phase 15: Testing & Quality Assurance](#phase-15-testing--quality-assurance)
19. [Phase 16: Logging Module Integration](#phase-16-logging-module-integration)
19. [Dependencies & Requirements](#dependencies--requirements)
20. [Timeline & Estimates](#timeline--estimates)
21. [Risk Assessment & Mitigation](#risk-assessment--mitigation)

---

## 1. Overview

### 1.1 Objectives

Implement a complete, production-ready Secret Management Module that provides:
- **Centralized secret storage** for all Coder IDE modules
- **Multi-backend support** (Local Encrypted + Azure Key Vault)
- **Hierarchical scoping** (Global, Organization, Team, Project, User)
- **Comprehensive access control** with role-based permissions
- **Full lifecycle management** (expiration, rotation, versioning)
- **Complete audit trail** for compliance
- **Full UI** for Super Admin and Org Admin
- **Integration** with User Management, Notification, and Logging modules
- **SSO secret management** support

### 1.2 Success Criteria

- ✅ All secret types supported (API_KEY, OAUTH2_TOKEN, CERTIFICATE, etc.)
- ✅ CRUD operations work for Super Admin and Org Admin
- ✅ All scopes functional (Global, Organization, Team, Project, User)
- ✅ Access grants system operational
- ✅ Encryption at rest (AES-256-GCM)
- ✅ Azure Key Vault integration working
- ✅ Expiration notifications via Notification Module
- ✅ Automatic and manual rotation supported
- ✅ Full audit logging
- ✅ Import/Export capabilities
- ✅ Complete UI for Super Admin and Org Admin
- ✅ Integration with User Management permissions
- ✅ Integration with Notification Module (all events)
- ✅ Integration with Logging Module (operational logging)
- ✅ SSO secret storage functional

---

## 2. Current State Analysis

### 2.1 Existing Implementation

**Current Database Schema:**
```prisma
model secret_secrets {
  id            String   @id @default(cuid())
  name          String
  value         String   // ❌ Not encrypted
  organizationId String?
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([name])
  @@index([organizationId])
  @@map("secret_secrets")
}
```

**Current Service Implementation:**
- ✅ Basic CRUD operations (create, read, update, delete)
- ✅ Organization-scoped secrets
- ❌ No encryption
- ❌ No access control beyond organization
- ❌ No lifecycle management
- ❌ No versioning
- ❌ No external vault support
- ❌ No audit logging
- ❌ Basic SSO endpoints (no full integration)

**Current Routes:**
- ✅ Basic secret CRUD endpoints
- ✅ Basic SSO secret endpoints
- ❌ No access control endpoints
- ❌ No vault configuration endpoints
- ❌ No import/export endpoints
- ❌ No audit endpoints

### 2.2 Gaps to Address

1. **Database Schema**: Need to expand to full specification
2. **Encryption**: Implement AES-256-GCM encryption
3. **Access Control**: Implement scope-based and grant-based access
4. **Lifecycle**: Implement expiration, rotation, versioning
5. **External Vaults**: Implement Azure Key Vault backend
6. **Audit**: Implement comprehensive audit logging
7. **UI**: Build complete frontend interface
8. **Integration**: Connect with User Management and Notification modules
9. **SSO**: Complete SSO secret integration

---

## 3. Implementation Phases

The implementation is divided into **15 phases** to ensure systematic development and testing:

1. **Phase 1**: Database Schema & Core Infrastructure
2. **Phase 2**: Encryption & Local Backend
3. **Phase 3**: Access Control & Scoping
4. **Phase 4**: Secret Service API & CRUD Operations
5. **Phase 5**: Lifecycle Management
6. **Phase 6**: Azure Key Vault Integration
7. **Phase 7**: Versioning & Soft Delete
8. **Phase 8**: Import/Export & Migration
9. **Phase 9**: Audit Logging & Compliance
10. **Phase 10**: API Endpoints & Routes
11. **Phase 11**: User Management Integration
12. **Phase 12**: Notification Integration
13. **Phase 13**: SSO Integration
14. **Phase 14**: Frontend UI Implementation
15. **Phase 15**: Testing & Quality Assurance

---

## Phase 1: Database Schema & Core Infrastructure

**Duration:** 3-4 days  
**Priority:** Critical

### 1.1 Tasks

#### Task 1.1.1: Update Prisma Schema
- [ ] Add all secret-related models to `containers/shared/src/database/schema.prisma`:
  - `Secret` model (full specification)
  - `SecretVersion` model
  - `SecretAccessGrant` model
  - `VaultConfiguration` model
  - `EncryptionKey` model
  - `SecretAuditLog` model
  - `SecretUsage` model
- [ ] Add all enums:
  - `SecretType`
  - `StorageBackend`
  - `SecretScope`
  - `GranteeType`
  - `VaultScope`
  - `VaultHealthStatus`
  - `KeyStatus`
  - `SecretAuditEventType`
  - `AuditCategory`
  - `ActorType`
  - `AuditOutcome`
- [ ] Add foreign key relations to core tables:
  - `organizations`
  - `users`
  - `teams`
  - `projects`
- [ ] Add all indexes for performance
- [ ] Update existing `secret_secrets` table or create migration plan

**Files to Modify:**
- `containers/shared/src/database/schema.prisma`

**Deliverables:**
- Complete Prisma schema with all secret management models
- Schema validation passes
- All relations properly defined

#### Task 1.1.2: Generate Prisma Client
- [ ] Run `npx prisma generate` to generate TypeScript types
- [ ] Verify all models are accessible via `getDatabaseClient()`

**Deliverables:**
- Updated Prisma client with new models

#### Task 1.1.3: Create Type Definitions
- [ ] Create `containers/secret-management/src/types/secret.types.ts`:
  - `SecretValue` interfaces for all secret types
  - `AnySecretValue` union type
  - `SecretMetadata` interface
  - `SecretContext` interface
  - `CreateSecretParams` interface
  - `UpdateSecretParams` interface
  - `ListSecretsParams` interface
  - `GrantAccessParams` interface
- [ ] Create `containers/secret-management/src/types/backend.types.ts`:
  - `SecretStorageBackend` interface
  - `BackendConfig` interfaces
  - `StoreSecretParams` interface
  - `RetrieveSecretParams` interface
- [ ] Create `containers/secret-management/src/types/audit.types.ts`:
  - `AuditLogParams` interface
  - `ComplianceReport` interface

**Files to Create:**
- `containers/secret-management/src/types/secret.types.ts`
- `containers/secret-management/src/types/backend.types.ts`
- `containers/secret-management/src/types/audit.types.ts`

**Deliverables:**
- Complete TypeScript type definitions
- All types exported and documented

#### Task 1.1.4: Create Error Classes
- [ ] Create `containers/secret-management/src/errors/SecretErrors.ts`:
  - `SecretError` base class
  - `SecretNotFoundError`
  - `SecretExpiredError`
  - `AccessDeniedError`
  - `InvalidSecretTypeError`
  - `EncryptionError`
  - `DecryptionError`
  - `VaultConnectionError`
  - `RotationError`
  - All error codes from specification

**Files to Create:**
- `containers/secret-management/src/errors/SecretErrors.ts`

**Deliverables:**
- Comprehensive error handling classes
- Error codes match specification

### 1.2 Dependencies

- Prisma schema access
- Shared database client

### 1.3 Testing

- [ ] Verify schema compiles without errors
- [ ] Verify all relations are correct
- [ ] Verify TypeScript types are generated correctly
- [ ] Verify error classes work as expected

---

## Phase 2: Encryption & Local Backend

**Duration:** 4-5 days  
**Priority:** Critical  
**Dependencies:** Phase 1

### 2.1 Tasks

#### Task 2.1.1: Implement Encryption Service
- [ ] Create `containers/secret-management/src/services/encryption/EncryptionService.ts`:
  - Interface for encryption abstraction
  - `encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedData>`
  - `decrypt(encrypted: EncryptedData, key: CryptoKey): Promise<string>`
- [ ] Create `containers/secret-management/src/services/encryption/AESEncryptor.ts`:
  - AES-256-GCM implementation
  - IV generation (12 bytes)
  - Tag handling (16 bytes)
  - Base64 encoding
- [ ] Create `containers/secret-management/src/services/encryption/KeyManager.ts`:
  - `getCurrentKey(): Promise<EncryptionKey>`
  - `getKey(keyId: string): Promise<EncryptionKey>`
  - `rotateKey(): Promise<EncryptionKey>`
  - Master key derivation from environment variable
  - Key encryption with master key
  - Key storage in database

**Files to Create:**
- `containers/secret-management/src/services/encryption/EncryptionService.ts`
- `containers/secret-management/src/services/encryption/AESEncryptor.ts`
- `containers/secret-management/src/services/encryption/KeyManager.ts`

**Deliverables:**
- Working AES-256-GCM encryption
- Key management system
- Master key handling

#### Task 2.1.2: Implement Local Encrypted Backend
- [ ] Create `containers/secret-management/src/services/backends/LocalBackend.ts`:
  - Implements `SecretStorageBackend` interface
  - `storeSecret()`: Encrypt and store in database
  - `retrieveSecret()`: Retrieve and decrypt from database
  - `updateSecret()`: Update encrypted value
  - `deleteSecret()`: Soft delete from database
  - `listSecrets()`: List metadata only
  - `listVersions()`: List version history
  - `retrieveVersion()`: Retrieve specific version

**Files to Create:**
- `containers/secret-management/src/services/backends/LocalBackend.ts`

**Deliverables:**
- Fully functional local encrypted backend
- All CRUD operations working
- Version support

#### Task 2.1.3: Create Backend Factory
- [ ] Create `containers/secret-management/src/services/backends/BackendFactory.ts`:
  - `createBackend(type: StorageBackend, config: BackendConfig): Promise<SecretStorageBackend>`
  - Support for `LOCAL_ENCRYPTED` backend
  - Support for `AZURE_KEY_VAULT` backend (stub for Phase 6)
  - Backend initialization
  - Health check support

**Files to Create:**
- `containers/secret-management/src/services/backends/BackendFactory.ts`

**Deliverables:**
- Backend factory pattern implementation
- Easy backend switching

#### Task 2.1.4: Environment Configuration
- [ ] Add environment variables:
  - `SECRETS_MASTER_KEY` (required for encryption)
  - `SECRETS_ENCRYPTION_ALGORITHM` (default: AES-256-GCM)
  - `SECRETS_DEFAULT_BACKEND` (default: LOCAL_ENCRYPTED)
- [ ] Create configuration validation
- [ ] Add to `.env.example`

**Files to Modify:**
- `containers/secret-management/.env.example`
- `containers/secret-management/src/config/index.ts` (if exists)

**Deliverables:**
- Environment configuration documented
- Validation in place

### 2.2 Dependencies

- Phase 1 (Database schema)
- Node.js crypto module
- Environment variables

### 2.3 Testing

- [ ] Unit tests for encryption/decryption
- [ ] Unit tests for key management
- [ ] Unit tests for LocalBackend
- [ ] Integration tests for full encryption flow
- [ ] Test key rotation
- [ ] Test error handling (missing keys, invalid data)

---

## Phase 3: Access Control & Scoping

**Duration:** 5-6 days  
**Priority:** Critical  
**Dependencies:** Phase 1, Phase 2

### 3.1 Tasks

#### Task 3.1.1: Implement Scope Resolver
- [ ] Create `containers/secret-management/src/services/access/ScopeResolver.ts`:
  - `getAccessibleSecrets(context: ScopeContext): Promise<Secret[]>`
  - Resolve scope hierarchy (Global → Organization → Team → Project → User)
  - Filter secrets based on user's scope context
  - Handle scope inheritance
- [ ] Create `containers/secret-management/src/services/access/ScopeContext.ts`:
  - `ScopeContext` interface implementation
  - Context building from user/organization/team/project

**Files to Create:**
- `containers/secret-management/src/services/access/ScopeResolver.ts`
- `containers/secret-management/src/services/access/ScopeContext.ts`

**Deliverables:**
- Scope resolution working
- All scopes supported

#### Task 3.1.2: Implement Access Controller
- [ ] Create `containers/secret-management/src/services/access/AccessController.ts`:
  - `checkAccess(user: User, secretId: string, action: SecretAction): Promise<AccessCheckResult>`
  - Check ownership based on scope
  - Check explicit access grants
  - Check role-based permissions (integrate with User Management)
  - `isOwner(user: User, secret: Secret): boolean`
  - `hasRoleBasedAccess(user: User, secret: Secret, action: SecretAction): boolean`
- [ ] Support all actions:
  - `READ`: Can retrieve secret value
  - `UPDATE`: Can update secret
  - `DELETE`: Can delete secret
  - `GRANT`: Can grant access to others
  - `VIEW_METADATA`: Can view secret metadata

**Files to Create:**
- `containers/secret-management/src/services/access/AccessController.ts`

**Deliverables:**
- Complete access control system
- All permission checks working

#### Task 3.1.3: Implement Access Grant System
- [ ] Create `containers/secret-management/src/services/access/AccessGrantService.ts`:
  - `grantAccess(params: GrantAccessParams, context: SecretContext): Promise<SecretAccessGrant>`
  - `revokeAccess(grantId: string, context: SecretContext): Promise<void>`
  - `listAccessGrants(secretId: string, context: SecretContext): Promise<SecretAccessGrant[]>`
  - Support for USER, TEAM, ROLE grantee types
  - Expiration handling
  - Permission validation

**Files to Create:**
- `containers/secret-management/src/services/access/AccessGrantService.ts`

**Deliverables:**
- Access grant system functional
- All grantee types supported

#### Task 3.1.4: Create Permission Definitions
- [ ] Define secret management permissions:
  - `secrets.secret.create` (with scope variants)
  - `secrets.secret.read` (with scope variants)
  - `secrets.secret.update` (with scope variants)
  - `secrets.secret.delete` (with scope variants)
  - `secrets.secret.grant` (with scope variants)
  - `secrets.vault.manage` (with scope variants)
  - `secrets.audit.read` (with scope variants)
- [ ] Add to system permissions seed (if applicable)
- [ ] Document permission matrix

**Files to Modify:**
- `server/src/services/seedService.ts` (if exists)
- Create permission documentation

**Deliverables:**
- All permissions defined
- Permission matrix documented

### 3.2 Dependencies

- Phase 1 (Database schema)
- Phase 2 (Backend for secret retrieval)
- User Management module (for role checking)

### 3.3 Testing

- [ ] Unit tests for scope resolution
- [ ] Unit tests for access control
- [ ] Unit tests for access grants
- [ ] Integration tests for permission checking
- [ ] Test all scope levels
- [ ] Test access grant expiration
- [ ] Test role-based access

---

## Phase 4: Secret Service API & CRUD Operations

**Duration:** 6-7 days  
**Priority:** Critical  
**Dependencies:** Phase 1, Phase 2, Phase 3

### 4.1 Tasks

#### Task 4.1.1: Implement Core Secret Service
- [ ] Create `containers/secret-management/src/services/SecretService.ts`:
  - `getSecret(secretId: string, context: SecretContext): Promise<AnySecretValue>`
  - `getSecrets(secretIds: string[], context: SecretContext): Promise<Map<string, AnySecretValue>>`
  - `getSecretOrNull(secretId: string, context: SecretContext): Promise<AnySecretValue | null>`
  - `listSecrets(params: ListSecretsParams, context: SecretContext): Promise<SecretMetadata[]>`
  - `findSecrets(criteria: SecretSearchCriteria, context: SecretContext): Promise<SecretMetadata[]>`
  - `createSecret(params: CreateSecretParams, context: SecretContext): Promise<Secret>`
  - `updateSecret(secretId: string, params: UpdateSecretParams, context: SecretContext): Promise<Secret>`
  - `deleteSecret(secretId: string, context: SecretContext): Promise<void>`
- [ ] Integrate with AccessController for all operations
- [ ] Integrate with backend abstraction
- [ ] Support all secret types
- [ ] Validate secret values based on type
- [ ] Mask secret values in logs

**Files to Create/Modify:**
- `containers/secret-management/src/services/SecretService.ts` (replace existing)

**Deliverables:**
- Complete SecretService API
- All CRUD operations working
- Access control integrated

#### Task 4.1.2: Implement Secret Type Validation
- [ ] Create `containers/secret-management/src/services/validation/SecretTypeValidator.ts`:
  - Validation for each secret type:
    - `API_KEY`: Validate key format
    - `OAUTH2_TOKEN`: Validate token structure
    - `USERNAME_PASSWORD`: Validate credentials
    - `CERTIFICATE`: Validate PEM format
    - `SSH_KEY`: Validate key format
    - `CONNECTION_STRING`: Validate connection string
    - `JSON_CREDENTIAL`: Validate JSON structure
    - `ENV_VARIABLE_SET`: Validate variable set
    - `GENERIC`: Accept any string
- [ ] Create type-specific configs with validation rules

**Files to Create:**
- `containers/secret-management/src/services/validation/SecretTypeValidator.ts`
- `containers/secret-management/src/services/validation/secretTypeConfigs.ts`

**Deliverables:**
- Type validation working
- All types validated correctly

#### Task 4.1.3: Implement Secret Resolver
- [ ] Create `containers/secret-management/src/services/SecretResolver.ts`:
  - Runtime secret resolution
  - Support for secret references
  - Batch resolution
  - Caching support (stub for later)

**Files to Create:**
- `containers/secret-management/src/services/SecretResolver.ts`

**Deliverables:**
- Secret resolution working
- Reference pattern supported

#### Task 4.1.4: Implement Caching Layer
- [ ] Create `containers/secret-management/src/services/cache/SecretCache.ts`:
  - LRU cache implementation
  - TTL support
  - Refresh-ahead support
  - Cache invalidation
- [ ] Integrate with SecretService

**Files to Create:**
- `containers/secret-management/src/services/cache/SecretCache.ts`
- `containers/secret-management/src/services/cache/CacheInvalidator.ts`

**Deliverables:**
- Caching layer functional
- Performance improvements

### 4.2 Dependencies

- Phase 1, 2, 3
- LRU cache library (e.g., `lru-cache`)

### 4.3 Testing

- [ ] Unit tests for all CRUD operations
- [ ] Unit tests for type validation
- [ ] Unit tests for secret resolution
- [ ] Unit tests for caching
- [ ] Integration tests for full CRUD flow
- [ ] Test access control integration
- [ ] Test error handling

---

## Phase 5: Lifecycle Management

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Phase 1, Phase 2, Phase 4

### 5.1 Tasks

#### Task 5.1.1: Implement Expiration Manager
- [ ] Create `containers/secret-management/src/services/lifecycle/ExpirationManager.ts`:
  - `checkExpirations()`: Find expiring secrets
  - `sendExpirationNotification(secret: Secret, daysUntilExpiration: number)`: Send notifications
  - Integration with Notification Module (Phase 12)
  - Support for notification windows (30, 14, 7, 1 days)
  - Mark expired secrets

**Files to Create:**
- `containers/secret-management/src/services/lifecycle/ExpirationManager.ts`

**Deliverables:**
- Expiration tracking working
- Notification integration ready

#### Task 5.1.2: Implement Rotation Manager
- [ ] Create `containers/secret-management/src/services/lifecycle/RotationManager.ts`:
  - `rotateSecret(secretId: string, newValue: AnySecretValue, context: SecretContext): Promise<void>`
  - `checkRotations()`: Find secrets needing rotation
  - Support for manual rotation
  - Support for automatic rotation (with handlers)
  - Rotation strategy support (MANUAL, NOTIFY_ONLY, AUTOMATIC)
  - Grace period handling
  - Integration with versioning (Phase 7)

**Files to Create:**
- `containers/secret-management/src/services/lifecycle/RotationManager.ts`
- `containers/secret-management/src/services/lifecycle/RotationScheduler.ts`

**Deliverables:**
- Rotation system functional
- Both manual and automatic rotation supported

#### Task 5.1.3: Create Scheduled Jobs
- [ ] Create `containers/secret-management/src/jobs/expirationJob.ts`:
  - Scheduled job to check expirations
  - Run daily at 00:00 UTC
  - Process all organizations
- [ ] Create `containers/secret-management/src/jobs/rotationJob.ts`:
  - Scheduled job to check rotations
  - Run hourly
  - Process secrets with rotation enabled
- [ ] Integrate with job scheduler (if exists) or use cron

**Files to Create:**
- `containers/secret-management/src/jobs/expirationJob.ts`
- `containers/secret-management/src/jobs/rotationJob.ts`

**Deliverables:**
- Scheduled jobs running
- Automatic lifecycle management

### 5.2 Dependencies

- Phase 1, 2, 4
- Phase 12 (Notification integration)
- Job scheduler or cron library

### 5.3 Testing

- [ ] Unit tests for expiration manager
- [ ] Unit tests for rotation manager
- [ ] Integration tests for scheduled jobs
- [ ] Test notification triggers
- [ ] Test rotation strategies

---

## Phase 6: Azure Key Vault Integration

**Duration:** 6-7 days  
**Priority:** High  
**Dependencies:** Phase 1, Phase 2, Phase 4

### 6.1 Tasks

#### Task 6.1.1: Install Azure SDK
- [ ] Add `@azure/keyvault-secrets` dependency
- [ ] Add `@azure/identity` dependency
- [ ] Update `package.json`

**Files to Modify:**
- `containers/secret-management/package.json`

**Deliverables:**
- Azure SDK installed

#### Task 6.1.2: Implement Azure Key Vault Backend
- [ ] Create `containers/secret-management/src/services/backends/AzureKeyVaultBackend.ts`:
  - Implements `SecretStorageBackend` interface
  - `initialize(config: AzureKeyVaultConfig): Promise<void>`
  - Support for authentication methods:
    - Managed Identity
    - Service Principal
    - Certificate-based
  - `storeSecret()`: Store in Azure Key Vault
  - `retrieveSecret()`: Retrieve from Azure Key Vault
  - `updateSecret()`: Update in Azure Key Vault
  - `deleteSecret()`: Delete from Azure Key Vault
  - `listSecrets()`: List secrets from vault
  - `listVersions()`: List secret versions
  - `retrieveVersion()`: Retrieve specific version
  - Name normalization (Azure Key Vault requirements)
  - Error handling for vault connection issues

**Files to Create:**
- `containers/secret-management/src/services/backends/AzureKeyVaultBackend.ts`
- `containers/secret-management/src/types/azure.types.ts`

**Deliverables:**
- Azure Key Vault backend functional
- All operations working

#### Task 6.1.3: Update Backend Factory
- [ ] Update `BackendFactory.ts` to support Azure Key Vault
- [ ] Add Azure Key Vault configuration validation
- [ ] Add health check for Azure Key Vault

**Files to Modify:**
- `containers/secret-management/src/services/backends/BackendFactory.ts`

**Deliverables:**
- Factory supports Azure Key Vault
- Configuration validated

#### Task 6.1.4: Implement Vault Configuration Service
- [ ] Create `containers/secret-management/src/services/VaultService.ts`:
  - `createVault(config: CreateVaultConfig, context: SecretContext): Promise<VaultConfiguration>`
  - `updateVault(vaultId: string, config: UpdateVaultConfig, context: SecretContext): Promise<VaultConfiguration>`
  - `deleteVault(vaultId: string, context: SecretContext): Promise<void>`
  - `listVaults(organizationId?: string): Promise<VaultConfiguration[]>`
  - `getVault(vaultId: string): Promise<VaultConfiguration>`
  - `testVaultConnection(vaultId: string): Promise<HealthCheckResult>`
  - `setDefaultVault(vaultId: string, context: SecretContext): Promise<void>`
  - Encrypt vault configuration (credentials)
  - Health check scheduling

**Files to Create:**
- `containers/secret-management/src/services/VaultService.ts`

**Deliverables:**
- Vault configuration management working
- Health checks functional

### 6.2 Dependencies

- Phase 1, 2, 4
- Azure Key Vault access
- Azure credentials

### 6.3 Testing

- [ ] Unit tests for Azure Key Vault backend (mocked)
- [ ] Integration tests with real Azure Key Vault (test environment)
- [ ] Test all authentication methods
- [ ] Test error handling
- [ ] Test health checks
- [ ] Test vault configuration management

---

## Phase 7: Versioning & Soft Delete

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Phase 1, Phase 2, Phase 4

### 7.1 Tasks

#### Task 7.1.1: Implement Version Manager
- [ ] Create `containers/secret-management/src/services/lifecycle/VersionManager.ts`:
  - `getVersionHistory(secretId: string, context: SecretContext): Promise<SecretVersionInfo[]>`
  - `getVersion(secretId: string, version: number, context: SecretContext): Promise<AnySecretValue>`
  - `rollbackToVersion(secretId: string, version: number, context: SecretContext): Promise<void>`
  - `cleanupOldVersions(secretId: string, keepVersions: number): Promise<void>`
  - Automatic version creation on secret update
  - Version retention policy

**Files to Create:**
- `containers/secret-management/src/services/lifecycle/VersionManager.ts`

**Deliverables:**
- Version management functional
- Rollback working

#### Task 7.1.2: Integrate Versioning with Secret Service
- [ ] Update `SecretService.updateSecret()` to create new version
- [ ] Update `SecretService.rotateSecret()` to create new version
- [ ] Ensure version history is maintained

**Files to Modify:**
- `containers/secret-management/src/services/SecretService.ts`

**Deliverables:**
- Versioning integrated with all updates

#### Task 7.1.3: Implement Soft Delete Manager
- [ ] Create `containers/secret-management/src/services/lifecycle/SoftDeleteManager.ts`:
  - `softDelete(secretId: string, userId: string): Promise<void>`
  - `recover(secretId: string, userId: string): Promise<void>`
  - `purgeExpiredSecrets()`: Permanently delete secrets past recovery deadline
  - Recovery period handling (30 days default)
  - Scheduled job for purging

**Files to Create:**
- `containers/secret-management/src/services/lifecycle/SoftDeleteManager.ts`

**Deliverables:**
- Soft delete functional
- Recovery working
- Purge job running

#### Task 7.1.4: Update Secret Service for Soft Delete
- [ ] Update `SecretService.deleteSecret()` to use soft delete
- [ ] Add `permanentlyDeleteSecret()` method
- [ ] Add `restoreSecret()` method
- [ ] Filter soft-deleted secrets from listings

**Files to Modify:**
- `containers/secret-management/src/services/SecretService.ts`

**Deliverables:**
- Soft delete integrated
- Recovery endpoint ready

### 7.2 Dependencies

- Phase 1, 2, 4

### 7.3 Testing

- [ ] Unit tests for version manager
- [ ] Unit tests for soft delete manager
- [ ] Integration tests for versioning flow
- [ ] Integration tests for soft delete flow
- [ ] Test rollback functionality
- [ ] Test recovery functionality
- [ ] Test purge job

---

## Phase 8: Import/Export & Migration

**Duration:** 5-6 days  
**Priority:** Medium  
**Dependencies:** Phase 1, Phase 2, Phase 4, Phase 6

### 8.1 Tasks

#### Task 8.1.1: Implement Import Service
- [ ] Create `containers/secret-management/src/services/import/ImportService.ts`:
  - `importFromEnvFile(content: string, options: EnvImportOptions, context: SecretContext): Promise<ImportResult>`
  - `importFromJson(data: ImportSecretData[], options: ImportOptions, context: SecretContext): Promise<ImportResult>`
  - `.env file parsing`
  - JSON parsing
  - Duplicate handling (skip or overwrite)
  - Validation
  - Batch processing
  - Error reporting

**Files to Create:**
- `containers/secret-management/src/services/import/ImportService.ts`
- `containers/secret-management/src/services/import/EnvFileParser.ts`

**Deliverables:**
- Import service functional
- Both formats supported

#### Task 8.1.2: Implement Export Service
- [ ] Create `containers/secret-management/src/services/export/ExportService.ts`:
  - `exportToJson(params: ExportParams, context: SecretContext): Promise<ExportResult>`
  - `exportToEnvFormat(params: ExportParams, context: SecretContext): Promise<string>`
  - Metadata-only export
  - Value-included export (admin only)
  - Format conversion
  - Permission checking

**Files to Create:**
- `containers/secret-management/src/services/export/ExportService.ts`

**Deliverables:**
- Export service functional
- Both formats supported

#### Task 8.1.3: Implement Migration Service
- [ ] Create `containers/secret-management/src/services/migration/MigrationService.ts`:
  - `planMigration(sourceVaultId: string, targetVaultId: string): Promise<MigrationPlan>`
  - `executeMigration(sourceVaultId: string, targetVaultId: string, options: MigrationOptions): Promise<MigrationResult>`
  - Support for all backend combinations
  - Batch processing
  - Error handling and recovery
  - Progress tracking
  - Rollback support

**Files to Create:**
- `containers/secret-management/src/services/migration/MigrationService.ts`

**Deliverables:**
- Migration service functional
- Backend-to-backend migration working

### 8.2 Dependencies

- Phase 1, 2, 4, 6

### 8.3 Testing

- [ ] Unit tests for import service
- [ ] Unit tests for export service
- [ ] Unit tests for migration service
- [ ] Integration tests for import/export
- [ ] Integration tests for migration
- [ ] Test error handling
- [ ] Test large file imports

---

## Phase 9: Audit Logging & Compliance

**Duration:** 5-6 days  
**Priority:** High  
**Dependencies:** Phase 1, Phase 2, Phase 4

### 9.1 Tasks

#### Task 9.1.1: Implement Audit Logger
- [ ] Create `containers/secret-management/src/services/audit/AuditLogger.ts`:
  - `log(params: AuditLogParams): Promise<void>`
  - Sanitize details (never log secret values)
  - Support all audit event types
  - Categorize events
  - Store in database
  - Request context capture (IP, user agent, request ID)

**Files to Create:**
- `containers/secret-management/src/services/audit/AuditLogger.ts`

**Deliverables:**
- Audit logging functional
- All events logged

#### Task 9.1.2: Integrate Audit Logging
- [ ] Add audit logging to all SecretService operations
- [ ] Add audit logging to AccessGrantService
- [ ] Add audit logging to VaultService
- [ ] Add audit logging to Import/Export services
- [ ] Ensure no secret values are logged

**Files to Modify:**
- `containers/secret-management/src/services/SecretService.ts`
- `containers/secret-management/src/services/access/AccessGrantService.ts`
- `containers/secret-management/src/services/VaultService.ts`
- Import/Export services

**Deliverables:**
- Comprehensive audit trail
- No sensitive data in logs

#### Task 9.1.3: Implement Compliance Reporter
- [ ] Create `containers/secret-management/src/services/audit/ComplianceReporter.ts`:
  - `generateReport(organizationId: string, period: { start: Date; end: Date }): Promise<ComplianceReport>`
  - Secret statistics
  - Access statistics
  - Compliance findings:
    - Secrets without expiration
    - Secrets not rotated
    - Excessive access grants
    - Expired secrets
    - Other security findings
  - Report generation (JSON format)

**Files to Create:**
- `containers/secret-management/src/services/audit/ComplianceReporter.ts`

**Deliverables:**
- Compliance reporting functional
- All findings identified

#### Task 9.1.4: Create Audit Query Service
- [ ] Create `containers/secret-management/src/services/audit/AuditQueryService.ts`:
  - `listAuditLogs(params: AuditLogsParams, context: SecretContext): Promise<AuditLog[]>`
  - Filtering by:
    - Secret ID
    - Event type
    - Actor ID
    - Date range
    - Outcome
  - Pagination
  - Permission checking

**Files to Create:**
- `containers/secret-management/src/services/audit/AuditQueryService.ts`

**Deliverables:**
- Audit query service functional
- All filters working

### 9.2 Dependencies

- Phase 1, 2, 4

### 9.3 Testing

- [ ] Unit tests for audit logger
- [ ] Unit tests for compliance reporter
- [ ] Unit tests for audit query service
- [ ] Integration tests for audit logging
- [ ] Test sanitization (no secret values)
- [ ] Test compliance report generation
- [ ] Test audit log queries

---

## Phase 10: API Endpoints & Routes

**Duration:** 6-7 days  
**Priority:** Critical  
**Dependencies:** Phase 1-9

### 10.1 Tasks

#### Task 10.1.1: Implement Secret CRUD Endpoints
- [ ] Update `containers/secret-management/src/routes/secrets.ts`:
  - `POST /api/secrets` - Create secret
  - `GET /api/secrets` - List secrets (metadata only)
  - `GET /api/secrets/:id` - Get secret metadata
  - `GET /api/secrets/:id/value` - Get secret value (requires READ permission)
  - `PUT /api/secrets/:id` - Update secret metadata
  - `PUT /api/secrets/:id/value` - Update secret value
  - `DELETE /api/secrets/:id` - Soft delete secret
  - `POST /api/secrets/:id/restore` - Restore soft-deleted secret
  - `DELETE /api/secrets/:id/permanent` - Permanently delete secret
- [ ] Add request validation (Zod schemas)
- [ ] Add authentication middleware
- [ ] Add permission checking
- [ ] Add error handling
- [ ] Mask secret values in responses

**Files to Modify:**
- `containers/secret-management/src/routes/secrets.ts`

**Deliverables:**
- All CRUD endpoints working
- Proper validation and error handling

#### Task 10.1.2: Implement Rotation & Versioning Endpoints
- [ ] Add to `secrets.ts`:
  - `POST /api/secrets/:id/rotate` - Rotate secret
  - `GET /api/secrets/:id/versions` - Get version history
  - `GET /api/secrets/:id/versions/:version` - Get specific version
  - `POST /api/secrets/:id/rollback` - Rollback to version

**Files to Modify:**
- `containers/secret-management/src/routes/secrets.ts`

**Deliverables:**
- Rotation and versioning endpoints working

#### Task 10.1.3: Implement Access Management Endpoints
- [ ] Add to `secrets.ts`:
  - `GET /api/secrets/:id/access` - List access grants
  - `POST /api/secrets/:id/access` - Grant access
  - `DELETE /api/secrets/:id/access/:grantId` - Revoke access

**Files to Modify:**
- `containers/secret-management/src/routes/secrets.ts`

**Deliverables:**
- Access management endpoints working

#### Task 10.1.4: Implement Vault Configuration Endpoints
- [ ] Create `containers/secret-management/src/routes/vaults.ts`:
  - `GET /api/vaults` - List vault configurations
  - `POST /api/vaults` - Create vault configuration
  - `GET /api/vaults/:id` - Get vault configuration
  - `PUT /api/vaults/:id` - Update vault configuration
  - `DELETE /api/vaults/:id` - Delete vault configuration
  - `POST /api/vaults/:id/health` - Check vault health
  - `POST /api/vaults/:id/default` - Set as default vault

**Files to Create:**
- `containers/secret-management/src/routes/vaults.ts`

**Deliverables:**
- Vault configuration endpoints working

#### Task 10.1.5: Implement Import/Export Endpoints
- [ ] Create `containers/secret-management/src/routes/import-export.ts`:
  - `POST /api/secrets/import/env` - Import from .env file
  - `POST /api/secrets/import/json` - Import from JSON
  - `GET /api/secrets/export` - Export secrets
  - `POST /api/secrets/migrate` - Migrate between backends

**Files to Create:**
- `containers/secret-management/src/routes/import-export.ts`

**Deliverables:**
- Import/export endpoints working

#### Task 10.1.6: Implement Audit Endpoints
- [ ] Create `containers/secret-management/src/routes/audit.ts`:
  - `GET /api/secrets/audit` - List audit logs
  - `GET /api/secrets/audit/:id` - Get audit log details
  - `GET /api/secrets/compliance/report` - Generate compliance report

**Files to Create:**
- `containers/secret-management/src/routes/audit.ts`

**Deliverables:**
- Audit endpoints working

#### Task 10.1.7: Update Server Registration
- [ ] Update `containers/secret-management/src/server.ts`:
  - Register all route modules
  - Add proper error handling
  - Add request logging

**Files to Modify:**
- `containers/secret-management/src/server.ts`

**Deliverables:**
- All routes registered
- Server properly configured

### 10.2 Dependencies

- All previous phases

### 10.3 Testing

- [ ] Unit tests for all endpoints
- [ ] Integration tests for API flows
- [ ] Test authentication
- [ ] Test permission checking
- [ ] Test error handling
- [ ] Test request validation
- [ ] API documentation

---

## Phase 11: User Management Integration

**Duration:** 3-4 days  
**Priority:** Critical  
**Dependencies:** Phase 3, Phase 10

### 11.1 Tasks

#### Task 11.1.1: Integrate Permission Checking
- [ ] Create `containers/secret-management/src/services/permissions/PermissionService.ts`:
  - Wrapper around User Management permission service
  - `checkPermission(userId: string, permissionCode: string, organizationId?: string): Promise<boolean>`
  - `getUserPermissions(userId: string, organizationId: string): Promise<string[]>`
  - Integration with `@coder/shared` or direct service call
- [ ] Update AccessController to use permission service
- [ ] Support for Super Admin bypass

**Files to Create:**
- `containers/secret-management/src/services/permissions/PermissionService.ts`

**Deliverables:**
- Permission checking integrated
- User Management module connected

#### Task 11.1.2: Add Secret Management Permissions to System
- [ ] Ensure all secret management permissions are seeded:
  - `secrets.secret.create.global`
  - `secrets.secret.create.organization`
  - `secrets.secret.create.team`
  - `secrets.secret.create.project`
  - `secrets.secret.create.user`
  - `secrets.secret.read.global`
  - `secrets.secret.read.organization`
  - `secrets.secret.read.team`
  - `secrets.secret.read.project`
  - `secrets.secret.read.user`
  - `secrets.secret.update.*`
  - `secrets.secret.delete.*`
  - `secrets.secret.grant.*`
  - `secrets.vault.manage.*`
  - `secrets.audit.read.*`
- [ ] Add permissions to role seed data (Super Admin, Admin roles)

**Files to Modify:**
- `server/src/services/seedService.ts` (or equivalent)

**Deliverables:**
- All permissions seeded
- Roles have correct permissions

#### Task 11.1.3: Implement Scope-Based Permission Resolution
- [ ] Update AccessController to resolve permissions based on scope:
  - Global scope: Check global permissions
  - Organization scope: Check organization permissions
  - Team scope: Check team permissions
  - Project scope: Check project permissions
  - User scope: Check user permissions
- [ ] Handle permission inheritance

**Files to Modify:**
- `containers/secret-management/src/services/access/AccessController.ts`

**Deliverables:**
- Scope-based permissions working
- Permission inheritance correct

### 11.2 Dependencies

- Phase 3 (Access Control)
- Phase 10 (API Endpoints)
- User Management module

### 11.3 Testing

- [ ] Unit tests for permission checking
- [ ] Integration tests with User Management
- [ ] Test all permission scopes
- [ ] Test Super Admin bypass
- [ ] Test role-based access

---

## Phase 12: Notification Integration

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Phase 5, Phase 10

### 12.1 Tasks

#### Task 12.1.1: Create Event Publisher
- [ ] Create `containers/secret-management/src/events/SecretEventPublisher.ts`:
  - Use `EventPublisher` from `@coder/shared`
  - Publish events to `coder.events` exchange
  - Event category: `SECURITY`
  - Event types:
    - `secret.created` - New secret created
    - `secret.updated` - Secret metadata or value updated
    - `secret.deleted` - Secret deleted (soft delete)
    - `secret.permanently_deleted` - Secret permanently deleted
    - `secret.restored` - Soft-deleted secret restored
    - `secret.expiring_soon` - Secret expiring soon (30, 14, 7, 1 days)
    - `secret.expired` - Secret has expired
    - `secret.rotated` - Secret rotated successfully
    - `secret.rotation_due` - Secret rotation due (reminder)
    - `secret.rotation_failed` - Secret rotation failed
    - `secret.access_granted` - Access granted to secret
    - `secret.access_revoked` - Access revoked from secret
    - `secret.certificate_expiring` - SSO certificate expiring soon
    - `secret.certificate_expired` - SSO certificate expired
    - `secret.vault_configured` - Vault configuration added
    - `secret.vault_health_check_failed` - Vault health check failed
    - `secret.import_started` - Secret import started
    - `secret.import_completed` - Secret import completed
    - `secret.import_failed` - Secret import failed
    - `secret.export_completed` - Secret export completed
    - `secret.migration_started` - Secret migration started
    - `secret.migration_completed` - Secret migration completed
    - `secret.migration_failed` - Secret migration failed
- [ ] Event payload structure:
  ```typescript
  {
    type: string;                    // e.g., "secret.created"
    category: 'SECURITY';
    actorId: string;                 // User who performed action
    actorType: 'user' | 'system';
    recipientIds: string[];          // Users to notify (secret owner, org admins, etc.)
    resourceType: 'secret';
    resourceId: string;              // Secret ID
    resourceName: string;            // Secret name
    organizationId: string;
    teamId?: string;
    projectId?: string;
    data: {
      secretId: string;
      secretName: string;
      secretType: string;
      secretScope: string;
      // Additional context (NO SECRET VALUES)
      daysUntilExpiration?: number;
      expirationDate?: string;
      rotationInterval?: number;
      vaultName?: string;
      importCount?: number;
      exportCount?: number;
      migrationSource?: string;
      migrationTarget?: string;
      errorMessage?: string;
    };
    suggestedCriticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    suggestedChannels?: NotificationChannel[];
    timestamp: Date;
  }
  ```

**Files to Create:**
- `containers/secret-management/src/events/SecretEventPublisher.ts`
- `containers/secret-management/src/types/events.types.ts`

**Deliverables:**
- Event publisher functional
- All events defined with proper structure

#### Task 12.1.2: Integrate with Secret Service (CRUD Operations)
- [ ] Update `SecretService.createSecret()`:
  - Publish `secret.created` event
  - Recipients: Secret creator, organization admins (if org scope)
  - Criticality: LOW
  - Include secret metadata (name, type, scope)
- [ ] Update `SecretService.updateSecret()`:
  - Publish `secret.updated` event
  - Recipients: Secret owner, organization admins
  - Criticality: MEDIUM (if value changed), LOW (if metadata only)
  - Indicate if value or metadata was updated
- [ ] Update `SecretService.deleteSecret()`:
  - Publish `secret.deleted` event (soft delete)
  - Recipients: Secret owner, organization admins
  - Criticality: MEDIUM
- [ ] Update `SoftDeleteManager.permanentlyDeleteSecret()`:
  - Publish `secret.permanently_deleted` event
  - Recipients: Secret owner (if recoverable), organization admins
  - Criticality: HIGH
- [ ] Update `SoftDeleteManager.recover()`:
  - Publish `secret.restored` event
  - Recipients: Secret owner, organization admins
  - Criticality: LOW

**Files to Modify:**
- `containers/secret-management/src/services/SecretService.ts`
- `containers/secret-management/src/services/lifecycle/SoftDeleteManager.ts`

**Deliverables:**
- All CRUD operations publish events
- Proper recipients and criticality levels

#### Task 12.1.3: Integrate with Expiration Manager
- [ ] Update `ExpirationManager.checkExpirations()`:
  - Publish `secret.expiring_soon` events for each notification window (30, 14, 7, 1 days)
  - Recipients: Secret owner, organization admins
  - Criticality: MEDIUM (30, 14 days), HIGH (7, 1 day)
  - Include days until expiration
  - Publish `secret.expired` event when secret expires
  - Recipients: Secret owner, organization admins
  - Criticality: HIGH
  - Include expiration date

**Files to Modify:**
- `containers/secret-management/src/services/lifecycle/ExpirationManager.ts`

**Deliverables:**
- Expiration events published at correct intervals
- Notification Module receives expiration warnings

#### Task 12.1.4: Integrate with Rotation Manager
- [ ] Update `RotationManager.rotateSecret()`:
  - Publish `secret.rotated` event on successful rotation
  - Recipients: Secret owner, organization admins
  - Criticality: LOW
  - Include rotation interval
- [ ] Update `RotationManager.checkRotations()`:
  - Publish `secret.rotation_due` event when rotation is due
  - Recipients: Secret owner, organization admins
  - Criticality: MEDIUM
  - Include days since last rotation
- [ ] Update rotation error handling:
  - Publish `secret.rotation_failed` event on rotation failure
  - Recipients: Secret owner, organization admins
  - Criticality: HIGH
  - Include error message (sanitized)

**Files to Modify:**
- `containers/secret-management/src/services/lifecycle/RotationManager.ts`

**Deliverables:**
- Rotation events published
- Failure notifications included

#### Task 12.1.5: Integrate with Access Grant Service
- [ ] Update `AccessGrantService.grantAccess()`:
  - Publish `secret.access_granted` event
  - Recipients: Grant recipient, secret owner, organization admins
  - Criticality: MEDIUM
  - Include grantee information (user/team/role)
  - Include permissions granted
- [ ] Update `AccessGrantService.revokeAccess()`:
  - Publish `secret.access_revoked` event
  - Recipients: Grant recipient, secret owner, organization admins
  - Criticality: LOW
  - Include grantee information

**Files to Modify:**
- `containers/secret-management/src/services/access/AccessGrantService.ts`

**Deliverables:**
- Access grant events published
- All parties notified

#### Task 12.1.6: Integrate with SSO Secret Operations
- [ ] Update SSO secret endpoints:
  - Publish `secret.certificate_expiring` event when SSO certificate is expiring
  - Recipients: Organization admins
  - Criticality: HIGH (if < 30 days), MEDIUM (if 30-60 days)
  - Include days until expiration
  - Publish `secret.certificate_expired` event when SSO certificate expires
  - Recipients: Organization admins, organization members
  - Criticality: CRITICAL
  - Include expiration date

**Files to Modify:**
- `containers/secret-management/src/routes/secrets.ts` (SSO endpoints)

**Deliverables:**
- SSO certificate expiration events published
- Critical notifications for expired certificates

#### Task 12.1.7: Integrate with Vault Service
- [ ] Update `VaultService.createVault()`:
  - Publish `secret.vault_configured` event
  - Recipients: Organization admins
  - Criticality: LOW
  - Include vault name and backend type
- [ ] Update vault health check:
  - Publish `secret.vault_health_check_failed` event when health check fails
  - Recipients: Organization admins
  - Criticality: HIGH
  - Include vault name and error details

**Files to Modify:**
- `containers/secret-management/src/services/VaultService.ts`

**Deliverables:**
- Vault configuration events published
- Health check failures notified

#### Task 12.1.8: Integrate with Import/Export Services
- [ ] Update `ImportService.importFromEnvFile()` and `importFromJson()`:
  - Publish `secret.import_started` event at start
  - Recipients: Importer, organization admins
  - Criticality: LOW
  - Include import source and count
  - Publish `secret.import_completed` event on success
  - Recipients: Importer, organization admins
  - Criticality: LOW
  - Include imported count, skipped count
  - Publish `secret.import_failed` event on failure
  - Recipients: Importer, organization admins
  - Criticality: MEDIUM
  - Include error details
- [ ] Update `ExportService.exportToJson()` and `exportToEnvFormat()`:
  - Publish `secret.export_completed` event
  - Recipients: Exporter, organization admins
  - Criticality: MEDIUM (exporting secrets is sensitive)
  - Include export count and format

**Files to Modify:**
- `containers/secret-management/src/services/import/ImportService.ts`
- `containers/secret-management/src/services/export/ExportService.ts`

**Deliverables:**
- Import/export events published
- Security-sensitive operations notified

#### Task 12.1.9: Integrate with Migration Service
- [ ] Update `MigrationService.executeMigration()`:
  - Publish `secret.migration_started` event at start
  - Recipients: Initiator, organization admins
  - Criticality: MEDIUM
  - Include source and target vaults, secret count
  - Publish `secret.migration_completed` event on success
  - Recipients: Initiator, organization admins
  - Criticality: LOW
  - Include migrated count, duration
  - Publish `secret.migration_failed` event on failure
  - Recipients: Initiator, organization admins
  - Criticality: HIGH
  - Include error details, partial migration status

**Files to Modify:**
- `containers/secret-management/src/services/migration/MigrationService.ts`

**Deliverables:**
- Migration events published
- Critical operations tracked

### 12.2 Dependencies

- Phase 5 (Lifecycle Management)
- Phase 10 (API Endpoints)
- Phase 8 (Import/Export)
- Phase 9 (Audit)
- Notification Manager module
- RabbitMQ

### 12.3 Testing

- [ ] Unit tests for event publishing
- [ ] Integration tests with Notification Module
- [ ] Test all event types
- [ ] Test event payloads (verify no secret values)
- [ ] Test event delivery to RabbitMQ
- [ ] Test recipient resolution
- [ ] Test criticality levels
- [ ] Verify Notification Module receives and processes events correctly

---

## Phase 13: SSO Integration

**Duration:** 4-5 days  
**Priority:** High  
**Dependencies:** Phase 1, Phase 2, Phase 4, Phase 10

### 13.1 Tasks

#### Task 13.1.1: Enhance SSO Secret Endpoints
- [ ] Update existing SSO endpoints in `secrets.ts`:
  - `POST /api/secrets/sso` - Store SSO secret (already exists, enhance)
  - `GET /api/secrets/sso/:secretId` - Get SSO secret (already exists, enhance)
  - `PUT /api/secrets/sso/:secretId` - Update SSO secret (already exists, enhance)
  - `DELETE /api/secrets/sso/:secretId` - Delete SSO secret (already exists, enhance)
  - `POST /api/secrets/sso/:secretId/rotate` - Rotate SSO certificate (already exists, enhance)
  - `GET /api/secrets/sso/:secretId/expiration` - Check certificate expiration (already exists, enhance)
- [ ] Integrate with full SecretService
- [ ] Add proper encryption
- [ ] Add access control
- [ ] Add audit logging
- [ ] Improve certificate parsing

**Files to Modify:**
- `containers/secret-management/src/routes/secrets.ts`

**Deliverables:**
- SSO endpoints fully functional
- All features integrated

#### Task 13.1.2: Implement SSO Secret Type Support
- [ ] Add SSO-specific secret type handling
- [ ] Support for Azure AD credentials
- [ ] Support for Okta credentials
- [ ] Certificate validation
- [ ] Certificate expiration parsing (use proper library)

**Files to Create/Modify:**
- `containers/secret-management/src/services/validation/SSOValidator.ts`

**Deliverables:**
- SSO secret types fully supported
- Certificate handling improved

#### Task 13.1.3: Integrate with Organization Service
- [ ] Ensure Organization Service can:
  - Store SSO secret references
  - Retrieve SSO secrets (service-to-service)
  - Update SSO secrets
  - Handle SSO secret deletion
- [ ] Document service-to-service authentication

**Files to Review:**
- Organization Service integration points

**Deliverables:**
- SSO integration complete
- Service-to-service auth working

### 13.2 Dependencies

- Phase 1, 2, 4, 10
- Organization Service
- Certificate parsing library (e.g., `node-forge` or `@peculiar/x509`)

### 13.3 Testing

- [ ] Unit tests for SSO secret handling
- [ ] Integration tests with Organization Service
- [ ] Test certificate parsing
- [ ] Test expiration checking
- [ ] Test rotation
- [ ] Test service-to-service auth

---

## Phase 14: Frontend UI Implementation

**Duration:** 10-12 days  
**Priority:** Critical  
**Dependencies:** Phase 10

### 14.1 Tasks

#### Task 14.1.1: Create Secret Management Context
- [ ] Create `src/renderer/contexts/SecretContext.tsx`:
  - Secret state management
  - API client integration
  - Caching
  - Error handling

**Files to Create:**
- `src/renderer/contexts/SecretContext.tsx`

**Deliverables:**
- Secret context functional

#### Task 14.1.2: Create API Client
- [ ] Create `src/renderer/services/secretApi.ts`:
  - All API endpoint calls
  - Request/response types
  - Error handling
  - Authentication headers

**Files to Create:**
- `src/renderer/services/secretApi.ts`

**Deliverables:**
- API client functional

#### Task 14.1.3: Implement Secret Manager View (Super Admin & Org Admin)
- [ ] Create `src/renderer/components/secrets/manager/SecretManager.tsx`:
  - Main secret management view
  - Secret listing
  - Filters (scope, type, search)
  - Pagination
  - Actions (create, edit, delete, rotate)
- [ ] Create `src/renderer/components/secrets/manager/SecretList.tsx`:
  - Secret list component
  - Card-based layout
  - Secret metadata display
- [ ] Create `src/renderer/components/secrets/manager/SecretCard.tsx`:
  - Individual secret card
  - Secret type badge
  - Scope badge
  - Expiration status
  - Action buttons
- [ ] Create `src/renderer/components/secrets/manager/SecretFilters.tsx`:
  - Filter controls
  - Scope filter
  - Type filter
  - Tag filter
- [ ] Create `src/renderer/components/secrets/manager/SecretSearch.tsx`:
  - Search input
  - Search functionality

**Files to Create:**
- `src/renderer/components/secrets/manager/SecretManager.tsx`
- `src/renderer/components/secrets/manager/SecretList.tsx`
- `src/renderer/components/secrets/manager/SecretCard.tsx`
- `src/renderer/components/secrets/manager/SecretFilters.tsx`
- `src/renderer/components/secrets/manager/SecretSearch.tsx`

**Deliverables:**
- Secret manager view complete
- All features working

#### Task 14.1.4: Implement Secret Forms
- [ ] Create `src/renderer/components/secrets/forms/CreateSecretDialog.tsx`:
  - Create secret modal
  - All fields from specification
  - Type selection
  - Scope selection
  - Value input with masking
  - Lifecycle options
  - Tag input
- [ ] Create `src/renderer/components/secrets/forms/EditSecretDialog.tsx`:
  - Edit secret modal
  - Similar to create but for updates
- [ ] Create `src/renderer/components/secrets/forms/SecretValueInput.tsx`:
  - Value input component
  - Masking toggle
  - Type-specific inputs
- [ ] Create `src/renderer/components/secrets/forms/SecretTypeSelector.tsx`:
  - Type selection dropdown
  - Type descriptions
- [ ] Create `src/renderer/components/secrets/forms/ScopeSelector.tsx`:
  - Scope selection
  - Scope hierarchy display

**Files to Create:**
- `src/renderer/components/secrets/forms/CreateSecretDialog.tsx`
- `src/renderer/components/secrets/forms/EditSecretDialog.tsx`
- `src/renderer/components/secrets/forms/SecretValueInput.tsx`
- `src/renderer/components/secrets/forms/SecretTypeSelector.tsx`
- `src/renderer/components/secrets/forms/ScopeSelector.tsx`

**Deliverables:**
- All forms functional
- Validation working

#### Task 14.1.5: Implement Secret Detail View
- [ ] Create `src/renderer/components/secrets/detail/SecretDetail.tsx`:
  - Secret detail view
  - All metadata display
  - Value display (with reveal)
  - Actions
- [ ] Create `src/renderer/components/secrets/detail/SecretMetadata.tsx`:
  - Metadata display component
- [ ] Create `src/renderer/components/secrets/detail/SecretVersionHistory.tsx`:
  - Version history list
  - Version details
  - Rollback functionality
- [ ] Create `src/renderer/components/secrets/detail/SecretAccessGrants.tsx`:
  - Access grants list
  - Grant management
  - Add/remove grants

**Files to Create:**
- `src/renderer/components/secrets/detail/SecretDetail.tsx`
- `src/renderer/components/secrets/detail/SecretMetadata.tsx`
- `src/renderer/components/secrets/detail/SecretVersionHistory.tsx`
- `src/renderer/components/secrets/detail/SecretAccessGrants.tsx`

**Deliverables:**
- Detail view complete
- All features working

#### Task 14.1.6: Implement Vault Configuration View
- [ ] Create `src/renderer/components/secrets/vault/VaultConfig.tsx`:
  - Vault configuration view
  - Vault list
  - Add/edit vault
- [ ] Create `src/renderer/components/secrets/vault/VaultForm.tsx`:
  - Vault configuration form
  - Backend selection
  - Configuration fields
  - Test connection
- [ ] Create `src/renderer/components/secrets/vault/VaultCard.tsx`:
  - Vault card component
  - Health status
  - Secret count
- [ ] Create `src/renderer/components/secrets/vault/VaultHealthStatus.tsx`:
  - Health status display
  - Last check time

**Files to Create:**
- `src/renderer/components/secrets/vault/VaultConfig.tsx`
- `src/renderer/components/secrets/vault/VaultForm.tsx`
- `src/renderer/components/secrets/vault/VaultCard.tsx`
- `src/renderer/components/secrets/vault/VaultHealthStatus.tsx`

**Deliverables:**
- Vault configuration UI complete

#### Task 14.1.7: Implement Import/Export UI
- [ ] Create `src/renderer/components/secrets/import-export/ImportDialog.tsx`:
  - Import modal
  - File upload
  - Format selection
  - Options
  - Progress display
- [ ] Create `src/renderer/components/secrets/import-export/ExportDialog.tsx`:
  - Export modal
  - Format selection
  - Scope selection
  - Options
- [ ] Create `src/renderer/components/secrets/import-export/MigrationWizard.tsx`:
  - Migration wizard
  - Source/target selection
  - Options
  - Progress tracking

**Files to Create:**
- `src/renderer/components/secrets/import-export/ImportDialog.tsx`
- `src/renderer/components/secrets/import-export/ExportDialog.tsx`
- `src/renderer/components/secrets/import-export/MigrationWizard.tsx`

**Deliverables:**
- Import/export UI complete

#### Task 14.1.8: Implement Audit Viewer
- [ ] Create `src/renderer/components/secrets/audit/AuditLogViewer.tsx`:
  - Audit log list
  - Filters
  - Pagination
- [ ] Create `src/renderer/components/secrets/audit/AuditFilters.tsx`:
  - Filter controls
- [ ] Create `src/renderer/components/secrets/audit/AuditDetail.tsx`:
  - Audit log detail view
- [ ] Create `src/renderer/components/secrets/audit/ComplianceReport.tsx`:
  - Compliance report view
  - Findings display
  - Export functionality

**Files to Create:**
- `src/renderer/components/secrets/audit/AuditLogViewer.tsx`
- `src/renderer/components/secrets/audit/AuditFilters.tsx`
- `src/renderer/components/secrets/audit/AuditDetail.tsx`
- `src/renderer/components/secrets/audit/ComplianceReport.tsx`

**Deliverables:**
- Audit viewer complete

#### Task 14.1.9: Create Common Components
- [ ] Create `src/renderer/components/secrets/common/SecretTypeBadge.tsx`:
  - Type badge component
- [ ] Create `src/renderer/components/secrets/common/ScopeBadge.tsx`:
  - Scope badge component
- [ ] Create `src/renderer/components/secrets/common/ExpirationBadge.tsx`:
  - Expiration status badge
- [ ] Create `src/renderer/components/secrets/common/MaskedValue.tsx`:
  - Masked value display
  - Reveal toggle

**Files to Create:**
- `src/renderer/components/secrets/common/SecretTypeBadge.tsx`
- `src/renderer/components/secrets/common/ScopeBadge.tsx`
- `src/renderer/components/secrets/common/ExpirationBadge.tsx`
- `src/renderer/components/secrets/common/MaskedValue.tsx`

**Deliverables:**
- Common components complete

#### Task 14.1.10: Add Routing
- [ ] Add secret management routes to main router
- [ ] Add navigation items for Super Admin and Org Admin
- [ ] Add permission-based route protection

**Files to Modify:**
- Main router file
- Navigation component

**Deliverables:**
- Routing configured
- Navigation working

### 14.2 Dependencies

- Phase 10 (API Endpoints)
- React/UI framework
- UI component library

### 14.3 Testing

- [ ] Component unit tests
- [ ] Integration tests for UI flows
- [ ] E2E tests for critical paths
- [ ] Test permission-based access
- [ ] Test all user interactions
- [ ] Test error handling in UI

---

## Phase 16: Logging Module Integration

**Duration:** 3-4 days  
**Priority:** High  
**Dependencies:** Phase 2, Phase 4, Phase 10

### 16.1 Tasks

#### Task 16.1.1: Create Logging Client
- [ ] Create `containers/secret-management/src/services/logging/LoggingClient.ts`:
  - HTTP client for Logging Service
  - Service name: `secret-management`
  - Base URL from environment: `LOGging_SERVICE_URL` (default: `http://localhost:3014`)
  - Non-blocking, fire-and-forget pattern
  - Error handling (don't break application on logging failures)
  - Support for batch logging
  - Log levels: `debug`, `info`, `warn`, `error`
  - Metadata structure:
    ```typescript
    {
      userId?: string;
      organizationId?: string;
      secretId?: string;
      secretName?: string;
      secretType?: string;
      secretScope?: string;
      action?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      error?: {
        message: string;
        code?: string;
      };
      [key: string]: any;
    }
    ```
  - **CRITICAL**: Never log secret values in metadata

**Files to Create:**
- `containers/secret-management/src/services/logging/LoggingClient.ts`
- `containers/secret-management/src/types/logging.types.ts`

**Deliverables:**
- Logging client functional
- Proper error handling

#### Task 16.1.2: Create Logging Service Wrapper
- [ ] Create `containers/secret-management/src/services/logging/SecretLoggingService.ts`:
  - Wrapper around LoggingClient
  - Structured logging methods:
    - `logSecretOperation(level, action, secretId, context, metadata?)`
    - `logSecretError(error, action, secretId, context, metadata?)`
    - `logVaultOperation(level, action, vaultId, context, metadata?)`
    - `logAccessOperation(level, action, secretId, grantId, context, metadata?)`
    - `logLifecycleEvent(level, event, secretId, context, metadata?)`
    - `logImportExport(level, action, context, metadata?)`
    - `logMigration(level, action, sourceVault, targetVault, context, metadata?)`
  - Automatic metadata enrichment:
    - Add service name
    - Add timestamp
    - Add request context (if available)
    - Sanitize sensitive data
  - Log level determination:
    - `error`: Errors, failures, security issues
    - `warn`: Warnings, access denials, health check failures
    - `info`: Normal operations, CRUD operations, successful operations
    - `debug`: Detailed debugging information

**Files to Create:**
- `containers/secret-management/src/services/logging/SecretLoggingService.ts`

**Deliverables:**
- Logging service wrapper functional
- Structured logging methods available

#### Task 16.1.3: Integrate Logging with Secret Service
- [ ] Add logging to `SecretService.createSecret()`:
  - Log `info`: "Secret created"
  - Include: secretId, secretName, secretType, secretScope, organizationId
- [ ] Add logging to `SecretService.updateSecret()`:
  - Log `info`: "Secret updated"
  - Include: secretId, secretName, what was updated (metadata/value)
- [ ] Add logging to `SecretService.deleteSecret()`:
  - Log `info`: "Secret deleted"
  - Include: secretId, secretName, deletion type (soft/permanent)
- [ ] Add logging to `SecretService.getSecret()`:
  - Log `debug`: "Secret retrieved"
  - Include: secretId, secretName (only in debug mode)
- [ ] Add logging to `SecretService.listSecrets()`:
  - Log `debug`: "Secrets listed"
  - Include: scope, filters applied, result count
- [ ] Add error logging:
  - Log `error`: All exceptions with error details
  - Include: error message, error code, secretId (if applicable), context

**Files to Modify:**
- `containers/secret-management/src/services/SecretService.ts`

**Deliverables:**
- All SecretService operations logged
- Error logging comprehensive

#### Task 16.1.4: Integrate Logging with Access Control
- [ ] Add logging to `AccessController.checkAccess()`:
  - Log `warn`: "Access denied"
  - Include: userId, secretId, action, reason
  - Log `debug`: "Access granted"
  - Include: userId, secretId, action, access method (owner/grant/role)
- [ ] Add logging to `AccessGrantService.grantAccess()`:
  - Log `info`: "Access granted"
  - Include: secretId, granteeId, granteeType, permissions
- [ ] Add logging to `AccessGrantService.revokeAccess()`:
  - Log `info`: "Access revoked"
  - Include: secretId, grantId, granteeId

**Files to Modify:**
- `containers/secret-management/src/services/access/AccessController.ts`
- `containers/secret-management/src/services/access/AccessGrantService.ts`

**Deliverables:**
- Access control operations logged
- Security events tracked

#### Task 16.1.5: Integrate Logging with Lifecycle Management
- [ ] Add logging to `ExpirationManager.checkExpirations()`:
  - Log `info`: "Expiration check completed"
  - Include: secretsChecked, expiringCount, expiredCount
  - Log `warn`: "Secret expiring soon"
  - Include: secretId, secretName, daysUntilExpiration
  - Log `error`: "Secret expired"
  - Include: secretId, secretName, expirationDate
- [ ] Add logging to `RotationManager.rotateSecret()`:
  - Log `info`: "Secret rotated"
  - Include: secretId, secretName, newVersion
  - Log `error`: "Rotation failed"
  - Include: secretId, secretName, error details
- [ ] Add logging to `VersionManager`:
  - Log `info`: "Version created"
  - Include: secretId, version, changeReason
  - Log `info`: "Rollback performed"
  - Include: secretId, fromVersion, toVersion
- [ ] Add logging to `SoftDeleteManager`:
  - Log `info`: "Secret soft deleted"
  - Include: secretId, secretName, recoveryDeadline
  - Log `info`: "Secret restored"
  - Include: secretId, secretName
  - Log `info`: "Secret permanently deleted"
  - Include: secretId, secretName

**Files to Modify:**
- `containers/secret-management/src/services/lifecycle/ExpirationManager.ts`
- `containers/secret-management/src/services/lifecycle/RotationManager.ts`
- `containers/secret-management/src/services/lifecycle/VersionManager.ts`
- `containers/secret-management/src/services/lifecycle/SoftDeleteManager.ts`

**Deliverables:**
- Lifecycle operations logged
- Important events tracked

#### Task 16.1.6: Integrate Logging with Vault Operations
- [ ] Add logging to `VaultService`:
  - Log `info`: "Vault configured"
  - Include: vaultId, vaultName, backendType, organizationId
  - Log `info`: "Vault updated"
  - Include: vaultId, vaultName, changes
  - Log `warn`: "Vault health check failed"
  - Include: vaultId, vaultName, error details
  - Log `error`: "Vault connection failed"
  - Include: vaultId, vaultName, error details
- [ ] Add logging to backend operations:
  - Log `debug`: "Secret stored in vault"
  - Include: secretId, vaultId, backendType
  - Log `debug`: "Secret retrieved from vault"
  - Include: secretId, vaultId, backendType
  - Log `error`: "Vault operation failed"
  - Include: secretId, vaultId, operation, error details

**Files to Modify:**
- `containers/secret-management/src/services/VaultService.ts`
- `containers/secret-management/src/services/backends/LocalBackend.ts`
- `containers/secret-management/src/services/backends/AzureKeyVaultBackend.ts`

**Deliverables:**
- Vault operations logged
- Health issues tracked

#### Task 16.1.7: Integrate Logging with Import/Export
- [ ] Add logging to `ImportService`:
  - Log `info`: "Import started"
  - Include: format, source, targetScope, itemCount
  - Log `info`: "Import completed"
  - Include: importedCount, skippedCount, errorCount
  - Log `error`: "Import failed"
  - Include: error details, partial results
- [ ] Add logging to `ExportService`:
  - Log `info`: "Export completed"
  - Include: format, scope, secretCount, includeValues
  - Log `warn`: "Export with values" (security-sensitive)
  - Include: exporter, scope, secretCount
- [ ] Add logging to `MigrationService`:
  - Log `info`: "Migration started"
  - Include: sourceVault, targetVault, secretCount
  - Log `info`: "Migration completed"
  - Include: migratedCount, failedCount, duration
  - Log `error`: "Migration failed"
  - Include: error details, partial migration status

**Files to Modify:**
- `containers/secret-management/src/services/import/ImportService.ts`
- `containers/secret-management/src/services/export/ExportService.ts`
- `containers/secret-management/src/services/migration/MigrationService.ts`

**Deliverables:**
- Import/export operations logged
- Security-sensitive operations tracked

#### Task 16.1.8: Integrate Logging with API Endpoints
- [ ] Add request logging middleware:
  - Log `info`: "API request received"
  - Include: method, path, userId, organizationId, ipAddress
  - Log `info`: "API request completed"
  - Include: method, path, statusCode, duration
  - Log `error`: "API request failed"
  - Include: method, path, statusCode, error details
- [ ] Add logging to all route handlers:
  - Log entry and exit of each endpoint
  - Log errors with context
  - Log security-sensitive operations (export, delete, etc.)

**Files to Modify:**
- `containers/secret-management/src/routes/secrets.ts`
- `containers/secret-management/src/routes/vaults.ts`
- `containers/secret-management/src/routes/import-export.ts`
- `containers/secret-management/src/routes/audit.ts`
- `containers/secret-management/src/server.ts` (add middleware)

**Deliverables:**
- API operations logged
- Request tracking enabled

#### Task 16.1.9: Add Logging Configuration
- [ ] Add environment variables:
  - `LOGGING_SERVICE_URL` (default: `http://localhost:3014`)
  - `LOGGING_ENABLED` (default: `true`)
  - `LOG_LEVEL` (default: `info` in production, `debug` in development)
- [ ] Add configuration validation
- [ ] Add to `.env.example`

**Files to Modify:**
- `containers/secret-management/.env.example`
- `containers/secret-management/src/config/index.ts` (if exists)

**Deliverables:**
- Logging configuration documented
- Environment variables set

### 16.2 Dependencies

- Phase 2 (Encryption - for error logging)
- Phase 4 (Secret Service - for operation logging)
- Phase 10 (API Endpoints - for request logging)
- Logging Module (must be running)

### 16.3 Testing

- [ ] Unit tests for LoggingClient
- [ ] Unit tests for SecretLoggingService
- [ ] Integration tests with Logging Module
- [ ] Test log delivery
- [ ] Test error handling (logging service unavailable)
- [ ] Test log sanitization (no secret values)
- [ ] Test log levels
- [ ] Test batch logging
- [ ] Verify logs appear in Logging Module

### 16.4 Security Considerations

- **Never log secret values** - Only log metadata (ID, name, type, scope)
- **Sanitize error messages** - Remove any secret values from error messages
- **Log access denials** - Important for security monitoring
- **Log sensitive operations** - Export, delete, migration operations
- **Use appropriate log levels** - Don't log sensitive info at debug level in production

---

## Phase 15: Testing & Quality Assurance

**Duration:** 5-6 days  
**Priority:** Critical  
**Dependencies:** All phases

### 15.1 Tasks

#### Task 15.1.1: Unit Testing
- [ ] Complete unit tests for all services
- [ ] Complete unit tests for all utilities
- [ ] Complete unit tests for all validators
- [ ] Achieve >80% code coverage
- [ ] Fix all failing tests

**Deliverables:**
- Comprehensive unit test suite
- High code coverage

#### Task 15.1.2: Integration Testing
- [ ] Integration tests for all API endpoints
- [ ] Integration tests for backend operations
- [ ] Integration tests for access control
- [ ] Integration tests for lifecycle management
- [ ] Integration tests for Azure Key Vault
- [ ] Integration tests for import/export
- [ ] Integration tests for audit logging

**Deliverables:**
- Comprehensive integration test suite
- All integrations tested

#### Task 15.1.3: Security Testing
- [ ] Test encryption/decryption
- [ ] Test access control
- [ ] Test secret value masking
- [ ] Test audit log sanitization
- [ ] Test permission checking
- [ ] Test service-to-service authentication
- [ ] Penetration testing (if applicable)

**Deliverables:**
- Security testing complete
- No vulnerabilities found

#### Task 15.1.4: Performance Testing
- [ ] Test secret retrieval performance
- [ ] Test bulk operations
- [ ] Test caching effectiveness
- [ ] Test database query performance
- [ ] Load testing

**Deliverables:**
- Performance benchmarks
- Optimization if needed

#### Task 15.1.5: Documentation
- [ ] API documentation
- [ ] Integration guide
- [ ] User guide
- [ ] Developer guide
- [ ] Security best practices
- [ ] Troubleshooting guide

**Deliverables:**
- Complete documentation

### 15.2 Dependencies

- All previous phases

### 15.3 Testing

- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Ready for production

---

## Dependencies & Requirements

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@azure/keyvault-secrets` | Latest | Azure Key Vault integration |
| `@azure/identity` | Latest | Azure authentication |
| `lru-cache` | Latest | Caching layer |
| `zod` | ^3.24.1 | Request validation |
| `node-forge` or `@peculiar/x509` | Latest | Certificate parsing |
| `cron` or similar | Latest | Scheduled jobs |

### Internal Dependencies

- `@coder/shared` package
- User Management module (permissions)
- Notification Manager module (events)
- Logging Module (operational logging)
- Organization Service (SSO integration)
- Shared database (Cosmos DB NoSQL)
- RabbitMQ (event publishing)

### Environment Variables

```bash
# Required
SECRETS_MASTER_KEY=<base64-encoded-master-key>

# Optional
SECRETS_ENCRYPTION_ALGORITHM=AES-256-GCM
SECRETS_DEFAULT_BACKEND=LOCAL_ENCRYPTED
SECRETS_CACHE_ENABLED=true
SECRETS_CACHE_TTL_SECONDS=300
SECRETS_CACHE_MAX_SIZE=1000

# Azure Key Vault (if using)
AZURE_KEY_VAULT_URL=<vault-url>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_TENANT_ID=<tenant-id>

# Logging Service
LOGGING_SERVICE_URL=http://localhost:3014
LOGGING_ENABLED=true
LOG_LEVEL=info
```

---

## Timeline & Estimates

### Overall Timeline

**Total Estimated Duration:** 13-15 weeks (3-3.75 months)

### Phase Breakdown

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Database Schema & Core Infrastructure | 3-4 days | Critical |
| Phase 2: Encryption & Local Backend | 4-5 days | Critical |
| Phase 3: Access Control & Scoping | 5-6 days | Critical |
| Phase 4: Secret Service API & CRUD Operations | 6-7 days | Critical |
| Phase 5: Lifecycle Management | 5-6 days | High |
| Phase 6: Azure Key Vault Integration | 6-7 days | High |
| Phase 7: Versioning & Soft Delete | 4-5 days | High |
| Phase 8: Import/Export & Migration | 5-6 days | Medium |
| Phase 9: Audit Logging & Compliance | 5-6 days | High |
| Phase 10: API Endpoints & Routes | 6-7 days | Critical |
| Phase 11: User Management Integration | 3-4 days | Critical |
| Phase 12: Notification Integration | 4-5 days | High |
| Phase 16: Logging Module Integration | 3-4 days | High |
| Phase 13: SSO Integration | 4-5 days | High |
| Phase 14: Frontend UI Implementation | 10-12 days | Critical |
| Phase 15: Testing & Quality Assurance | 5-6 days | Critical |

### Parallel Work Opportunities

- Phase 11, 12, 13, 16 can be done in parallel after Phase 10
- Frontend UI (Phase 14) can start after Phase 10 is complete
- Testing can be done incrementally throughout

### Critical Path

1. Phase 1 → Phase 2 → Phase 3 → Phase 4 (Core functionality)
2. Phase 4 → Phase 10 (API layer)
3. Phase 10 → Phase 14 (UI)
4. All phases → Phase 15 (Testing)

---

## Risk Assessment & Mitigation

### High Risks

1. **Encryption Key Management**
   - **Risk**: Master key loss or compromise
   - **Mitigation**: 
     - Document key backup procedures
     - Use secure key storage (keytar, environment variables)
     - Implement key rotation procedures

2. **Azure Key Vault Integration Complexity**
   - **Risk**: Integration issues, authentication problems
   - **Mitigation**:
     - Start with local backend first
     - Create comprehensive test environment
     - Document all authentication methods

3. **Performance with Large Secret Counts**
   - **Risk**: Slow queries, cache issues
   - **Mitigation**:
     - Implement proper indexing
     - Use caching effectively
     - Optimize database queries
     - Load testing

4. **Security Vulnerabilities**
   - **Risk**: Secret exposure, access control bypass
   - **Mitigation**:
     - Comprehensive security testing
     - Code review
     - Audit log verification
     - Penetration testing

5. **Integration Complexity**
   - **Risk**: Issues with User Management, Notification modules
   - **Mitigation**:
     - Early integration testing
     - Clear API contracts
     - Fallback mechanisms

### Medium Risks

1. **UI Complexity**
   - **Risk**: Complex UI, user experience issues
   - **Mitigation**: 
     - User testing
     - Iterative design
     - Clear documentation

2. **Migration Complexity**
   - **Risk**: Issues migrating between backends
   - **Mitigation**:
     - Comprehensive testing
     - Rollback procedures
     - Progress tracking

---

## Success Metrics

### Functional Metrics

- ✅ All secret types supported
- ✅ All scopes functional
- ✅ All CRUD operations working
- ✅ Encryption/decryption working
- ✅ Azure Key Vault integration working
- ✅ Access control working
- ✅ Lifecycle management working
- ✅ Audit logging complete
- ✅ UI fully functional

### Quality Metrics

- ✅ >80% code coverage
- ✅ All tests passing
- ✅ No critical security vulnerabilities
- ✅ Performance benchmarks met
- ✅ Documentation complete

### Integration Metrics

- ✅ User Management integration working
- ✅ Notification integration working
- ✅ Logging Module integration working
- ✅ SSO integration working
- ✅ All consumer modules can use secrets

---

## Next Steps

1. **Review and Approve Plan**
   - Review this implementation plan
   - Adjust timeline if needed
   - Assign resources

2. **Set Up Development Environment**
   - Configure Azure Key Vault test environment
   - Set up development database
   - Configure environment variables

3. **Begin Phase 1**
   - Start with database schema updates
   - Set up project structure
   - Begin implementation

---

## Appendix

### A. Complete API Endpoints List

#### Secret Management Endpoints

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `POST` | `/api/secrets` | Create new secret | ✅ | `secrets.secret.create.*` (scope-based) |
| `GET` | `/api/secrets` | List secrets (metadata only) | ✅ | `secrets.secret.read.*` (scope-based) |
| `GET` | `/api/secrets/:id` | Get secret metadata | ✅ | `secrets.secret.read.*` (scope-based) |
| `GET` | `/api/secrets/:id/value` | Get secret value | ✅ | `secrets.secret.read.*` + explicit access |
| `PUT` | `/api/secrets/:id` | Update secret metadata | ✅ | `secrets.secret.update.*` (scope-based) |
| `PUT` | `/api/secrets/:id/value` | Update secret value | ✅ | `secrets.secret.update.*` (scope-based) |
| `DELETE` | `/api/secrets/:id` | Soft delete secret | ✅ | `secrets.secret.delete.*` (scope-based) |
| `POST` | `/api/secrets/:id/restore` | Restore soft-deleted secret | ✅ | `secrets.secret.update.*` (scope-based) |
| `DELETE` | `/api/secrets/:id/permanent` | Permanently delete secret | ✅ | `secrets.secret.delete.*` (scope-based) |

#### Rotation & Versioning Endpoints

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `POST` | `/api/secrets/:id/rotate` | Rotate secret | ✅ | `secrets.secret.update.*` (scope-based) |
| `GET` | `/api/secrets/:id/versions` | Get version history | ✅ | `secrets.secret.read.*` (scope-based) |
| `GET` | `/api/secrets/:id/versions/:version` | Get specific version value | ✅ | `secrets.secret.read.*` (scope-based) |
| `POST` | `/api/secrets/:id/rollback` | Rollback to previous version | ✅ | `secrets.secret.update.*` (scope-based) |

#### Access Management Endpoints

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `GET` | `/api/secrets/:id/access` | List access grants | ✅ | `secrets.secret.read.*` (scope-based) |
| `POST` | `/api/secrets/:id/access` | Grant access to secret | ✅ | `secrets.secret.grant.*` (scope-based) |
| `DELETE` | `/api/secrets/:id/access/:grantId` | Revoke access grant | ✅ | `secrets.secret.grant.*` (scope-based) |

#### Vault Configuration Endpoints

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `GET` | `/api/vaults` | List vault configurations | ✅ | `secrets.vault.manage.*` (scope-based) |
| `POST` | `/api/vaults` | Create vault configuration | ✅ | `secrets.vault.manage.*` (scope-based) |
| `GET` | `/api/vaults/:id` | Get vault configuration | ✅ | `secrets.vault.manage.*` (scope-based) |
| `PUT` | `/api/vaults/:id` | Update vault configuration | ✅ | `secrets.vault.manage.*` (scope-based) |
| `DELETE` | `/api/vaults/:id` | Delete vault configuration | ✅ | `secrets.vault.manage.*` (scope-based) |
| `POST` | `/api/vaults/:id/health` | Check vault health | ✅ | `secrets.vault.manage.*` (scope-based) |
| `POST` | `/api/vaults/:id/default` | Set as default vault | ✅ | `secrets.vault.manage.*` (scope-based) |

#### Import/Export Endpoints

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `POST` | `/api/secrets/import/env` | Import secrets from .env file | ✅ | `secrets.secret.create.*` (scope-based) |
| `POST` | `/api/secrets/import/json` | Import secrets from JSON | ✅ | `secrets.secret.create.*` (scope-based) |
| `GET` | `/api/secrets/export` | Export secrets | ✅ | `secrets.secret.read.*` (scope-based) |
| `POST` | `/api/secrets/migrate` | Migrate secrets between backends | ✅ | `secrets.vault.manage.*` (scope-based) |

#### Audit Endpoints

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `GET` | `/api/secrets/audit` | List audit logs | ✅ | `secrets.audit.read.*` (scope-based) |
| `GET` | `/api/secrets/audit/:id` | Get audit log details | ✅ | `secrets.audit.read.*` (scope-based) |
| `GET` | `/api/secrets/compliance/report` | Generate compliance report | ✅ | `secrets.audit.read.*` (scope-based) |

#### SSO Secret Endpoints

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| `POST` | `/api/secrets/sso` | Store SSO secret | ✅ | Service-to-service only |
| `GET` | `/api/secrets/sso/:secretId` | Get SSO secret | ✅ | Service-to-service only |
| `PUT` | `/api/secrets/sso/:secretId` | Update SSO secret | ✅ | Service-to-service only |
| `DELETE` | `/api/secrets/sso/:secretId` | Delete SSO secret | ✅ | Service-to-service only |
| `POST` | `/api/secrets/sso/:secretId/rotate` | Rotate SSO certificate | ✅ | Service-to-service only |
| `GET` | `/api/secrets/sso/:secretId/expiration` | Check certificate expiration | ✅ | Service-to-service only |

**Total API Endpoints: 33**

#### Endpoint Summary by Category

- **Secret CRUD**: 9 endpoints
- **Rotation & Versioning**: 4 endpoints
- **Access Management**: 3 endpoints
- **Vault Configuration**: 7 endpoints
- **Import/Export**: 4 endpoints
- **Audit**: 3 endpoints
- **SSO Secrets**: 6 endpoints

---

### B. Complete UI Pages/Views List

#### Super Admin Views

| Page/View | Route | Description | Components Used |
|-----------|-------|-------------|-----------------|
| **Global Secrets Manager** | `/secrets/global` | Manage platform-wide secrets | SecretManager, SecretList, SecretFilters, SecretSearch |
| **Global Vault Configuration** | `/secrets/global/vaults` | Configure global vaults | VaultConfig, VaultForm, VaultCard |
| **Platform Audit Logs** | `/secrets/global/audit` | View platform-wide audit logs | AuditLogViewer, AuditFilters, AuditDetail |
| **Platform Compliance Report** | `/secrets/global/compliance` | Generate platform compliance reports | ComplianceReport |

#### Organization Admin Views

| Page/View | Route | Description | Components Used |
|-----------|-------|-------------|-----------------|
| **Organization Secrets Manager** | `/secrets/organization` | Manage organization secrets | SecretManager, SecretList, SecretCard, SecretFilters, SecretSearch |
| **Organization Vault Configuration** | `/secrets/organization/vaults` | Configure organization vaults | VaultConfig, VaultForm, VaultCard, VaultHealthStatus |
| **Organization Audit Logs** | `/secrets/organization/audit` | View organization audit logs | AuditLogViewer, AuditFilters, AuditDetail |
| **Organization Compliance Report** | `/secrets/organization/compliance` | Generate organization compliance reports | ComplianceReport |
| **Import Secrets** | `/secrets/organization/import` | Import secrets from files | ImportDialog |
| **Export Secrets** | `/secrets/organization/export` | Export secrets to files | ExportDialog |
| **Migrate Secrets** | `/secrets/organization/migrate` | Migrate secrets between backends | MigrationWizard |

#### Secret Detail Views

| Page/View | Route | Description | Components Used |
|-----------|-------|-------------|-----------------|
| **Secret Detail** | `/secrets/:id` | View secret details | SecretDetail, SecretMetadata, SecretVersionHistory, SecretAccessGrants |
| **Secret Edit** | `/secrets/:id/edit` | Edit secret (modal or page) | EditSecretDialog, SecretValueInput, SecretTypeSelector, ScopeSelector |

#### User Views

| Page/View | Route | Description | Components Used |
|-----------|-------|-------------|-----------------|
| **Personal Secrets** | `/secrets/personal` | Manage personal secrets | SecretManager, SecretList, SecretCard |
| **Accessible Secrets** | `/secrets/accessible` | View secrets with granted access | SecretList, SecretCard |

**Total UI Pages/Views: 13**

#### Page Summary by Role

- **Super Admin Views**: 4 pages
- **Organization Admin Views**: 7 pages
- **Secret Detail Views**: 2 pages (shared)
- **User Views**: 2 pages

---

### C. Complete UI Components List

#### Manager Components

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **SecretManager** | `src/renderer/components/secrets/manager/SecretManager.tsx` | Main secret management view container | - |
| **SecretList** | `src/renderer/components/secrets/manager/SecretList.tsx` | List of secrets with cards | `secrets: SecretMetadata[]`, `onSelect: (id) => void` |
| **SecretCard** | `src/renderer/components/secrets/manager/SecretCard.tsx` | Individual secret card display | `secret: SecretMetadata`, `onView`, `onEdit`, `onDelete`, `onRotate` |
| **SecretFilters** | `src/renderer/components/secrets/manager/SecretFilters.tsx` | Filter controls (scope, type, tags) | `filters: FilterState`, `onFilterChange: (filters) => void` |
| **SecretSearch** | `src/renderer/components/secrets/manager/SecretSearch.tsx` | Search input component | `onSearch: (query) => void`, `placeholder?: string` |

#### Form Components

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **CreateSecretDialog** | `src/renderer/components/secrets/forms/CreateSecretDialog.tsx` | Modal dialog for creating secrets | `open: boolean`, `onClose: () => void`, `onCreate: (secret) => void` |
| **EditSecretDialog** | `src/renderer/components/secrets/forms/EditSecretDialog.tsx` | Modal dialog for editing secrets | `open: boolean`, `secret: Secret`, `onClose: () => void`, `onUpdate: (secret) => void` |
| **SecretValueInput** | `src/renderer/components/secrets/forms/SecretValueInput.tsx` | Value input with masking | `type: SecretType`, `value: string`, `onChange: (value) => void`, `masked: boolean` |
| **SecretTypeSelector** | `src/renderer/components/secrets/forms/SecretTypeSelector.tsx` | Dropdown for secret type selection | `value: SecretType`, `onChange: (type) => void` |
| **ScopeSelector** | `src/renderer/components/secrets/forms/ScopeSelector.tsx` | Scope selection component | `value: SecretScope`, `onChange: (scope) => void`, `availableScopes: SecretScope[]` |
| **LifecycleConfig** | `src/renderer/components/secrets/forms/LifecycleConfig.tsx` | Expiration and rotation configuration | `expiresAt?: Date`, `rotationEnabled: boolean`, `rotationIntervalDays?: number`, `onChange: (config) => void` |
| **TagInput** | `src/renderer/components/secrets/forms/TagInput.tsx` | Tag input component | `tags: string[]`, `onChange: (tags) => void` |
| **GrantAccessDialog** | `src/renderer/components/secrets/forms/GrantAccessDialog.tsx` | Dialog for granting access | `open: boolean`, `secretId: string`, `onClose: () => void`, `onGrant: (grant) => void` |
| **RotateSecretDialog** | `src/renderer/components/secrets/forms/RotateSecretDialog.tsx` | Dialog for rotating secret | `open: boolean`, `secret: Secret`, `onClose: () => void`, `onRotate: (newValue) => void` |
| **DeleteSecretDialog** | `src/renderer/components/secrets/forms/DeleteSecretDialog.tsx` | Confirmation dialog for deletion | `open: boolean`, `secret: SecretMetadata`, `permanent: boolean`, `onClose: () => void`, `onDelete: () => void` |
| **RestoreSecretDialog** | `src/renderer/components/secrets/forms/RestoreSecretDialog.tsx` | Confirmation dialog for restore | `open: boolean`, `secret: SecretMetadata`, `onClose: () => void`, `onRestore: () => void` |
| **RollbackVersionDialog** | `src/renderer/components/secrets/forms/RollbackVersionDialog.tsx` | Confirmation dialog for rollback | `open: boolean`, `secretId: string`, `targetVersion: number`, `onClose: () => void`, `onRollback: () => void` |

#### Detail Components

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **SecretDetail** | `src/renderer/components/secrets/detail/SecretDetail.tsx` | Secret detail view container | `secretId: string` |
| **SecretMetadata** | `src/renderer/components/secrets/detail/SecretMetadata.tsx` | Display secret metadata | `secret: SecretMetadata` |
| **SecretValueDisplay** | `src/renderer/components/secrets/detail/SecretValueDisplay.tsx` | Display secret value with reveal | `secretId: string`, `value: string`, `type: SecretType` |
| **SecretVersionHistory** | `src/renderer/components/secrets/detail/SecretVersionHistory.tsx` | Version history list and rollback | `secretId: string`, `versions: SecretVersion[]`, `onRollback: (version) => void` |
| **SecretAccessGrants** | `src/renderer/components/secrets/detail/SecretAccessGrants.tsx` | Access grants list and management | `secretId: string`, `grants: SecretAccessGrant[]`, `onGrant`, `onRevoke` |
| **SecretLifecycleInfo** | `src/renderer/components/secrets/detail/SecretLifecycleInfo.tsx` | Display lifecycle information | `secret: SecretMetadata`, `onRotate: () => void` |
| **SecretUsageStats** | `src/renderer/components/secrets/detail/SecretUsageStats.tsx` | Display usage statistics | `secretId: string`, `usageRecords: SecretUsage[]` |

#### Vault Components

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **VaultConfig** | `src/renderer/components/secrets/vault/VaultConfig.tsx` | Vault configuration view | - |
| **VaultList** | `src/renderer/components/secrets/vault/VaultList.tsx` | List of vault configurations | `vaults: VaultConfiguration[]`, `onSelect: (id) => void` |
| **VaultForm** | `src/renderer/components/secrets/vault/VaultForm.tsx` | Form for creating/editing vaults | `vault?: VaultConfiguration`, `onSubmit: (vault) => void`, `onCancel: () => void` |
| **VaultCard** | `src/renderer/components/secrets/vault/VaultCard.tsx` | Vault card display | `vault: VaultConfiguration`, `onEdit`, `onDelete`, `onTest`, `onSetDefault` |
| **VaultHealthStatus** | `src/renderer/components/secrets/vault/VaultHealthStatus.tsx` | Health status indicator | `status: VaultHealthStatus`, `lastCheck: Date` |
| **VaultBackendSelector** | `src/renderer/components/secrets/vault/VaultBackendSelector.tsx` | Backend type selector | `value: StorageBackend`, `onChange: (backend) => void` |
| **AzureVaultConfig** | `src/renderer/components/secrets/vault/AzureVaultConfig.tsx` | Azure Key Vault configuration form | `config: AzureKeyVaultConfig`, `onChange: (config) => void` |
| **LocalVaultConfig** | `src/renderer/components/secrets/vault/LocalVaultConfig.tsx` | Local encrypted storage config | `config: LocalBackendConfig`, `onChange: (config) => void` |
| **VaultTestConnection** | `src/renderer/components/secrets/vault/VaultTestConnection.tsx` | Test vault connection button | `vaultId: string`, `onTest: () => Promise<HealthCheckResult>` |

#### Import/Export Components

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **ImportDialog** | `src/renderer/components/secrets/import-export/ImportDialog.tsx` | Import secrets modal | `open: boolean`, `onClose: () => void`, `onImport: (result) => void` |
| **ImportFileUpload** | `src/renderer/components/secrets/import-export/ImportFileUpload.tsx` | File upload component | `onFileSelect: (file: File) => void`, `acceptedFormats: string[]` |
| **ImportPreview** | `src/renderer/components/secrets/import-export/ImportPreview.tsx` | Preview imported secrets | `secrets: ImportSecretData[]`, `onConfirm: () => void`, `onCancel: () => void` |
| **ImportResult** | `src/renderer/components/secrets/import-export/ImportResult.tsx` | Display import results | `result: ImportResult` |
| **ExportDialog** | `src/renderer/components/secrets/import-export/ExportDialog.tsx` | Export secrets modal | `open: boolean`, `onClose: () => void`, `onExport: (result) => void` |
| **ExportOptions** | `src/renderer/components/secrets/import-export/ExportOptions.tsx` | Export format and options | `format: 'json' \| 'env'`, `includeValues: boolean`, `scope: SecretScope`, `onChange: (options) => void` |
| **MigrationWizard** | `src/renderer/components/secrets/import-export/MigrationWizard.tsx` | Multi-step migration wizard | `open: boolean`, `onClose: () => void`, `onMigrate: (result) => void` |
| **MigrationStep1** | `src/renderer/components/secrets/import-export/MigrationStep1.tsx` | Select source vault | `vaults: VaultConfiguration[]`, `onSelect: (vaultId) => void` |
| **MigrationStep2** | `src/renderer/components/secrets/import-export/MigrationStep2.tsx` | Select target vault | `vaults: VaultConfiguration[]`, `onSelect: (vaultId) => void` |
| **MigrationStep3** | `src/renderer/components/secrets/import-export/MigrationStep3.tsx` | Migration options and preview | `sourceVault: VaultConfiguration`, `targetVault: VaultConfiguration`, `secretCount: number`, `onConfirm: () => void` |
| **MigrationProgress** | `src/renderer/components/secrets/import-export/MigrationProgress.tsx` | Migration progress display | `progress: MigrationProgress`, `result?: MigrationResult` |

#### Audit Components

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **AuditLogViewer** | `src/renderer/components/secrets/audit/AuditLogViewer.tsx` | Audit log list viewer | `logs: AuditLog[]`, `onLoadMore: () => void` |
| **AuditLogList** | `src/renderer/components/secrets/audit/AuditLogList.tsx` | List of audit log entries | `logs: AuditLog[]`, `onSelect: (logId) => void` |
| **AuditLogItem** | `src/renderer/components/secrets/audit/AuditLogItem.tsx` | Individual audit log entry | `log: AuditLog`, `onClick: () => void` |
| **AuditFilters** | `src/renderer/components/secrets/audit/AuditFilters.tsx` | Filter controls for audit logs | `filters: AuditFilters`, `onFilterChange: (filters) => void` |
| **AuditDetail** | `src/renderer/components/secrets/audit/AuditDetail.tsx` | Audit log detail view | `log: AuditLog` |
| **ComplianceReport** | `src/renderer/components/secrets/audit/ComplianceReport.tsx` | Compliance report viewer | `report: ComplianceReport`, `onExport: () => void` |
| **ComplianceFindings** | `src/renderer/components/secrets/audit/ComplianceFindings.tsx` | Display compliance findings | `findings: ComplianceFinding[]` |
| **ComplianceSummary** | `src/renderer/components/secrets/audit/ComplianceSummary.tsx` | Compliance summary statistics | `summary: ComplianceReport['summary']` |
| **GenerateReportDialog** | `src/renderer/components/secrets/audit/GenerateReportDialog.tsx` | Dialog for generating compliance report | `open: boolean`, `onClose: () => void`, `onGenerate: (period) => void` |

#### Common Components

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **SecretTypeBadge** | `src/renderer/components/secrets/common/SecretTypeBadge.tsx` | Badge showing secret type | `type: SecretType` |
| **ScopeBadge** | `src/renderer/components/secrets/common/ScopeBadge.tsx` | Badge showing secret scope | `scope: SecretScope` |
| **ExpirationBadge** | `src/renderer/components/secrets/common/ExpirationBadge.tsx` | Badge showing expiration status | `expiresAt?: Date`, `isExpired: boolean`, `daysUntilExpiration?: number` |
| **MaskedValue** | `src/renderer/components/secrets/common/MaskedValue.tsx` | Masked value display with reveal | `value: string`, `masked: boolean`, `onToggle: () => void` |
| **PermissionBadge** | `src/renderer/components/secrets/common/PermissionBadge.tsx` | Badge showing permission level | `permission: 'read' \| 'update' \| 'delete' \| 'grant'` |
| **StatusBadge** | `src/renderer/components/secrets/common/StatusBadge.tsx` | Badge showing secret status | `status: 'active' \| 'expired' \| 'deleted' \| 'rotating'` |
| **EmptyState** | `src/renderer/components/secrets/common/EmptyState.tsx` | Empty state component | `title: string`, `description: string`, `action?: { label: string, onClick: () => void }` |
| **LoadingState** | `src/renderer/components/secrets/common/LoadingState.tsx` | Loading state component | `message?: string` |
| **ErrorState** | `src/renderer/components/secrets/common/ErrorState.tsx` | Error state component | `error: Error`, `onRetry?: () => void` |
| **Pagination** | `src/renderer/components/secrets/common/Pagination.tsx` | Pagination controls | `currentPage: number`, `totalPages: number`, `onPageChange: (page) => void` |
| **ConfirmDialog** | `src/renderer/components/secrets/common/ConfirmDialog.tsx` | Generic confirmation dialog | `open: boolean`, `title: string`, `message: string`, `onConfirm: () => void`, `onCancel: () => void` |

#### Context & Services

| Component | File Path | Description | Props/State |
|-----------|-----------|-------------|-------------|
| **SecretContext** | `src/renderer/contexts/SecretContext.tsx` | React context for secret state | Provides: `secrets`, `loading`, `error`, `createSecret`, `updateSecret`, `deleteSecret`, etc. |
| **secretApi** | `src/renderer/services/secretApi.ts` | API client service | Functions for all API endpoints |

**Total UI Components: 52**

#### Component Summary by Category

- **Manager Components**: 5 components
- **Form Components**: 12 components
- **Detail Components**: 6 components
- **Vault Components**: 8 components
- **Import/Export Components**: 10 components
- **Audit Components**: 9 components
- **Common Components**: 11 components
- **Context & Services**: 2 components

---

### D. File Structure

```
containers/secret-management/
├── src/
│   ├── server.ts
│   ├── routes/
│   │   ├── secrets.ts
│   │   ├── vaults.ts
│   │   ├── import-export.ts
│   │   └── audit.ts
│   ├── services/
│   │   ├── SecretService.ts
│   │   ├── VaultService.ts
│   │   ├── encryption/
│   │   │   ├── EncryptionService.ts
│   │   │   ├── AESEncryptor.ts
│   │   │   └── KeyManager.ts
│   │   ├── backends/
│   │   │   ├── BackendFactory.ts
│   │   │   ├── LocalBackend.ts
│   │   │   └── AzureKeyVaultBackend.ts
│   │   ├── access/
│   │   │   ├── AccessController.ts
│   │   │   ├── ScopeResolver.ts
│   │   │   └── AccessGrantService.ts
│   │   ├── lifecycle/
│   │   │   ├── ExpirationManager.ts
│   │   │   ├── RotationManager.ts
│   │   │   ├── VersionManager.ts
│   │   │   └── SoftDeleteManager.ts
│   │   ├── import/
│   │   │   └── ImportService.ts
│   │   ├── export/
│   │   │   └── ExportService.ts
│   │   ├── migration/
│   │   │   └── MigrationService.ts
│   │   ├── audit/
│   │   │   ├── AuditLogger.ts
│   │   │   ├── ComplianceReporter.ts
│   │   │   └── AuditQueryService.ts
│   │   ├── cache/
│   │   │   └── SecretCache.ts
│   │   ├── validation/
│   │   │   └── SecretTypeValidator.ts
│   │   └── permissions/
│   │       └── PermissionService.ts
│   ├── events/
│   │   └── SecretEventPublisher.ts
│   ├── logging/
│   │   ├── LoggingClient.ts
│   │   └── SecretLoggingService.ts
│   ├── jobs/
│   │   ├── expirationJob.ts
│   │   └── rotationJob.ts
│   ├── types/
│   │   ├── secret.types.ts
│   │   ├── backend.types.ts
│   │   ├── audit.types.ts
│   │   └── events.types.ts
│   └── errors/
│       └── SecretErrors.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
└── README.md
```

---

**End of Implementation Plan**
