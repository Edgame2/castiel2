# Utility Services Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Utility Services module that get logged by the Logging module. These events represent important utility service activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Utility Services module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `utility.import.started` | Import job started | Logging module |
| `utility.import.completed` | Import job completed | Logging module |
| `utility.import.failed` | Import job failed | Logging module |
| `utility.export.started` | Export job started | Logging module |
| `utility.export.completed` | Export job completed | Logging module |
| `utility.export.failed` | Export job failed | Logging module |
| `utility.notification.sent` | Utility notification sent | Logging module |

---

### utility.import.started

**Description**: Emitted when an import job is started.

**Triggered When**:
- User initiates an import
- Import job is created and queued
- Import processing begins

**Event Type**: `utility.import.started`

**Publisher**: `src/events/publishers/UtilityServicesEventPublisher.ts`

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
      "const": "utility.import.started"
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
          "const": "utility-services"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["jobId", "importType", "organizationId"],
      "properties": {
        "jobId": {
          "type": "string",
          "format": "uuid",
          "description": "Import job ID"
        },
        "importType": {
          "type": "string",
          "description": "Type of import (e.g., csv, json, excel)"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User who initiated the import"
        },
        "recordCount": {
          "type": "integer",
          "description": "Number of records to import"
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
  "type": "utility.import.started",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "utility-services"
  },
  "data": {
    "jobId": "789e4567-e89b-12d3-a456-426614174001",
    "importType": "csv",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "456e7890-e89b-12d3-a456-426614174002",
    "recordCount": 1000
  }
}
```

---

### utility.import.completed

**Description**: Emitted when an import job completes successfully.

**Triggered When**:
- All records are imported successfully
- Import job finishes processing
- Results are stored

**Event Type**: `utility.import.completed`

**Publisher**: `src/events/publishers/UtilityServicesEventPublisher.ts`

**Event Schema**: Similar structure with completion-specific data including `recordsProcessed`, `recordsImported`, `recordsSkipped`, `errors`.

---

### utility.import.failed

**Description**: Emitted when an import job fails.

**Triggered When**:
- Import processing encounters an error
- Import job cannot complete
- Critical failure occurs

**Event Type**: `utility.import.failed`

**Publisher**: `src/events/publishers/UtilityServicesEventPublisher.ts`

**Event Schema**: Similar structure with error information.

---

### utility.export.started

**Description**: Emitted when an export job is started.

**Triggered When**:
- User initiates an export
- Export job is created
- Export processing begins

**Event Type**: `utility.export.started`

**Publisher**: `src/events/publishers/UtilityServicesEventPublisher.ts`

---

### utility.export.completed

**Description**: Emitted when an export job completes successfully.

**Triggered When**:
- Export file is generated
- Export job finishes
- File is ready for download

**Event Type**: `utility.export.completed`

**Publisher**: `src/events/publishers/UtilityServicesEventPublisher.ts`

---

### utility.export.failed

**Description**: Emitted when an export job fails.

**Triggered When**:
- Export processing encounters an error
- Export cannot be generated

**Event Type**: `utility.export.failed`

**Publisher**: `src/events/publishers/UtilityServicesEventPublisher.ts`

---

### utility.notification.sent

**Description**: Emitted when a utility notification is sent.

**Triggered When**:
- Notification is successfully delivered
- Email/SMS/Push notification sent

**Event Type**: `utility.notification.sent`

**Publisher**: `src/events/publishers/UtilityServicesEventPublisher.ts`

---

## Consumed Events

The Utility Services module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| N/A | Currently no event consumption | - |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
