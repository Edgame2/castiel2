# Security Service Module - Architecture

## Overview

The Security Service module provides security analysis and protection service for Castiel, including secret scanning, vulnerability scanning, PII detection, SAST/DAST/SCA, and code obfuscation.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `security_scans` | `/tenantId` | Security scan data |
| `security_findings` | `/tenantId` | Security findings |
| `security_pii_detections` | `/tenantId` | PII detection results |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **SecurityScannerService** - Secret and vulnerability scanning
2. **PIIDetectionService** - PII detection
3. **SASTService** - Static Application Security Testing
4. **DASTService** - Dynamic Application Security Testing
5. **SCAService** - Software Composition Analysis

## Data Flow

```
User Request / Scheduled Job
    ↓
Security Service
    ↓
Context Service (code context)
    ↓
Quality Service (quality checks)
    ↓
Observability Service (monitoring)
    ↓
Workflow Service (security workflows)
    ↓
Secret Management (credential checking)
    ↓
Cosmos DB (store scan results)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Context Service**: For code context
- **Quality Service**: For quality checks
- **Observability Service**: For monitoring
- **Workflow Service**: For security workflows
- **Shard Manager**: For data sharding
- **Secret Management**: For credential checking
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
