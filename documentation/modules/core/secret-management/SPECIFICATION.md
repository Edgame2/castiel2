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

The Secret Management Module provides a **centralized, secure, and auditable** system for storing, managing, and accessing sensitive credentials across the Castiel platform. It serves as the single source of truth for all secrets used by other modules.

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

> **Shared Database**: All Secret Management data resides in the shared Cosmos DB NoSQL database alongside other module containers. The `secret` container stores all secret management-related documents.
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

# Secret Management Module Specification - Part 2

**Continued from Part 1**

---

## Table of Contents (Part 2)

8. [Lifecycle Management](#8-lifecycle-management)
9. [Integration Pattern](#9-integration-pattern)
10. [Audit & Compliance](#10-audit--compliance)
11. [Import/Export & Migration](#11-importexport--migration)
12. [API Endpoints](#12-api-endpoints)
13. [UI Views](#13-ui-views)
14. [Encryption & Security](#14-encryption--security)
15. [Implementation Guidelines](#15-implementation-guidelines)

---

## 8. Lifecycle Management

### 8.1 Expiration Management

```typescript
interface ExpirationConfig {
  enabled: boolean;
  expiresAt: Date;
  
  // Notifications
  notifyBeforeDays: number[];  // e.g., [30, 14, 7, 1]
  notificationRecipients: string[];  // User IDs or email addresses
}

class LifecycleManager {
  /**
   * Check for expiring secrets and send notifications
   * Run as scheduled job
   */
  async checkExpirations(): Promise<void> {
    const now = new Date();
    
    // Find secrets expiring within notification windows
    for (const days of [30, 14, 7, 1]) {
      const threshold = addDays(now, days);
      
      const expiringSecrets = await prisma.secret.findMany({
        where: {
          expiresAt: {
            gte: now,
            lte: threshold
          },
          deletedAt: null
        },
        include: {
          createdBy: true,
          organization: true
        }
      });
      
      for (const secret of expiringSecrets) {
        await this.sendExpirationNotification(secret, days);
        
        await this.auditLogger.log({
          eventType: 'SECRET_EXPIRING_SOON',
          secretId: secret.id,
          details: { daysUntilExpiration: days }
        });
      }
    }
    
    // Mark expired secrets
    await prisma.secret.updateMany({
      where: {
        expiresAt: { lt: now },
        deletedAt: null
      },
      data: {
        // Could add an 'expired' status field
      }
    });
  }
}
```

### 8.2 Automatic Rotation

```typescript
interface RotationConfig {
  enabled: boolean;
  intervalDays: number;
  
  // Rotation strategy
  strategy: RotationStrategy;
  
  // For automatic rotation
  rotationHandler?: string;  // Reference to rotation handler
}

type RotationStrategy = 
  | 'MANUAL'              // User must rotate manually
  | 'NOTIFY_ONLY'         // Notify when rotation due, user rotates
  | 'AUTOMATIC';          // Automatic rotation via handler

interface RotationHandler {
  // Called to generate new secret value
  rotate(currentValue: AnySecretValue): Promise<AnySecretValue>;
  
  // Called after rotation to update external systems
  postRotate?(newValue: AnySecretValue, oldValue: AnySecretValue): Promise<void>;
}

class RotationScheduler {
  /**
   * Check for secrets needing rotation
   * Run as scheduled job
   */
  async checkRotations(): Promise<void> {
    const now = new Date();
    
    const secretsNeedingRotation = await prisma.secret.findMany({
      where: {
        rotationEnabled: true,
        nextRotationAt: { lte: now },
        deletedAt: null
      }
    });
    
    for (const secret of secretsNeedingRotation) {
      try {
        if (secret.rotationStrategy === 'AUTOMATIC') {
          await this.performAutomaticRotation(secret);
        } else {
          await this.sendRotationReminder(secret);
        }
      } catch (error) {
        await this.handleRotationError(secret, error);
      }
    }
  }
  
  async rotateSecret(secretId: string, newValue: AnySecretValue): Promise<void> {
    const secret = await prisma.secret.findUnique({
      where: { id: secretId }
    });
    
    // 1. Create new version
    const newVersion = secret.currentVersion + 1;
    
    await prisma.$transaction(async (tx) => {
      // Store new version
      await tx.secretVersion.create({
        data: {
          secretId: secret.id,
          version: newVersion,
          encryptedValue: await this.encrypt(newValue),
          changeReason: 'Rotation'
        }
      });
      
      // Update secret
      await tx.secret.update({
        where: { id: secretId },
        data: {
          currentVersion: newVersion,
          lastRotatedAt: new Date(),
          nextRotationAt: addDays(new Date(), secret.rotationIntervalDays)
        }
      });
      
      // Mark old version as inactive (after grace period)
      // This allows existing sessions to continue working briefly
    });
    
    // Audit
    await this.auditLogger.log({
      eventType: 'SECRET_ROTATED',
      secretId,
      details: { newVersion }
    });
  }
}
```

### 8.3 Version Management

```typescript
class VersionManager {
  /**
   * Get version history for a secret
   */
  async getVersionHistory(secretId: string): Promise<SecretVersionInfo[]> {
    const versions = await prisma.secretVersion.findMany({
      where: { secretId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isActive: true,
        changeReason: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });
    
    return versions.map(v => ({
      version: v.version,
      isActive: v.isActive,
      changeReason: v.changeReason,
      createdAt: v.createdAt,
      createdBy: v.createdBy
    }));
  }
  
  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(secretId: string, version: number): Promise<void> {
    const targetVersion = await prisma.secretVersion.findUnique({
      where: {
        secretId_version: { secretId, version }
      }
    });
    
    if (!targetVersion) {
      throw new NotFoundError(`Version ${version} not found`);
    }
    
    // Create new version with rolled-back value
    const currentSecret = await prisma.secret.findUnique({
      where: { id: secretId }
    });
    
    const newVersion = currentSecret.currentVersion + 1;
    
    await prisma.$transaction([
      prisma.secretVersion.create({
        data: {
          secretId,
          version: newVersion,
          encryptedValue: targetVersion.encryptedValue,
          encryptionKeyId: targetVersion.encryptionKeyId,
          changeReason: `Rollback to version ${version}`
        }
      }),
      prisma.secret.update({
        where: { id: secretId },
        data: { currentVersion: newVersion }
      })
    ]);
  }
  
  /**
   * Get retention policy - how many versions to keep
   */
  async cleanupOldVersions(secretId: string, keepVersions: number = 10): Promise<void> {
    const versions = await prisma.secretVersion.findMany({
      where: { secretId },
      orderBy: { version: 'desc' },
      skip: keepVersions
    });
    
    // Permanently delete old versions
    for (const version of versions) {
      await prisma.secretVersion.delete({
        where: { id: version.id }
      });
    }
  }
}
```

### 8.4 Soft Delete & Recovery

```typescript
class SoftDeleteManager {
  private readonly RECOVERY_PERIOD_DAYS = 30;
  
  /**
   * Soft delete a secret
   */
  async softDelete(secretId: string, userId: string): Promise<void> {
    const recoveryDeadline = addDays(new Date(), this.RECOVERY_PERIOD_DAYS);
    
    await prisma.secret.update({
      where: { id: secretId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
        recoveryDeadline
      }
    });
    
    await this.auditLogger.log({
      eventType: 'SECRET_DELETED',
      secretId,
      actorId: userId,
      details: { recoveryDeadline }
    });
  }
  
  /**
   * Recover a soft-deleted secret
   */
  async recover(secretId: string, userId: string): Promise<void> {
    const secret = await prisma.secret.findUnique({
      where: { id: secretId }
    });
    
    if (!secret.deletedAt) {
      throw new BadRequestError('Secret is not deleted');
    }
    
    if (new Date() > secret.recoveryDeadline) {
      throw new BadRequestError('Recovery period has expired');
    }
    
    await prisma.secret.update({
      where: { id: secretId },
      data: {
        deletedAt: null,
        deletedById: null,
        recoveryDeadline: null
      }
    });
    
    await this.auditLogger.log({
      eventType: 'SECRET_RESTORED',
      secretId,
      actorId: userId
    });
  }
  
  /**
   * Permanently delete expired secrets
   * Run as scheduled job
   */
  async purgeExpiredSecrets(): Promise<void> {
    const expiredSecrets = await prisma.secret.findMany({
      where: {
        deletedAt: { not: null },
        recoveryDeadline: { lt: new Date() }
      }
    });
    
    for (const secret of expiredSecrets) {
      // Delete all versions
      await prisma.secretVersion.deleteMany({
        where: { secretId: secret.id }
      });
      
      // Delete the secret
      await prisma.secret.delete({
        where: { id: secret.id }
      });
      
      await this.auditLogger.log({
        eventType: 'SECRET_PERMANENTLY_DELETED',
        secretId: secret.id,
        actorId: 'SYSTEM'
      });
    }
  }
}
```

---

## 9. Integration Pattern

### 9.1 Secret Service API (Recommended Pattern)

```typescript
/**
 * SecretService - Main API for modules to consume secrets
 * 
 * BEST PRACTICES:
 * 1. Always use SecretService to retrieve secrets - never access storage directly
 * 2. Don't cache secret values in your module - use SecretService caching
 * 3. Use secret references (IDs) in configuration, resolve at runtime
 * 4. Handle SecretNotFoundError and SecretExpiredError gracefully
 * 5. Log secret usage through the provided tracking mechanism
 */
interface ISecretService {
  // ============================================================
  // SECRET RETRIEVAL
  // ============================================================
  
  /**
   * Get a secret value by ID
   * @param secretId - The secret's unique identifier
   * @param context - Execution context for access control
   * @returns Decrypted secret value
   * @throws SecretNotFoundError, AccessDeniedError, SecretExpiredError
   */
  getSecret(secretId: string, context: SecretContext): Promise<AnySecretValue>;
  
  /**
   * Get multiple secrets at once (batch operation)
   * More efficient than multiple getSecret calls
   */
  getSecrets(secretIds: string[], context: SecretContext): Promise<Map<string, AnySecretValue>>;
  
  /**
   * Get a secret, returning null if not found (no exception)
   */
  getSecretOrNull(secretId: string, context: SecretContext): Promise<AnySecretValue | null>;
  
  // ============================================================
  // SECRET DISCOVERY
  // ============================================================
  
  /**
   * List accessible secrets (metadata only, no values)
   */
  listSecrets(params: ListSecretsParams, context: SecretContext): Promise<SecretMetadata[]>;
  
  /**
   * Find secrets by criteria
   */
  findSecrets(criteria: SecretSearchCriteria, context: SecretContext): Promise<SecretMetadata[]>;
  
  // ============================================================
  // SECRET MANAGEMENT (Admin operations)
  // ============================================================
  
  createSecret(params: CreateSecretParams, context: SecretContext): Promise<Secret>;
  updateSecret(secretId: string, params: UpdateSecretParams, context: SecretContext): Promise<Secret>;
  deleteSecret(secretId: string, context: SecretContext): Promise<void>;
  rotateSecret(secretId: string, newValue: AnySecretValue, context: SecretContext): Promise<void>;
  
  // ============================================================
  // ACCESS MANAGEMENT
  // ============================================================
  
  grantAccess(params: GrantAccessParams, context: SecretContext): Promise<SecretAccessGrant>;
  revokeAccess(grantId: string, context: SecretContext): Promise<void>;
  listAccessGrants(secretId: string, context: SecretContext): Promise<SecretAccessGrant[]>;
}

interface SecretContext {
  userId: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  
  // Consumer identification (for tracking)
  consumerModule: string;       // e.g., "mcp-server", "llm-model"
  consumerResourceId?: string;  // e.g., specific MCP server ID
}
```

### 9.2 Consumer Module Integration Example

```typescript
// Example: MCP Server Module using Secret Management

class MCPServerService {
  constructor(private secretService: ISecretService) {}
  
  async executeToolWithAuth(
    serverId: string,
    toolName: string,
    params: Record<string, unknown>,
    executionContext: ExecutionContext
  ): Promise<ToolResult> {
    // 1. Get server configuration
    const server = await this.getServer(serverId);
    
    // 2. Resolve authentication secret (if configured)
    let authCredentials: AuthCredentials | undefined;
    
    if (server.authSecretId) {
      const secretContext: SecretContext = {
        userId: executionContext.userId,
        organizationId: executionContext.organizationId,
        consumerModule: 'mcp-server',
        consumerResourceId: serverId
      };
      
      try {
        const secretValue = await this.secretService.getSecret(
          server.authSecretId,
          secretContext
        );
        
        authCredentials = this.parseAuthCredentials(secretValue);
      } catch (error) {
        if (error instanceof SecretNotFoundError) {
          throw new MCPError('Authentication secret not found', 'AUTH_SECRET_MISSING');
        }
        if (error instanceof SecretExpiredError) {
          throw new MCPError('Authentication secret has expired', 'AUTH_SECRET_EXPIRED');
        }
        throw error;
      }
    }
    
    // 3. Execute tool with credentials
    return this.transport.executeTool(server, toolName, params, authCredentials);
  }
}

// Example: LLM Model Integration

class LLMModelService {
  constructor(private secretService: ISecretService) {}
  
  async getModelClient(
    modelConfig: LLMModelConfig,
    context: ExecutionContext
  ): Promise<LLMClient> {
    const secretContext: SecretContext = {
      userId: context.userId,
      organizationId: context.organizationId,
      consumerModule: 'llm-model',
      consumerResourceId: modelConfig.id
    };
    
    // Get API key from Secret Management
    const apiKeySecret = await this.secretService.getSecret(
      modelConfig.apiKeySecretId,
      secretContext
    ) as ApiKeySecret;
    
    // Create client with resolved API key
    return new OpenAIClient({
      apiKey: apiKeySecret.key,
      baseUrl: modelConfig.baseUrl
    });
  }
}
```

### 9.3 Secret Reference Pattern

```typescript
/**
 * Instead of storing secret values in configuration,
 * store references that are resolved at runtime
 */
interface SecretReference {
  type: 'SECRET_REF';
  secretId: string;
}

// Example: MCP Server configuration with secret reference
interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  
  // Instead of storing the API key directly:
  // apiKey: string;  // ❌ Don't do this
  
  // Store a reference to the secret:
  authSecretId?: string;  // ✅ Reference to Secret Management
}

// Example: Environment configuration with secret references
interface EnvironmentConfig {
  id: string;
  name: string;
  variables: Record<string, string | SecretReference>;
}

// Resolution at runtime
class ConfigResolver {
  constructor(private secretService: ISecretService) {}
  
  async resolveConfig(
    config: EnvironmentConfig,
    context: SecretContext
  ): Promise<Record<string, string>> {
    const resolved: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(config.variables)) {
      if (typeof value === 'string') {
        resolved[key] = value;
      } else if (value.type === 'SECRET_REF') {
        const secret = await this.secretService.getSecret(
          value.secretId,
          context
        );
        resolved[key] = this.extractValue(secret);
      }
    }
    
    return resolved;
  }
}
```

### 9.4 Caching Strategy

```typescript
interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;           // Time-to-live
  maxSize: number;              // Max cached secrets
  refreshAhead: boolean;        // Refresh before expiry
  refreshAheadPercent: number;  // e.g., 75 = refresh at 75% of TTL
}

class SecretCache {
  private cache: LRUCache<string, CachedSecret>;
  
  constructor(private config: CacheConfig) {
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttlSeconds * 1000
    });
  }
  
  async getOrFetch(
    secretId: string,
    fetcher: () => Promise<AnySecretValue>
  ): Promise<AnySecretValue> {
    const cached = this.cache.get(secretId);
    
    if (cached) {
      // Check if we should refresh ahead
      if (this.config.refreshAhead && this.shouldRefreshAhead(cached)) {
        // Refresh in background, return cached value
        this.refreshInBackground(secretId, fetcher);
      }
      return cached.value;
    }
    
    // Fetch and cache
    const value = await fetcher();
    this.cache.set(secretId, {
      value,
      fetchedAt: Date.now()
    });
    
    return value;
  }
  
  invalidate(secretId: string): void {
    this.cache.delete(secretId);
  }
  
  invalidateAll(): void {
    this.cache.clear();
  }
}
```

---

## 10. Audit & Compliance

### 10.1 Audit Logging Implementation

```typescript
class SecretAuditLogger {
  /**
   * Log a secret operation
   * Secret values are NEVER logged
   */
  async log(params: AuditLogParams): Promise<void> {
    // Sanitize details to ensure no secret values
    const sanitizedDetails = this.sanitizeDetails(params.details);
    
    await prisma.secretAuditLog.create({
      data: {
        eventType: params.eventType,
        eventCategory: this.categorizeEvent(params.eventType),
        actorType: params.actorType || 'USER',
        actorId: params.actorId,
        actorName: params.actorName,
        organizationId: params.organizationId,
        teamId: params.teamId,
        projectId: params.projectId,
        secretId: params.secretId,
        secretName: params.secretName,
        secretScope: params.secretScope,
        action: params.action || params.eventType,
        details: sanitizedDetails,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
        outcome: params.outcome || 'SUCCESS',
        errorMessage: params.errorMessage
      }
    });
  }
  
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(details || {})) {
      // Never log these fields
      const sensitiveFields = ['value', 'password', 'secret', 'key', 'token', 'credential'];
      
      if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

interface AuditLogParams {
  eventType: SecretAuditEventType;
  actorType?: ActorType;
  actorId: string;
  actorName?: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  secretId?: string;
  secretName?: string;
  secretScope?: SecretScope;
  action?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  outcome?: AuditOutcome;
  errorMessage?: string;
}
```

### 10.2 Compliance Reports

```typescript
interface ComplianceReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  
  // Summary
  summary: {
    totalSecrets: number;
    activeSecrets: number;
    expiredSecrets: number;
    expiringWithin30Days: number;
    rotationsDue: number;
    deletedSecrets: number;
  };
  
  // Access report
  accessReport: {
    totalAccesses: number;
    uniqueUsers: number;
    accessesByScope: Record<SecretScope, number>;
    accessesByModule: Record<string, number>;
    deniedAccesses: number;
  };
  
  // Security findings
  findings: ComplianceFinding[];
}

interface ComplianceFinding {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  description: string;
  affectedSecrets: string[];
  recommendation: string;
}

class ComplianceReporter {
  async generateReport(
    organizationId: string,
    period: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    // Gather data
    const secrets = await this.getSecretStats(organizationId, period);
    const accessLogs = await this.getAccessStats(organizationId, period);
    const findings = await this.analyzeCompliance(organizationId, period);
    
    return {
      generatedAt: new Date(),
      period,
      summary: secrets,
      accessReport: accessLogs,
      findings
    };
  }
  
  private async analyzeCompliance(
    organizationId: string,
    period: { start: Date; end: Date }
  ): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Check for secrets without expiration
    const noExpiration = await prisma.secret.findMany({
      where: {
        organizationId,
        expiresAt: null,
        deletedAt: null
      }
    });
    
    if (noExpiration.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        category: 'Lifecycle',
        description: `${noExpiration.length} secrets have no expiration date set`,
        affectedSecrets: noExpiration.map(s => s.id),
        recommendation: 'Set expiration dates for all secrets per security policy'
      });
    }
    
    // Check for secrets not rotated in 90+ days
    const staleSecrets = await prisma.secret.findMany({
      where: {
        organizationId,
        rotationEnabled: true,
        lastRotatedAt: { lt: subDays(new Date(), 90) },
        deletedAt: null
      }
    });
    
    if (staleSecrets.length > 0) {
      findings.push({
        severity: 'HIGH',
        category: 'Rotation',
        description: `${staleSecrets.length} secrets have not been rotated in 90+ days`,
        affectedSecrets: staleSecrets.map(s => s.id),
        recommendation: 'Rotate secrets according to rotation policy'
      });
    }
    
    // More compliance checks...
    
    return findings;
  }
}
```

---

## 11. Import/Export & Migration

### 11.1 Import Service

```typescript
interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

interface ImportError {
  index: number;
  name: string;
  error: string;
}

class ImportService {
  /**
   * Import secrets from .env file content
   */
  async importFromEnvFile(
    content: string,
    options: EnvImportOptions,
    context: SecretContext
  ): Promise<ImportResult> {
    const parsed = this.parseEnvFile(content);
    return this.importSecrets(parsed, options, context);
  }
  
  /**
   * Import secrets from JSON
   */
  async importFromJson(
    data: ImportSecretData[],
    options: ImportOptions,
    context: SecretContext
  ): Promise<ImportResult> {
    const result: ImportResult = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      try {
        // Check if secret exists
        const existing = await this.findExisting(item.name, context);
        
        if (existing && !options.overwrite) {
          result.skipped++;
          continue;
        }
        
        if (existing && options.overwrite) {
          await this.secretService.updateSecret(
            existing.id,
            { value: item.value },
            context
          );
        } else {
          await this.secretService.createSecret({
            name: item.name,
            type: item.type || 'GENERIC',
            value: item.value,
            scope: options.targetScope,
            description: item.description,
            tags: item.tags
          }, context);
        }
        
        result.imported++;
      } catch (error) {
        result.errors.push({
          index: i,
          name: item.name,
          error: error.message
        });
      }
    }
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'SECRETS_IMPORTED',
      actorId: context.userId,
      details: {
        total: result.total,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length
      }
    });
    
    return result;
  }
  
  private parseEnvFile(content: string): ImportSecretData[] {
    const lines = content.split('\n');
    const secrets: ImportSecretData[] = [];
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) continue;
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        secrets.push({
          name: name.trim(),
          value: { type: 'API_KEY', key: value.trim() },
          type: 'API_KEY'
        });
      }
    }
    
    return secrets;
  }
}

interface EnvImportOptions extends ImportOptions {
  prefix?: string;              // Add prefix to names
  stripPrefix?: string;         // Remove prefix from names
}

interface ImportOptions {
  targetScope: SecretScope;
  overwrite: boolean;
  dryRun?: boolean;
}
```

### 11.2 Export Service

```typescript
class ExportService {
  /**
   * Export secrets as JSON (metadata only, values optional)
   */
  async exportToJson(
    params: ExportParams,
    context: SecretContext
  ): Promise<ExportResult> {
    // Only admins can export
    await this.validateExportPermission(context);
    
    const secrets = await this.secretService.listSecrets({
      scope: params.scope,
      organizationId: context.organizationId
    }, context);
    
    const exported: ExportedSecret[] = [];
    
    for (const secret of secrets) {
      const exportedSecret: ExportedSecret = {
        name: secret.name,
        type: secret.type,
        description: secret.description,
        tags: secret.tags,
        scope: secret.scope
      };
      
      // Only include values if explicitly requested and permitted
      if (params.includeValues) {
        const value = await this.secretService.getSecret(secret.id, context);
        exportedSecret.value = value;
      }
      
      exported.push(exportedSecret);
    }
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'SECRETS_EXPORTED',
      actorId: context.userId,
      details: {
        count: exported.length,
        includeValues: params.includeValues
      }
    });
    
    return {
      exportedAt: new Date(),
      secrets: exported
    };
  }
  
  /**
   * Export as .env file format
   */
  async exportToEnvFormat(
    params: ExportParams,
    context: SecretContext
  ): Promise<string> {
    const result = await this.exportToJson(
      { ...params, includeValues: true },
      context
    );
    
    const lines: string[] = [
      `# Exported from Castiel Secret Management`,
      `# Date: ${result.exportedAt.toISOString()}`,
      ''
    ];
    
    for (const secret of result.secrets) {
      if (secret.type === 'API_KEY' && secret.value) {
        lines.push(`${secret.name}=${(secret.value as ApiKeySecret).key}`);
      }
    }
    
    return lines.join('\n');
  }
}
```

### 11.3 Migration Service

```typescript
interface MigrationPlan {
  sourceBackend: StorageBackend;
  targetBackend: StorageBackend;
  secretCount: number;
  estimatedDuration: number;
}

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: MigrationError[];
  duration: number;
}

class MigrationService {
  /**
   * Plan a migration between backends
   */
  async planMigration(
    sourceVaultId: string,
    targetVaultId: string
  ): Promise<MigrationPlan> {
    const sourceVault = await this.getVault(sourceVaultId);
    const targetVault = await this.getVault(targetVaultId);
    
    const secretCount = await prisma.secret.count({
      where: {
        storageBackend: sourceVault.backend,
        deletedAt: null
      }
    });
    
    return {
      sourceBackend: sourceVault.backend,
      targetBackend: targetVault.backend,
      secretCount,
      estimatedDuration: secretCount * 100  // ~100ms per secret
    };
  }
  
  /**
   * Execute migration
   */
  async executeMigration(
    sourceVaultId: string,
    targetVaultId: string,
    options: MigrationOptions
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      failed: 0,
      errors: [],
      duration: 0
    };
    
    const sourceBackend = await this.getBackend(sourceVaultId);
    const targetBackend = await this.getBackend(targetVaultId);
    
    const secrets = await prisma.secret.findMany({
      where: {
        storageBackend: sourceBackend.type,
        deletedAt: null
      }
    });
    
    result.total = secrets.length;
    
    for (const secret of secrets) {
      try {
        // 1. Retrieve from source
        const value = await sourceBackend.retrieveSecret({
          secretRef: secret.vaultSecretId || secret.id
        });
        
        // 2. Store in target
        const targetResult = await targetBackend.storeSecret({
          name: secret.name,
          value: value.value,
          metadata: secret.metadata as Record<string, string>,
          expiresAt: secret.expiresAt
        });
        
        // 3. Update database record
        await prisma.secret.update({
          where: { id: secret.id },
          data: {
            storageBackend: targetBackend.type,
            vaultSecretId: targetResult.secretRef,
            encryptedValue: null  // Clear local encryption if moving to vault
          }
        });
        
        // 4. Optionally delete from source
        if (options.deleteFromSource) {
          await sourceBackend.deleteSecret({
            secretRef: secret.vaultSecretId || secret.id
          });
        }
        
        result.migrated++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          secretId: secret.id,
          secretName: secret.name,
          error: error.message
        });
        
        if (!options.continueOnError) {
          break;
        }
      }
    }
    
    result.duration = Date.now() - startTime;
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'SECRETS_MIGRATED',
      details: result
    });
    
    return result;
  }
}
```

---

## 12. API Endpoints

### 12.1 Secret CRUD Endpoints

```typescript
// ============================================================
// SECRET MANAGEMENT
// ============================================================

