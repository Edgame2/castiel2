# Compliance Service Module - Architecture

## Overview

The Compliance Service module provides regulatory and policy compliance service for Castiel, ensuring adherence to industry standards (WCAG, OWASP) and regulatory requirements (GDPR, HIPAA, SOC2).

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `compliance_checks` | `/tenantId` | Compliance check results |
| `compliance_requirements` | `/tenantId` | Compliance requirements |
| `compliance_violations` | `/tenantId` | Compliance violations |
| `compliance_policies` | `/tenantId` | Compliance policies |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ComplianceCheckService** - Automated compliance verification
2. **PolicyService** - Policy management
3. **ViolationService** - Violation tracking and remediation
4. **RequirementService** - Requirement tracking

## Data Flow

```
User Request / Scheduled Job
    ↓
Compliance Service
    ↓
Quality Service (code quality checks)
    ↓
Security Service (security compliance)
    ↓
Validation Engine (validation rules)
    ↓
Workflow Service (compliance workflows)
    ↓
Cosmos DB (store compliance data)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Quality Service**: For code quality checks
- **Security Service**: For security compliance
- **Validation Engine**: For validation rules
- **Workflow Service**: For compliance workflows
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
