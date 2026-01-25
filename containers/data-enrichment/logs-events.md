# Data Enrichment Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Data Enrichment module that get logged by the Logging module. These events represent important data enrichment activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Data Enrichment module publishes the following events to the `coder_events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `enrichment.job.started` | Enrichment job started | Logging module |
| `enrichment.job.completed` | Enrichment job completed | Logging module |
| `vectorization.job.completed` | Vectorization completed | Logging module |
| `shard.relationship.created` | Shard relationship created | Logging module |

---

### enrichment.job.completed

**Description**: Emitted when an enrichment job completes successfully.

**Triggered When**:
- Enrichment processing finishes
- Enriched data is stored in database

**Event Type**: `enrichment.job.completed`

**Publisher**: `src/events/publishers/EnrichmentEventPublisher.ts` → `publishEnrichmentEvent()`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "type": {
      "type": "string",
      "const": "enrichment.job.completed"
    },
    "version": {
      "type": "string",
      "const": "1.0.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid"
    },
    "source": {
      "type": "string",
      "const": "data-enrichment"
    },
    "data": {
      "type": "object",
      "required": ["jobId", "shardId"],
      "properties": {
        "jobId": {
          "type": "string",
          "format": "uuid"
        },
        "shardId": {
          "type": "string",
          "format": "uuid"
        },
        "enrichmentType": {
          "type": "string",
          "description": "Type of enrichment performed"
        }
      }
    }
  }
}
```

---

### vectorization.job.completed

**Description**: Emitted when vectorization completes successfully.

**Triggered When**:
- Vectorization processing finishes
- Embeddings are stored in database

**Event Type**: `vectorization.job.completed`

**Publisher**: `src/events/publishers/EnrichmentEventPublisher.ts` → `publishEnrichmentEvent()`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "type": {
      "type": "string",
      "const": "vectorization.job.completed"
    },
    "version": {
      "type": "string",
      "const": "1.0.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid"
    },
    "source": {
      "type": "string",
      "const": "data-enrichment"
    },
    "data": {
      "type": "object",
      "required": ["jobId", "shardId"],
      "properties": {
        "jobId": {
          "type": "string",
          "format": "uuid"
        },
        "shardId": {
          "type": "string",
          "format": "uuid"
        },
        "embeddingDimensions": {
          "type": "integer",
          "description": "Number of dimensions in embedding vector"
        }
      }
    }
  }
}
```
