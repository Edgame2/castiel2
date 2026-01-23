# Secret Management Module Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** Shared & Common / Security

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Secret Types](#4-secret-types)
5. [Storage Backends](#5-storage-backends)
6. [Scoping & Ownership](#6-scoping--ownership)
7. [Access Control](#7-access-control)

---

## 1. Overview

### 1.1 Purpose

The Secret Management Module provides a **centralized, secure, and auditable** system for storing, managing, and accessing sensitive credentials across the Coder IDE platform. It serves as the single source of truth for all secrets used by other modules.

### 1.2 Consumer Modules

| Module | Secret Usage |
|--------|--------------|
| **MCP Servers** | API keys, OAuth tokens for MCP server authentication |
| **LLM Models** | OpenAI API keys, Anthropic keys, Azure OpenAI credentials |
| **Cloud Integrations** | Azure, AWS, GCP service credentials |
| **Git Providers** | GitHub, GitLab, Bitbucket personal access tokens |
| **Database Connections** | Connection strings, credentials |
| **CI/CD Integrations** | Pipeline tokens, deployment credentials |
| **Environment Management** | Environment-specific secrets |

### 1.3 Key Responsibilities

- **Secure Storage**: Encrypt and store secrets using industry-standard encryption
- **Multi-Backend Support**: Integrate with Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager
- **Access Control**: Enforce scoped access based on user roles and ownership
- **Lifecycle Management**: Handle expiration, rotation, versioning, and soft delete
- **Audit Logging**: Track all secret operations for compliance
- **Secret Resolution**: Provide runtime resolution for secret references

### 1.4 Design Principles

1. **Zero Trust**: Never log or expose secret values; mask in all outputs
2. **Least Privilege**: Only grant access to secrets that are explicitly needed
3. **Defense in Depth**: Multiple layers of encryption and access control
4. **Audit Everything**: Complete audit trail for compliance
5. **Backend Agnostic**: Consistent API regardless of storage backend

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Consumer Modules                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   MCP    │ │   LLM    │ │  Cloud   │ │   Git    │ │ Database │          │
│  │ Servers  │ │  Models  │ │  Integ.  │ │Providers │ │  Conn.   │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │            │            │            │                 │
│       └────────────┴────────────┼────────────┴────────────┘                 │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                 Secret Management Module                             │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Secret Service API                         │   │   │
│  │  │  • getSecret()    • createSecret()   • updateSecret()        │   │   │
│  │  │  • deleteSecret() • listSecrets()    • rotateSecret()        │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                      │   │
│  │  ┌───────────┬───────────────┼───────────────┬───────────────┐     │   │
│  │  ▼           ▼               ▼               ▼               ▼     │   │
│  │ ┌─────┐  ┌─────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐   │   │
│  │ │Cache│  │ Access  │  │ Lifecycle │  │Encryption │  │  Audit  │   │   │
│  │ │Layer│  │ Control │  │  Manager  │  │  Service  │  │ Logger  │   │   │
│  │ └─────┘  └─────────┘  └───────────┘  └───────────┘  └─────────┘   │   │
│  │                              │                                      │   │
│  │  ┌───────────────────────────┴───────────────────────────────┐     │   │
│  │  │              Storage Backend Abstraction                   │     │   │
│  │  └───────────────────────────┬───────────────────────────────┘     │   │
│  │                              │                                      │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
│                                 │                                          │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Local      │       │   Azure Key     │       │      AWS        │
│  Encrypted    │       │     Vault       │       │    Secrets      │
│   Storage     │       │                 │       │    Manager      │
└───────────────┘       └─────────────────┘       └─────────────────┘
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         
┌───────────────┐       ┌─────────────────┐       
│  HashiCorp    │       │      GCP        │       
│    Vault      │       │ Secret Manager  │       
└───────────────┘       └─────────────────┘       
```

### 2.2 Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Secret Service API** | Unified interface for all secret operations |
| **Cache Layer** | In-memory cache with TTL for performance |
| **Access Control** | Enforce scope-based permissions |
| **Lifecycle Manager** | Handle expiration, rotation, versioning |
| **Encryption Service** | Encrypt/decrypt for local storage |
| **Audit Logger** | Record all operations for compliance |
| **Storage Backend Abstraction** | Unified interface to multiple backends |

### 2.3 Module Location

```
src/
├── core/
│   └── secrets/
│       ├── index.ts                    # Module exports
│       ├── SecretService.ts            # Main service API
│       ├── SecretResolver.ts           # Runtime secret resolution
│       │
│       ├── access/
│       │   ├── AccessController.ts     # Permission enforcement
│       │   └── ScopeResolver.ts        # Scope hierarchy resolution
│       │
│       ├── lifecycle/
│       │   ├── LifecycleManager.ts     # Expiration, rotation
│       │   ├── VersionManager.ts       # Version history
│       │   └── RotationScheduler.ts    # Automatic rotation
│       │
│       ├── encryption/
│       │   ├── EncryptionService.ts    # Encryption abstraction
│       │   ├── AESEncryptor.ts         # AES-256-GCM implementation
│       │   └── KeyManager.ts           # Encryption key management
│       │
│       ├── cache/
│       │   ├── SecretCache.ts          # In-memory cache
│       │   └── CacheInvalidator.ts     # Cache invalidation
│       │
│       ├── backends/
│       │   ├── BackendFactory.ts       # Backend instantiation
│       │   ├── LocalBackend.ts         # Local encrypted storage
│       │   ├── AzureKeyVaultBackend.ts # Azure Key Vault
│       │   ├── AWSSecretsBackend.ts    # AWS Secrets Manager
│       │   ├── HashiCorpVaultBackend.ts# HashiCorp Vault
│       │   └── GCPSecretBackend.ts     # GCP Secret Manager
│       │
│       ├── audit/
│       │   ├── AuditLogger.ts          # Audit logging
│       │   └── ComplianceReporter.ts   # Compliance reports
│       │
│       ├── import/
│       │   ├── ImportService.ts        # Bulk import
│       │   ├── EnvFileParser.ts        # .env file parsing
│       │   └── MigrationService.ts     # Backend migration
│       │
│       └── types/
│           ├── secret.types.ts         # Secret type definitions
│           ├── backend.types.ts        # Backend interfaces
│           └── audit.types.ts          # Audit types
│
├── renderer/
│   ├── components/
│   │   └── secrets/
│   │       ├── SecretManager/          # Secret management UI
│   │       ├── SecretForm/             # Create/edit forms
│       │   ├── SecretList/             # Secret listing
│       │   ├── VaultConfig/            # Vault configuration
│       │   └── AuditViewer/            # Audit log viewer
│   └── contexts/
│       └── SecretContext.tsx           # Secret state management
│
server/
├── src/
│   ├── routes/
│   │   └── secrets/
│   │       ├── secrets.ts              # Secret CRUD endpoints
│   │       ├── vaults.ts               # Vault configuration
│   │       └── audit.ts                # Audit endpoints
│   └── services/
│       └── secrets/
│           ├── SecretService.ts        # Server-side service
│           └── VaultService.ts         # Vault management
└── database/
    └── migrations/
        └── secrets/                    # Secret-related migrations
```

---

## 3. Data Models

### 3.1 Database Architecture

> **Shared Database**: All Secret Management tables reside in the shared PostgreSQL database (`coder_ide`) alongside other module tables. Tables are prefixed with `secret_` or `secrets_` for logical separation.
> 
> See: [Architecture Document](../architecture.md)

### 3.2 Table Mapping

| Prisma Model | Database Table | Description |
|--------------|----------------|-------------|
| `Secret` | `secrets` | Secret storage |
| `SecretVersion` | `secret_versions` | Version history |
| `SecretAccessGrant` | `secret_access_grants` | Access permissions |
| `VaultConfiguration` | `vault_configurations` | Vault backend configs |
| `EncryptionKey` | `encryption_keys` | Encryption key management |
| `SecretAuditLog` | `secret_audit_logs` | Audit trail |
| `SecretUsage` | `secret_usage` | Usage tracking |

**Foreign Keys to Core Tables:**
- `secrets.organization_id` → `organizations.id`
- `secrets.user_id` → `users.id`
- `secrets.team_id` → `teams.id`
- `secrets.project_id` → `projects.id`

### 3.3 Database Schema

```prisma
// ============================================================
// SECRET STORAGE
// All tables in shared database with foreign keys to core tables
// ============================================================

model Secret {
  @@map("secrets")
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String                // Human-readable name
  description           String?
  
  // Type & Value
  type                  SecretType
  
  // Storage
  storageBackend        StorageBackend
  
  // For local storage: encrypted value stored here
  encryptedValue        String?
  encryptionKeyId       String?               // Reference to encryption key version
  
  // For external vaults: reference path
  vaultPath             String?
  vaultSecretId         String?               // External vault's secret ID
  
  // Scoping
  scope                 SecretScope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  userId                String?               // For personal secrets
  user                  User?                 @relation("PersonalSecrets", fields: [userId], references: [id])
  
  // Lifecycle
  expiresAt             DateTime?
  rotationEnabled       Boolean               @default(false)
  rotationIntervalDays  Int?
  lastRotatedAt         DateTime?
  nextRotationAt        DateTime?
  
  // Versioning
  currentVersion        Int                   @default(1)
  versions              SecretVersion[]
  
  // Soft delete
  deletedAt             DateTime?
  deletedById           String?
  deletedBy             User?                 @relation("DeletedSecrets", fields: [deletedById], references: [id])
  recoveryDeadline      DateTime?             // After this, permanent delete
  
  // Metadata
  tags                  String[]
  metadata              Json?                 // Additional metadata
  
  // Audit
  createdAt             DateTime              @default(now())
  createdById           String
  createdBy             User                  @relation("CreatedSecrets", fields: [createdById], references: [id])
  updatedAt             DateTime              @updatedAt
  updatedById           String?
  updatedBy             User?                 @relation("UpdatedSecrets", fields: [updatedById], references: [id])
  
  // Relations
  accessGrants          SecretAccessGrant[]
  usageRecords          SecretUsage[]
  
  @@unique([name, scope, organizationId, teamId, projectId, userId])
  @@index([scope, organizationId])
  @@index([scope, teamId])
  @@index([scope, projectId])
  @@index([scope, userId])
  @@index([type])
  @@index([expiresAt])
  @@index([deletedAt])
}

enum SecretType {
  API_KEY               // Simple string API key
  OAUTH2_TOKEN          // OAuth2 access + refresh tokens
  USERNAME_PASSWORD     // Username/password pair
  CERTIFICATE           // TLS/SSL certificate
  SSH_KEY               // SSH private/public key pair
  CONNECTION_STRING     // Database connection string
  JSON_CREDENTIAL       // JSON-formatted credentials (GCP service account)
  ENV_VARIABLE_SET      // Set of environment variables
  GENERIC               // Generic secret string
}

enum StorageBackend {
  LOCAL_ENCRYPTED       // Local AES-256 encrypted storage
  AZURE_KEY_VAULT       // Azure Key Vault
  AWS_SECRETS_MANAGER   // AWS Secrets Manager
  HASHICORP_VAULT       // HashiCorp Vault
  GCP_SECRET_MANAGER    // GCP Secret Manager
}

enum SecretScope {
  GLOBAL                // Platform-wide (Super Admin)
  ORGANIZATION          // Organization-level
  TEAM                  // Team-level
  PROJECT               // Project-level
  USER                  // Personal/user-level
}

// ============================================================
// SECRET VERSIONING
// ============================================================

model SecretVersion {
  @@map("secret_versions")
  
  id                    String                @id @default(uuid())
  secretId              String
  secret                Secret                @relation(fields: [secretId], references: [id], onDelete: Cascade)
  
  version               Int
  
  // Encrypted value for this version
  encryptedValue        String?
  encryptionKeyId       String?
  
  // External vault reference for this version
  vaultVersionId        String?
  
  // Metadata
  changeReason          String?
  
  // Status
  isActive              Boolean               @default(true)
  
  // Audit
  createdAt             DateTime              @default(now())
  createdById           String
  createdBy             User                  @relation(fields: [createdById], references: [id])
  
  @@unique([secretId, version])
  @@index([secretId, isActive])
}

// ============================================================
// ACCESS CONTROL
// ============================================================

model SecretAccessGrant {
  @@map("secret_access_grants")
  
  id                    String                @id @default(uuid())
  secretId              String
  secret                Secret                @relation(fields: [secretId], references: [id], onDelete: Cascade)
  
  // Grantee (one of these)
  granteeType           GranteeType
  userId                String?
  user                  User?                 @relation(fields: [userId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  roleId                String?
  role                  Role?                 @relation(fields: [roleId], references: [id])
  
  // Permissions
  canRead               Boolean               @default(true)   // Can retrieve value
  canUpdate             Boolean               @default(false)
  canDelete             Boolean               @default(false)
  canGrant              Boolean               @default(false)  // Can grant to others
  
  // Validity
  expiresAt             DateTime?
  
  // Audit
  grantedAt             DateTime              @default(now())
  grantedById           String
  grantedBy             User                  @relation("GrantedAccess", fields: [grantedById], references: [id])
  
  @@unique([secretId, granteeType, userId, teamId, roleId])
}

enum GranteeType {
  USER
  TEAM
  ROLE
}

// ============================================================
// VAULT CONFIGURATION
// ============================================================

model VaultConfiguration {
  @@map("vault_configurations")
  
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String
  description           String?
  
  // Backend type
  backend               StorageBackend
  
  // Scoping
  scope                 VaultScope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  
  // Configuration (encrypted)
  encryptedConfig       String                // Encrypted JSON config
  
  // Status
  isActive              Boolean               @default(true)
  isDefault             Boolean               @default(false)  // Default for scope
  
  // Health
  lastHealthCheck       DateTime?
  healthStatus          VaultHealthStatus     @default(UNKNOWN)
  
  // Audit
  createdAt             DateTime              @default(now())
  createdById           String
  createdBy             User                  @relation(fields: [createdById], references: [id])
  updatedAt             DateTime              @updatedAt
  
  @@unique([name, scope, organizationId])
}

enum VaultScope {
  GLOBAL                // Platform default vault
  ORGANIZATION          // Organization-specific vault
}

enum VaultHealthStatus {
  HEALTHY
  UNHEALTHY
  UNKNOWN
}

// ============================================================
// ENCRYPTION KEYS
// ============================================================

model EncryptionKey {
  @@map("encryption_keys")
  
  id                    String                @id @default(uuid())
  
  // Key identification
  keyId                 String                @unique
  version               Int
  
  // Key material (encrypted with master key)
  encryptedKey          String
  
  // Algorithm
  algorithm             String                @default("AES-256-GCM")
  
  // Status
  status                KeyStatus             @default(ACTIVE)
  
  // Rotation
  rotatedFromId         String?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  expiresAt             DateTime?
  retiredAt             DateTime?
  
  @@index([status])
}

enum KeyStatus {
  ACTIVE                // Currently in use
  ROTATING              // Being rotated
  RETIRED               // No longer used for encryption, only decryption
  DESTROYED             // Permanently destroyed
}

// ============================================================
// AUDIT LOG
// ============================================================

model SecretAuditLog {
  @@map("secret_audit_logs")
  
  id                    String                @id @default(uuid())
  
  // Event
  eventType             SecretAuditEventType
  eventCategory         AuditCategory
  
  // Actor
  actorType             ActorType
  actorId               String
  actorName             String?
  
  // Context
  organizationId        String?
  teamId                String?
  projectId             String?
  
  // Resource
  secretId              String?
  secretName            String?
  secretScope           SecretScope?
  
  // Details (never contains secret values)
  action                String
  details               Json?                 // Sanitized details
  
  // Request context
  ipAddress             String?
  userAgent             String?
  requestId             String?
  
  // Outcome
  outcome               AuditOutcome
  errorMessage          String?
  
  // Timestamp
  timestamp             DateTime              @default(now())
  
  @@index([secretId, timestamp])
  @@index([actorId, timestamp])
  @@index([organizationId, timestamp])
  @@index([eventType, timestamp])
}

enum SecretAuditEventType {
  // CRUD operations
  SECRET_CREATED
  SECRET_READ
  SECRET_UPDATED
  SECRET_DELETED
  SECRET_RESTORED
  SECRET_PERMANENTLY_DELETED
  
  // Lifecycle
  SECRET_ROTATED
  SECRET_EXPIRED
  SECRET_EXPIRING_SOON
  
  // Access
  ACCESS_GRANTED
  ACCESS_REVOKED
  ACCESS_DENIED
  
  // Vault operations
  VAULT_CONFIGURED
  VAULT_UPDATED
  VAULT_DELETED
  VAULT_HEALTH_CHECK
  
  // Import/Export
  SECRETS_IMPORTED
  SECRETS_EXPORTED
  SECRETS_MIGRATED
  
  // Key management
  KEY_ROTATED
  KEY_RETIRED
}

enum AuditCategory {
  CRUD
  LIFECYCLE
  ACCESS
  VAULT
  IMPORT_EXPORT
  KEY_MANAGEMENT
}

enum ActorType {
  USER
  SYSTEM
  SCHEDULER
}

enum AuditOutcome {
  SUCCESS
  FAILURE
  DENIED
}

// ============================================================
// SECRET USAGE TRACKING
// ============================================================

model SecretUsage {
  @@map("secret_usage")
  
  id                    String                @id @default(uuid())
  secretId              String
  secret                Secret                @relation(fields: [secretId], references: [id], onDelete: Cascade)
  
  // Consumer
  consumerModule        String                // e.g., "mcp-server", "llm-model"
  consumerResourceId    String?               // e.g., MCP server ID
  
  // Context
  organizationId        String
  userId                String?
  
  // Usage
  usedAt                DateTime              @default(now())
  
  @@index([secretId, usedAt])
  @@index([consumerModule, usedAt])
}
```

---

## 4. Secret Types

### 4.1 Type Definitions

```typescript
// Base secret value interface
interface SecretValue {
  type: SecretType;
}

// API Key (simple string)
interface ApiKeySecret extends SecretValue {
  type: 'API_KEY';
  key: string;
}

// OAuth2 Token
interface OAuth2TokenSecret extends SecretValue {
  type: 'OAUTH2_TOKEN';
  accessToken: string;
  refreshToken?: string;
  tokenType: string;           // e.g., "Bearer"
  expiresAt?: Date;
  scope?: string;
}

// Username/Password
interface UsernamePasswordSecret extends SecretValue {
  type: 'USERNAME_PASSWORD';
  username: string;
  password: string;
}

// Certificate
interface CertificateSecret extends SecretValue {
  type: 'CERTIFICATE';
  certificate: string;         // PEM-encoded certificate
  privateKey?: string;         // PEM-encoded private key
  chain?: string[];            // Certificate chain
  passphrase?: string;
  expiresAt?: Date;
}

// SSH Key
interface SshKeySecret extends SecretValue {
  type: 'SSH_KEY';
  privateKey: string;
  publicKey?: string;
  passphrase?: string;
  keyType: 'rsa' | 'ed25519' | 'ecdsa';
}

// Connection String
interface ConnectionStringSecret extends SecretValue {
  type: 'CONNECTION_STRING';
  connectionString: string;
  // Optionally parsed components
  parsed?: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    // password NOT stored separately - use connection string
  };
}

// JSON Credential (e.g., GCP service account)
interface JsonCredentialSecret extends SecretValue {
  type: 'JSON_CREDENTIAL';
  credential: Record<string, unknown>;
}

// Environment Variable Set
interface EnvVariableSetSecret extends SecretValue {
  type: 'ENV_VARIABLE_SET';
  variables: Record<string, string>;
}

// Generic Secret
interface GenericSecret extends SecretValue {
  type: 'GENERIC';
  value: string;
}

// Union type
type AnySecretValue =
  | ApiKeySecret
  | OAuth2TokenSecret
  | UsernamePasswordSecret
  | CertificateSecret
  | SshKeySecret
  | ConnectionStringSecret
  | JsonCredentialSecret
  | EnvVariableSetSecret
  | GenericSecret;
```

### 4.2 Type-Specific Validation

```typescript
interface SecretTypeConfig {
  type: SecretType;
  displayName: string;
  description: string;
  icon: string;
  
  // Validation
  validate: (value: unknown) => ValidationResult;
  
  // Masking rules
  maskValue: (value: unknown) => string;
  
  // Expiration support
  supportsExpiration: boolean;
  defaultExpirationDays?: number;
  
  // Rotation support
  supportsRotation: boolean;
  defaultRotationDays?: number;
}

const secretTypeConfigs: Record<SecretType, SecretTypeConfig> = {
  API_KEY: {
    type: 'API_KEY',
    displayName: 'API Key',
    description: 'Simple string API key',
    icon: 'key',
    validate: (value) => validateApiKey(value),
    maskValue: (value) => maskString(value.key, 4),  // Show last 4 chars
    supportsExpiration: true,
    supportsRotation: true,
    defaultRotationDays: 90
  },
  OAUTH2_TOKEN: {
    type: 'OAUTH2_TOKEN',
    displayName: 'OAuth2 Token',
    description: 'OAuth2 access and refresh tokens',
    icon: 'shield',
    validate: (value) => validateOAuth2Token(value),
    maskValue: (value) => '••••••••',
    supportsExpiration: true,
    supportsRotation: true
  },
  CERTIFICATE: {
    type: 'CERTIFICATE',
    displayName: 'Certificate',
    description: 'TLS/SSL certificate with optional private key',
    icon: 'certificate',
    validate: (value) => validateCertificate(value),
    maskValue: (value) => `Certificate: ${extractCertSubject(value)}`,
    supportsExpiration: true,  // Certs have built-in expiration
    supportsRotation: true,
    defaultRotationDays: 365
  },
  // ... other types
};
```

---

## 5. Storage Backends

### 5.1 Backend Interface

```typescript
interface SecretStorageBackend {
  // Backend identification
  readonly type: StorageBackend;
  readonly name: string;
  
  // Lifecycle
  initialize(config: BackendConfig): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  
  // CRUD Operations
  storeSecret(params: StoreSecretParams): Promise<StoreSecretResult>;
  retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult>;
  updateSecret(params: UpdateSecretParams): Promise<UpdateSecretResult>;
  deleteSecret(params: DeleteSecretParams): Promise<void>;
  
  // Versioning
  listVersions(secretRef: string): Promise<SecretVersionInfo[]>;
  retrieveVersion(secretRef: string, version: number): Promise<RetrieveSecretResult>;
  
  // Listing (metadata only)
  listSecrets(params: ListSecretsParams): Promise<SecretMetadata[]>;
}

interface StoreSecretParams {
  name: string;
  value: AnySecretValue;
  metadata?: Record<string, string>;
  expiresAt?: Date;
}

interface StoreSecretResult {
  secretRef: string;           // Backend-specific reference
  version: number;
}

interface RetrieveSecretResult {
  value: AnySecretValue;
  version: number;
  metadata?: Record<string, string>;
  createdAt: Date;
  expiresAt?: Date;
}
```

### 5.2 Local Encrypted Backend

```typescript
class LocalEncryptedBackend implements SecretStorageBackend {
  readonly type = StorageBackend.LOCAL_ENCRYPTED;
  readonly name = 'Local Encrypted Storage';
  
  private encryptionService: EncryptionService;
  private keyManager: KeyManager;
  
  async storeSecret(params: StoreSecretParams): Promise<StoreSecretResult> {
    // 1. Get current encryption key
    const encryptionKey = await this.keyManager.getCurrentKey();
    
    // 2. Serialize and encrypt
    const serialized = JSON.stringify(params.value);
    const encrypted = await this.encryptionService.encrypt(
      serialized,
      encryptionKey
    );
    
    // 3. Store in database
    const secret = await prisma.secret.create({
      data: {
        name: params.name,
        encryptedValue: encrypted.ciphertext,
        encryptionKeyId: encryptionKey.id,
        // ... other fields
      }
    });
    
    return {
      secretRef: secret.id,
      version: 1
    };
  }
  
  async retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult> {
    // 1. Get secret record
    const secret = await prisma.secret.findUnique({
      where: { id: params.secretRef }
    });
    
    // 2. Get encryption key
    const encryptionKey = await this.keyManager.getKey(secret.encryptionKeyId);
    
    // 3. Decrypt
    const decrypted = await this.encryptionService.decrypt(
      secret.encryptedValue,
      encryptionKey
    );
    
    // 4. Parse and return
    return {
      value: JSON.parse(decrypted),
      version: secret.currentVersion,
      createdAt: secret.createdAt,
      expiresAt: secret.expiresAt
    };
  }
}
```

### 5.3 Azure Key Vault Backend

```typescript
interface AzureKeyVaultConfig {
  vaultUrl: string;            // e.g., "https://my-vault.vault.azure.net"
  
  // Authentication (one of these)
  authentication:
    | { type: 'managed_identity' }
    | { type: 'service_principal'; tenantId: string; clientId: string; clientSecret: string }
    | { type: 'certificate'; tenantId: string; clientId: string; certificatePath: string };
}

class AzureKeyVaultBackend implements SecretStorageBackend {
  readonly type = StorageBackend.AZURE_KEY_VAULT;
  readonly name = 'Azure Key Vault';
  
  private client: SecretClient;
  
  async initialize(config: AzureKeyVaultConfig): Promise<void> {
    const credential = this.createCredential(config.authentication);
    this.client = new SecretClient(config.vaultUrl, credential);
  }
  
  async storeSecret(params: StoreSecretParams): Promise<StoreSecretResult> {
    // Azure Key Vault stores strings, so serialize complex types
    const serialized = JSON.stringify(params.value);
    
    const result = await this.client.setSecret(
      this.normalizeName(params.name),
      serialized,
      {
        expiresOn: params.expiresAt,
        tags: params.metadata
      }
    );
    
    return {
      secretRef: result.properties.id,
      version: parseInt(result.properties.version)
    };
  }
  
  async retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult> {
    const secret = await this.client.getSecret(params.secretRef);
    
    return {
      value: JSON.parse(secret.value),
      version: parseInt(secret.properties.version),
      createdAt: secret.properties.createdOn,
      expiresAt: secret.properties.expiresOn
    };
  }
  
  private normalizeName(name: string): string {
    // Azure Key Vault secret names: alphanumeric and hyphens only
    return name.replace(/[^a-zA-Z0-9-]/g, '-');
  }
}
```

### 5.4 AWS Secrets Manager Backend

```typescript
interface AWSSecretsConfig {
  region: string;
  
  // Authentication
  authentication:
    | { type: 'iam_role' }
    | { type: 'access_key'; accessKeyId: string; secretAccessKey: string };
  
  // Optional KMS key for encryption
  kmsKeyId?: string;
}

class AWSSecretsBackend implements SecretStorageBackend {
  readonly type = StorageBackend.AWS_SECRETS_MANAGER;
  readonly name = 'AWS Secrets Manager';
  
  private client: SecretsManagerClient;
  
  // Implementation similar to Azure...
}
```

### 5.5 HashiCorp Vault Backend

```typescript
interface HashiCorpVaultConfig {
  address: string;             // e.g., "https://vault.example.com:8200"
  namespace?: string;
  
  // Authentication
  authentication:
    | { type: 'token'; token: string }
    | { type: 'approle'; roleId: string; secretId: string }
    | { type: 'kubernetes'; role: string; jwt?: string };
  
  // Secret engine
  secretEngine: string;        // e.g., "secret" (KV v2)
  secretEnginePath: string;    // e.g., "data"
}

class HashiCorpVaultBackend implements SecretStorageBackend {
  readonly type = StorageBackend.HASHICORP_VAULT;
  readonly name = 'HashiCorp Vault';
  
  // Implementation...
}
```

### 5.6 GCP Secret Manager Backend

```typescript
interface GCPSecretConfig {
  projectId: string;
  
  // Authentication
  authentication:
    | { type: 'default_credentials' }
    | { type: 'service_account'; keyFilePath: string }
    | { type: 'service_account_json'; credentials: object };
}

class GCPSecretBackend implements SecretStorageBackend {
  readonly type = StorageBackend.GCP_SECRET_MANAGER;
  readonly name = 'GCP Secret Manager';
  
  // Implementation...
}
```

### 5.7 Backend Selection Matrix

| Feature | Local | Azure KV | AWS SM | HashiCorp | GCP SM |
|---------|-------|----------|--------|-----------|--------|
| **Setup Complexity** | Low | Medium | Medium | High | Medium |
| **Cost** | Free | Pay-per-use | Pay-per-use | License | Pay-per-use |
| **Versioning** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auto-Rotation** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Audit Logs** | App-level | Built-in | Built-in | Built-in | Built-in |
| **HSM Support** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Multi-Region** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Recommended For** | Dev/Small | Enterprise | Enterprise | Enterprise | Enterprise |

---

## 6. Scoping & Ownership

### 6.1 Scope Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         GLOBAL                                   │
│  Owner: Super Admin                                             │
│  Visibility: All organizations                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    ORGANIZATION                            │ │
│  │  Owner: Organization Admin                                 │ │
│  │  Visibility: All teams/projects in organization           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │                      TEAM                            │ │ │
│  │  │  Owner: Team Lead                                    │ │ │
│  │  │  Visibility: All team members & team projects        │ │ │
│  │  │  ┌─────────────────────────────────────────────┐   │ │ │
│  │  │  │                  PROJECT                     │   │ │ │
│  │  │  │  Owner: Project Admin                        │   │ │ │
│  │  │  │  Visibility: Project members only            │   │ │ │
│  │  │  └─────────────────────────────────────────────┘   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │                      USER                            │ │ │
│  │  │  Owner: Individual User                              │ │ │
│  │  │  Visibility: User only                               │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Scope Resolution

```typescript
interface ScopeContext {
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  userId: string;
}

class ScopeResolver {
  /**
   * Get all secrets accessible in the given context
   * Secrets from higher scopes are included
   */
  async getAccessibleSecrets(context: ScopeContext): Promise<Secret[]> {
    const scopes: SecretScope[] = [];
    const conditions: Prisma.SecretWhereInput[] = [];
    
    // Global secrets (always accessible if user has permission)
    conditions.push({ scope: 'GLOBAL' });
    
    // Organization secrets
    if (context.organizationId) {
      conditions.push({
        scope: 'ORGANIZATION',
        organizationId: context.organizationId
      });
    }
    
    // Team secrets
    if (context.teamId) {
      conditions.push({
        scope: 'TEAM',
        teamId: context.teamId
      });
    }
    
    // Project secrets
    if (context.projectId) {
      conditions.push({
        scope: 'PROJECT',
        projectId: context.projectId
      });
    }
    
    // User's personal secrets
    conditions.push({
      scope: 'USER',
      userId: context.userId
    });
    
    return prisma.secret.findMany({
      where: {
        OR: conditions,
        deletedAt: null
      }
    });
  }
  
  /**
   * Check if a user can create secrets at a given scope
   */
  canCreateAtScope(user: User, scope: SecretScope, context: ScopeContext): boolean {
    switch (scope) {
      case 'GLOBAL':
        return user.isSuperAdmin;
      case 'ORGANIZATION':
        return this.isOrgAdmin(user, context.organizationId);
      case 'TEAM':
        return this.isTeamLead(user, context.teamId);
      case 'PROJECT':
        return this.isProjectAdmin(user, context.projectId);
      case 'USER':
        return true;  // Users can always create personal secrets
      default:
        return false;
    }
  }
}
```

---

## 7. Access Control

### 7.1 Permission Matrix

| Action | Global | Organization | Team | Project | User |
|--------|--------|--------------|------|---------|------|
| **Create** | Super Admin | Org Admin | Team Lead | Project Admin | Owner |
| **Read Value** | Super Admin | Org Admin | Team Lead + Granted | Project Admin + Granted | Owner |
| **Update** | Super Admin | Org Admin | Team Lead | Project Admin | Owner |
| **Delete** | Super Admin | Org Admin | Team Lead | Project Admin | Owner |
| **View Metadata** | Super Admin | Org Admin + Members | Team Members | Project Members | Owner |
| **Grant Access** | Super Admin | Org Admin | Team Lead | Project Admin | Owner |

### 7.2 Access Control Implementation

```typescript
class SecretAccessController {
  /**
   * Check if user can perform action on secret
   */
  async checkAccess(
    user: User,
    secretId: string,
    action: SecretAction
  ): Promise<AccessCheckResult> {
    const secret = await prisma.secret.findUnique({
      where: { id: secretId },
      include: { accessGrants: true }
    });
    
    if (!secret) {
      return { allowed: false, reason: 'Secret not found' };
    }
    
    // 1. Check if user is owner based on scope
    if (this.isOwner(user, secret)) {
      return { allowed: true };
    }
    
    // 2. Check explicit access grants
    const grant = this.findApplicableGrant(user, secret.accessGrants);
    if (grant) {
      const hasPermission = this.grantAllowsAction(grant, action);
      return {
        allowed: hasPermission,
        reason: hasPermission ? undefined : 'Grant does not allow this action'
      };
    }
    
    // 3. Check role-based access
    if (this.hasRoleBasedAccess(user, secret, action)) {
      return { allowed: true };
    }
    
    return { allowed: false, reason: 'No access to this secret' };
  }
  
  private isOwner(user: User, secret: Secret): boolean {
    switch (secret.scope) {
      case 'GLOBAL':
        return user.isSuperAdmin;
      case 'ORGANIZATION':
        return this.isOrgAdmin(user, secret.organizationId);
      case 'TEAM':
        return this.isTeamLead(user, secret.teamId);
      case 'PROJECT':
        return this.isProjectAdmin(user, secret.projectId);
      case 'USER':
        return secret.userId === user.id;
      default:
        return false;
    }
  }
  
  private grantAllowsAction(grant: SecretAccessGrant, action: SecretAction): boolean {
    switch (action) {
      case 'READ':
        return grant.canRead;
      case 'UPDATE':
        return grant.canUpdate;
      case 'DELETE':
        return grant.canDelete;
      case 'GRANT':
        return grant.canGrant;
      default:
        return false;
    }
  }
}

type SecretAction = 'READ' | 'UPDATE' | 'DELETE' | 'GRANT' | 'VIEW_METADATA';

interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}
```

### 7.3 Access Grant API

```typescript
interface GrantAccessParams {
  secretId: string;
  granteeType: 'USER' | 'TEAM' | 'ROLE';
  granteeId: string;
  permissions: {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canGrant: boolean;
  };
  expiresAt?: Date;
}

class SecretService {
  async grantAccess(
    granterId: string,
    params: GrantAccessParams
  ): Promise<SecretAccessGrant> {
    // 1. Verify granter has GRANT permission
    const canGrant = await this.accessController.checkAccess(
      await this.getUser(granterId),
      params.secretId,
      'GRANT'
    );
    
    if (!canGrant.allowed) {
      throw new ForbiddenError('You cannot grant access to this secret');
    }
    
    // 2. Create grant
    const grant = await prisma.secretAccessGrant.create({
      data: {
        secretId: params.secretId,
        granteeType: params.granteeType,
        userId: params.granteeType === 'USER' ? params.granteeId : null,
        teamId: params.granteeType === 'TEAM' ? params.granteeId : null,
        roleId: params.granteeType === 'ROLE' ? params.granteeId : null,
        ...params.permissions,
        expiresAt: params.expiresAt,
        grantedById: granterId
      }
    });
    
    // 3. Audit log
    await this.auditLogger.log({
      eventType: 'ACCESS_GRANTED',
      actorId: granterId,
      secretId: params.secretId,
      details: {
        granteeType: params.granteeType,
        granteeId: params.granteeId,
        permissions: params.permissions
      }
    });
    
    return grant;
  }
}
```