// POST /api/secrets
// Create a new secret
interface CreateSecretRequest {
  name: string;
  description?: string;
  type: SecretType;
  value: AnySecretValue;
  scope: SecretScope;
  
  // Scope target (based on scope)
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  
  // Lifecycle
  expiresAt?: string;         // ISO date
  rotationEnabled?: boolean;
  rotationIntervalDays?: number;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, string>;
  
  // Storage preference
  storageBackend?: StorageBackend;
}

// GET /api/secrets
// List secrets (metadata only)
interface ListSecretsParams {
  scope?: SecretScope;
  type?: SecretType;
  tags?: string[];
  search?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

// GET /api/secrets/:id
// Get secret metadata (not value)

// GET /api/secrets/:id/value
// Get secret value (requires READ permission)

// PUT /api/secrets/:id
// Update secret metadata

// PUT /api/secrets/:id/value
// Update secret value (creates new version)
interface UpdateSecretValueRequest {
  value: AnySecretValue;
  changeReason?: string;
}

// DELETE /api/secrets/:id
// Soft delete secret

// POST /api/secrets/:id/restore
// Restore soft-deleted secret

// DELETE /api/secrets/:id/permanent
// Permanently delete secret

// ============================================================
// ROTATION & VERSIONING
// ============================================================

// POST /api/secrets/:id/rotate
// Rotate secret
interface RotateSecretRequest {
  newValue: AnySecretValue;
}

// GET /api/secrets/:id/versions
// Get version history

// GET /api/secrets/:id/versions/:version
// Get specific version value

// POST /api/secrets/:id/rollback
// Rollback to previous version
interface RollbackRequest {
  version: number;
}

// ============================================================
// ACCESS MANAGEMENT
// ============================================================

// GET /api/secrets/:id/access
// List access grants

// POST /api/secrets/:id/access
// Grant access
interface GrantAccessRequest {
  granteeType: 'USER' | 'TEAM' | 'ROLE';
  granteeId: string;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canGrant: boolean;
  expiresAt?: string;
}

// DELETE /api/secrets/:id/access/:grantId
// Revoke access

// ============================================================
// VAULT CONFIGURATION
// ============================================================

// GET /api/vaults
// List vault configurations

// POST /api/vaults
// Configure a vault
interface ConfigureVaultRequest {
  name: string;
  description?: string;
  backend: StorageBackend;
  scope: VaultScope;
  config: VaultConfig;        // Backend-specific config
  isDefault?: boolean;
}

// PUT /api/vaults/:id
// Update vault configuration

// DELETE /api/vaults/:id
// Delete vault configuration

// POST /api/vaults/:id/health
// Check vault health

// ============================================================
// IMPORT/EXPORT
// ============================================================

// POST /api/secrets/import/env
// Import from .env file
interface ImportEnvRequest {
  content: string;            // .env file content
  targetScope: SecretScope;
  overwrite?: boolean;
  prefix?: string;
}

// POST /api/secrets/import/json
// Import from JSON
interface ImportJsonRequest {
  secrets: ImportSecretData[];
  targetScope: SecretScope;
  overwrite?: boolean;
}

// GET /api/secrets/export
// Export secrets
interface ExportParams {
  scope?: SecretScope;
  format: 'json' | 'env';
  includeValues?: boolean;    // Requires admin permission
}

// POST /api/secrets/migrate
// Migrate between backends
interface MigrateRequest {
  sourceVaultId: string;
  targetVaultId: string;
  deleteFromSource?: boolean;
  continueOnError?: boolean;
}

// ============================================================
// AUDIT
// ============================================================

// GET /api/secrets/audit
// List audit logs
interface AuditLogsParams {
  secretId?: string;
  eventType?: SecretAuditEventType[];
  actorId?: string;
  outcome?: AuditOutcome[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// GET /api/secrets/audit/:id
// Get audit log details

// GET /api/secrets/compliance/report
// Generate compliance report
interface ComplianceReportParams {
  startDate: string;
  endDate: string;
  format?: 'json' | 'pdf';
}
```

### 12.2 Endpoint Permission Matrix

| Endpoint | Super Admin | Org Admin | Team Lead | Project Admin | User |
|----------|-------------|-----------|-----------|---------------|------|
| `POST /api/secrets` (Global) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/secrets` (Org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/secrets` (Team) | ✅ | ✅ | ✅ | ❌ | ❌ |
| `POST /api/secrets` (Project) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /api/secrets` (User) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/secrets` | ✅ (all) | ✅ (org) | ✅ (team) | ✅ (proj) | ✅ (user) |
| `GET /api/secrets/:id/value` | ✅ | ✅ | Per grant | Per grant | Per grant |
| `PUT /api/secrets/:id` | ✅ | ✅ (org) | ✅ (team) | ✅ (proj) | ✅ (own) |
| `DELETE /api/secrets/:id` | ✅ | ✅ (org) | ✅ (team) | ✅ (proj) | ✅ (own) |
| `POST /api/vaults` (Global) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/vaults` (Org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/secrets/import/*` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /api/secrets/export` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /api/secrets/audit` | ✅ | ✅ (org) | ❌ | ❌ | ❌ |

---

## 13. UI Views

### 13.1 View Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Secret Management UI                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Super Admin Views                                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │   Global     │  │    Vault     │  │   Platform   │  │  Platform  │ │ │
│  │  │   Secrets    │  │   Config     │  │   Audit      │  │ Compliance │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Org Admin Views                                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │Organization  │  │    Vault     │  │   Import/    │  │   Audit    │ │ │
│  │  │  Secrets     │  │   Config     │  │   Export     │  │    Logs    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     User Views                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐                                   │ │
│  │  │   Personal   │  │  Accessible  │                                   │ │
│  │  │   Secrets    │  │   Secrets    │                                   │ │
│  │  └──────────────┘  └──────────────┘                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Secret Manager View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Secret Management                                         [+ Create Secret] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Scope: [Organization ▼]  Type: [All ▼]  Search: [________________]         │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  🔑 GITHUB_TOKEN                                       API Key          │ │
│ │     GitHub Personal Access Token                                        │ │
│ │     Scope: Organization │ Expires: 2026-03-15 │ Last rotated: 30d ago  │ │
│ │     Tags: [github] [api]                                               │ │
│ │     [View] [Edit] [Rotate] [Delete]                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │  🔐 AZURE_SERVICE_PRINCIPAL                           JSON Credential   │ │
│ │     Azure Service Principal credentials                                 │ │
│ │     Scope: Organization │ Expires: Never │ Last rotated: 90d ago ⚠️    │ │
│ │     Tags: [azure] [cloud]                                              │ │
│ │     [View] [Edit] [Rotate] [Delete]                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │  🗄️ DATABASE_CONNECTION                              Connection String  │ │
│ │     Production database connection                                      │ │
│ │     Scope: Project │ Expires: 2026-06-01                               │ │
│ │     Tags: [database] [production]                                      │ │
│ │     [View] [Edit] [Rotate] [Delete]                                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                              [1] [2] [3] ... [Next →]                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.3 Create Secret Dialog

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Create Secret                                                         [✕]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Name*                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ OPENAI_API_KEY                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Description                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ OpenAI API key for LLM integration                                      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Type*                              Scope*                                   │
│ ┌──────────────────────────┐      ┌──────────────────────────┐             │
│ │ API Key              ▼   │      │ Organization         ▼   │             │
│ └──────────────────────────┘      └──────────────────────────┘             │
│                                                                              │
│ Value*                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ sk-••••••••••••••••••••••••••••••••••                            [👁]  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─ Lifecycle ────────────────────────────────────────────────────────────┐  │
│ │                                                                         │  │
│ │ Expires:  ○ Never  ● On date: [2026-06-01    📅]                       │  │
│ │                                                                         │  │
│ │ Rotation: [✓] Enable automatic rotation reminder                        │  │
│ │           Interval: [90] days                                          │  │
│ │                                                                         │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ Tags                                                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [openai ✕] [llm ✕] [api ✕]  [+ Add tag]                                │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                              [Cancel]  [Create Secret]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.4 Vault Configuration View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Vault Configuration                                      [+ Add Vault]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🏢 Azure Key Vault (Default)                            ✅ Healthy      │ │
│ │    https://acme-prod.vault.azure.net                                    │ │
│ │    Scope: Organization │ Secrets: 45 │ Last check: 2 min ago           │ │
│ │    [Edit] [Test Connection] [Set as Default]                           │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🔒 Local Encrypted Storage                              ✅ Healthy      │ │
│ │    Local development vault                                              │ │
│ │    Scope: Organization │ Secrets: 12                                    │ │
│ │    [Edit] [Migrate to Azure →]                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.5 Component Structure

```
src/renderer/components/secrets/
├── index.ts
├── SecretContext.tsx                # Secret state management
│
├── manager/
│   ├── SecretManager.tsx            # Main secret management view
│   ├── SecretList.tsx               # Secret listing
│   ├── SecretCard.tsx               # Secret card component
│   ├── SecretFilters.tsx            # Filter controls
│   └── SecretSearch.tsx             # Search component
│
├── forms/
│   ├── CreateSecretDialog.tsx       # Create secret modal
│   ├── EditSecretDialog.tsx         # Edit secret modal
│   ├── SecretValueInput.tsx         # Value input with masking
│   ├── SecretTypeSelector.tsx       # Type selection
│   └── ScopeSelector.tsx            # Scope selection
│
├── detail/
│   ├── SecretDetail.tsx             # Secret detail view
│   ├── SecretMetadata.tsx           # Metadata display
│   ├── SecretVersionHistory.tsx     # Version history
│   └── SecretAccessGrants.tsx       # Access grants list
│
├── vault/
│   ├── VaultConfig.tsx              # Vault configuration view
│   ├── VaultForm.tsx                # Add/edit vault form
│   ├── VaultCard.tsx                # Vault card component
│   └── VaultHealthStatus.tsx        # Health status display
│
├── import-export/
│   ├── ImportDialog.tsx             # Import secrets modal
│   ├── ExportDialog.tsx             # Export secrets modal
│   └── MigrationWizard.tsx          # Migration wizard
│
├── audit/
│   ├── AuditLogViewer.tsx           # Audit log list
│   ├── AuditFilters.tsx             # Filter controls
│   ├── AuditDetail.tsx              # Log detail view
│   └── ComplianceReport.tsx         # Compliance report
│
└── common/
    ├── SecretTypeBadge.tsx          # Type badge
    ├── ScopeBadge.tsx               # Scope badge
    ├── ExpirationBadge.tsx          # Expiration status
    └── MaskedValue.tsx              # Masked value display
```

---

## 14. Encryption & Security

### 14.1 Encryption Standards

```typescript
// AES-256-GCM for local storage
interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keySize: 256;               // bits
  ivSize: 12;                 // bytes (96 bits)
  tagSize: 16;                // bytes (128 bits)
  encoding: 'base64';
}

interface EncryptedData {
  ciphertext: string;         // Base64 encoded
  iv: string;                 // Base64 encoded
  tag: string;                // Base64 encoded
  keyId: string;              // Reference to encryption key
}

class AESEncryptor implements Encryptor {
  async encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128
      },
      key,
      encoded
    );
    
    // Split ciphertext and tag
    const ctArray = new Uint8Array(ciphertext);
    const tag = ctArray.slice(-16);
    const ct = ctArray.slice(0, -16);
    
    return {
      ciphertext: this.toBase64(ct),
      iv: this.toBase64(iv),
      tag: this.toBase64(tag),
      keyId: key.id
    };
  }
  
  async decrypt(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
    const iv = this.fromBase64(encrypted.iv);
    const ciphertext = this.fromBase64(encrypted.ciphertext);
    const tag = this.fromBase64(encrypted.tag);
    
    // Combine ciphertext and tag for decryption
    const combined = new Uint8Array([...ciphertext, ...tag]);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128
      },
      key,
      combined
    );
    
    return new TextDecoder().decode(decrypted);
  }
}
```

### 14.2 Key Management

```typescript
interface KeyManager {
  // Get current active key for encryption
  getCurrentKey(): Promise<EncryptionKey>;
  
  // Get specific key for decryption
  getKey(keyId: string): Promise<EncryptionKey>;
  
  // Rotate to new key
  rotateKey(): Promise<EncryptionKey>;
  
  // Re-encrypt all secrets with new key
  reEncryptSecrets(): Promise<void>;
}

class LocalKeyManager implements KeyManager {
  /**
   * Master key derivation from environment
   * Master key should be stored securely (e.g., in keytar, environment variable)
   */
  private async getMasterKey(): Promise<CryptoKey> {
    const masterKeyMaterial = process.env.SECRETS_MASTER_KEY;
    
    if (!masterKeyMaterial) {
      throw new Error('SECRETS_MASTER_KEY environment variable not set');
    }
    
    // Derive key from master key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterKeyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('castiel-secrets'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async rotateKey(): Promise<EncryptionKey> {
    // 1. Generate new key
    const newKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // 2. Encrypt new key with master key
    const masterKey = await this.getMasterKey();
    const exportedKey = await crypto.subtle.exportKey('raw', newKey);
    const encryptedKey = await this.encryptor.encrypt(
      this.toBase64(new Uint8Array(exportedKey)),
      masterKey
    );
    
    // 3. Store encrypted key
    const keyRecord = await prisma.encryptionKey.create({
      data: {
        keyId: generateUUID(),
        version: await this.getNextVersion(),
        encryptedKey: JSON.stringify(encryptedKey),
        status: 'ACTIVE'
      }
    });
    
    // 4. Mark previous key as rotating
    await prisma.encryptionKey.updateMany({
      where: {
        status: 'ACTIVE',
        id: { not: keyRecord.id }
      },
      data: { status: 'ROTATING' }
    });
    
    return keyRecord;
  }
}
```

### 14.3 Security Best Practices

```typescript
/**
 * Security guidelines for Secret Management
 */

// 1. Never log secret values
function logSecretAccess(secretId: string, userId: string): void {
  // ✅ Good: Log metadata only
  logger.info('Secret accessed', { secretId, userId, timestamp: new Date() });
  
  // ❌ Bad: Never log the value
  // logger.info('Secret value:', secretValue);
}

// 2. Clear sensitive data from memory
async function useSecret<T>(
  secretId: string,
  action: (value: string) => Promise<T>
): Promise<T> {
  let secretValue: string | undefined;
  
  try {
    secretValue = await getSecretValue(secretId);
    return await action(secretValue);
  } finally {
    // Clear from memory
    if (secretValue) {
      secretValue = undefined;
    }
  }
}

// 3. Validate input to prevent injection
function validateSecretName(name: string): void {
  const validPattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,254}$/;
  if (!validPattern.test(name)) {
    throw new ValidationError('Invalid secret name format');
  }
}

// 4. Rate limit secret access
const secretAccessLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                    // 100 requests per minute
  message: 'Too many secret access requests'
});

// 5. Require re-authentication for sensitive operations
async function performSensitiveOperation(
  operation: () => Promise<void>,
  context: SecretContext
): Promise<void> {
  // Require recent authentication
  const lastAuth = await getLastAuthTime(context.userId);
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  if (Date.now() - lastAuth.getTime() > maxAge) {
    throw new ReauthenticationRequiredError();
  }
  
  await operation();
}
```

---

## 15. Implementation Guidelines

### 15.1 Implementation Phases

#### Phase 1: Core Infrastructure (Weeks 1-3)
- [ ] Database schema and migrations
- [ ] Local encrypted backend implementation
- [ ] Basic SecretService API
- [ ] AES-256-GCM encryption implementation
- [ ] Key management basics

#### Phase 2: Access Control & Scoping (Weeks 4-5)
- [ ] Scope resolver implementation
- [ ] Access control implementation
- [ ] Permission checking
- [ ] Access grants

#### Phase 3: Lifecycle Management (Weeks 6-7)
- [ ] Expiration tracking and notifications
- [ ] Version management
- [ ] Soft delete and recovery
- [ ] Rotation scheduling

#### Phase 4: External Vault Integration (Weeks 8-10)
- [ ] Azure Key Vault backend
- [ ] AWS Secrets Manager backend (optional)
- [ ] HashiCorp Vault backend (optional)
- [ ] GCP Secret Manager backend (optional)

#### Phase 5: Import/Export & Migration (Weeks 11-12)
- [ ] .env file import
- [ ] JSON import/export
- [ ] Backend migration service

#### Phase 6: Audit & Compliance (Weeks 13-14)
- [ ] Comprehensive audit logging
- [ ] Compliance reports
- [ ] Audit log viewer UI

#### Phase 7: UI & Polish (Weeks 15-16)
- [ ] Super Admin views
- [ ] Org Admin views
- [ ] User views
- [ ] Testing and documentation

### 15.2 Dependencies

| Dependency | Purpose |
|------------|---------|
| `@azure/keyvault-secrets` | Azure Key Vault integration |
| `@aws-sdk/client-secrets-manager` | AWS Secrets Manager integration |
| `node-vault` | HashiCorp Vault integration |
| `@google-cloud/secret-manager` | GCP Secret Manager integration |
| `keytar` | Secure local credential storage |
| `zod` | Schema validation |

### 15.3 Error Handling

```typescript
// Secret-specific error types
class SecretError extends Error {
  constructor(message: string, public code: SecretErrorCode) {
    super(message);
  }
}

enum SecretErrorCode {
  SECRET_NOT_FOUND = 'SECRET_NOT_FOUND',
  SECRET_EXPIRED = 'SECRET_EXPIRED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_SECRET_TYPE = 'INVALID_SECRET_TYPE',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  VAULT_CONNECTION_FAILED = 'VAULT_CONNECTION_FAILED',
  VAULT_NOT_CONFIGURED = 'VAULT_NOT_CONFIGURED',
  ROTATION_FAILED = 'ROTATION_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  MIGRATION_FAILED = 'MIGRATION_FAILED'
}
```

---

## 16. Summary

The Secret Management Module provides a comprehensive, secure, and auditable system for managing secrets across the Castiel platform. Key highlights:

1. **Centralized Management**: Single source of truth for all secrets
2. **Multi-Backend Support**: Azure Key Vault, AWS, HashiCorp, GCP, or local storage
3. **Hierarchical Scoping**: Global, Organization, Team, Project, and User levels
4. **Strong Encryption**: AES-256-GCM for local storage
5. **Complete Lifecycle**: Expiration, rotation, versioning, and soft delete
6. **Comprehensive Audit**: Full audit trail for compliance
7. **Easy Integration**: Clean API for consumer modules

---

**Related Documents:**
- [Part 1: Core Specification](./secret-management-specification-part1.md)
- [MCP Server Module](../MCP%20Server/mcp-server-specification-part1.md)
- [Module List](../Main/module-list.md)

