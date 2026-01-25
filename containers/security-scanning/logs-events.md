# Security Scanning Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Security Scanning module that get logged by the Logging module. These events represent important security scanning activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Security Scanning module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `security.scan.started` | Security scan started | Logging module |
| `security.scan.completed` | Security scan completed | Logging module |
| `security.scan.failed` | Security scan failed | Logging module |
| `security.vulnerability.detected` | Security vulnerability detected | Logging module |
| `security.threat.detected` | Security threat detected | Logging module |

---

### security.scan.started

**Description**: Emitted when a security scan is started.

**Triggered When**:
- User initiates a security scan
- Scheduled scan begins
- Scan job is created and queued

**Event Type**: `security.scan.started`

**Publisher**: `src/events/publishers/SecurityScanningEventPublisher.ts`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event identifier"
    },
    "type": {
      "type": "string",
      "const": "security.scan.started"
    },
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant ID"
    },
    "source": {
      "type": "object",
      "properties": {
        "service": {
          "type": "string",
          "const": "security-scanning"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["scanId", "scanType", "organizationId"],
      "properties": {
        "scanId": {
          "type": "string",
          "format": "uuid",
          "description": "Scan ID"
        },
        "scanType": {
          "type": "string",
          "description": "Type of scan (e.g., code, dependency, container)"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User who initiated the scan"
        },
        "target": {
          "type": "string",
          "description": "Scan target (e.g., repository, container, service)"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "security.scan.started",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "security-scanning"
  },
  "data": {
    "scanId": "789e4567-e89b-12d3-a456-426614174001",
    "scanType": "code",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "456e7890-e89b-12d3-a456-426614174002",
    "target": "repository:abc123"
  }
}
```

---

### security.scan.completed

**Description**: Emitted when a security scan completes successfully.

**Triggered When**:
- Scan processing finishes
- Scan results are generated
- Results are stored in database

**Event Type**: `security.scan.completed`

**Publisher**: `src/events/publishers/SecurityScanningEventPublisher.ts`

**Event Schema**: Similar structure with completion-specific data including `vulnerabilityCount`, `threatCount`, `durationMs`.

---

### security.scan.failed

**Description**: Emitted when a security scan fails.

**Triggered When**:
- Scan processing encounters an error
- Scan cannot complete
- Critical failure occurs

**Event Type**: `security.scan.failed`

**Publisher**: `src/events/publishers/SecurityScanningEventPublisher.ts`

---

### security.vulnerability.detected

**Description**: Emitted when a security vulnerability is detected.

**Triggered When**:
- Vulnerability is identified during scan
- Vulnerability is confirmed
- Vulnerability is stored

**Event Type**: `security.vulnerability.detected`

**Publisher**: `src/events/publishers/SecurityScanningEventPublisher.ts`

---

### security.threat.detected

**Description**: Emitted when a security threat is detected.

**Triggered When**:
- Threat is identified during scan
- Threat is confirmed
- Threat is stored

**Event Type**: `security.threat.detected`

**Publisher**: `src/events/publishers/SecurityScanningEventPublisher.ts`

---

## Consumed Events

The Security Scanning module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| `code.commit.created` | Code commit created | Triggers security scan |
| `dependency.updated` | Dependency updated | Triggers dependency scan |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
