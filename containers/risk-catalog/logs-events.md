# Risk Catalog Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Risk Catalog module that get logged by the Logging module. These events represent important risk catalog management activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Risk Catalog module publishes the following events to the `coder_events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `risk.catalog.created` | Risk catalog entry created | Logging module |
| `risk.catalog.updated` | Risk catalog entry updated | Logging module |
| `risk.catalog.deleted` | Risk catalog entry deleted | Logging module |
| `risk.catalog.enabled` | Risk enabled for tenant | Logging module |
| `risk.catalog.disabled` | Risk disabled for tenant | Logging module |
| `risk.catalog.duplicated` | Risk duplicated to tenant | Logging module |

---

### risk.catalog.created

**Description**: Emitted when a risk catalog entry is created.

**Triggered When**:
- User creates a new risk (global, industry, or tenant-specific)
- Risk definition is stored in database

**Event Type**: `risk.catalog.created`

**Publisher**: `src/events/publishers/RiskCatalogEventPublisher.ts` → `publishRiskCatalogEvent()`

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
      "const": "risk.catalog.created"
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
      "const": "risk-catalog"
    },
    "data": {
      "type": "object",
      "required": ["riskId", "catalogType"],
      "properties": {
        "riskId": {
          "type": "string",
          "description": "Risk ID"
        },
        "catalogType": {
          "type": "string",
          "enum": ["global", "industry", "tenant"],
          "description": "Catalog type"
        },
        "industryId": {
          "type": "string",
          "format": "uuid",
          "description": "Industry ID (if catalogType is industry)"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who created the risk"
        }
      }
    }
  }
}
```

---

### risk.catalog.updated

**Description**: Emitted when a risk catalog entry is updated.

**Triggered When**:
- User updates risk definition
- Risk metadata is modified

**Event Type**: `risk.catalog.updated`

**Publisher**: `src/events/publishers/RiskCatalogEventPublisher.ts` → `publishRiskCatalogEvent()`

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
      "const": "risk.catalog.updated"
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
      "const": "risk-catalog"
    },
    "data": {
      "type": "object",
      "required": ["riskId", "changes"],
      "properties": {
        "riskId": {
          "type": "string"
        },
        "changes": {
          "type": "object",
          "description": "Fields that were changed"
        },
        "userId": {
          "type": "string",
          "format": "uuid"
        }
      }
    }
  }
}
```

---

### risk.catalog.deleted

**Description**: Emitted when a tenant-specific risk is deleted.

**Triggered When**:
- User deletes a tenant-specific risk
- Risk is removed from database

**Event Type**: `risk.catalog.deleted`

**Publisher**: `src/events/publishers/RiskCatalogEventPublisher.ts` → `publishRiskCatalogEvent()`

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
      "const": "risk.catalog.deleted"
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
      "const": "risk-catalog"
    },
    "data": {
      "type": "object",
      "required": ["riskId"],
      "properties": {
        "riskId": {
          "type": "string"
        },
        "userId": {
          "type": "string",
          "format": "uuid"
        }
      }
    }
  }
}
```

---

### risk.catalog.enabled

**Description**: Emitted when a risk is enabled for a tenant.

**Triggered When**:
- User enables a global/industry risk for their tenant
- Enable override is stored

**Event Type**: `risk.catalog.enabled`

**Publisher**: `src/events/publishers/RiskCatalogEventPublisher.ts` → `publishRiskCatalogEvent()`

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
      "const": "risk.catalog.enabled"
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
      "const": "risk-catalog"
    },
    "data": {
      "type": "object",
      "required": ["riskId", "catalogType"],
      "properties": {
        "riskId": {
          "type": "string"
        },
        "catalogType": {
          "type": "string",
          "enum": ["global", "industry"]
        },
        "industryId": {
          "type": "string",
          "format": "uuid"
        },
        "userId": {
          "type": "string",
          "format": "uuid"
        }
      }
    }
  }
}
```

---

### risk.catalog.disabled

**Description**: Emitted when a risk is disabled for a tenant.

**Triggered When**:
- User disables a global/industry risk for their tenant
- Disable override is stored

**Event Type**: `risk.catalog.disabled`

**Publisher**: `src/events/publishers/RiskCatalogEventPublisher.ts` → `publishRiskCatalogEvent()`

**Event Schema**: Similar to `risk.catalog.enabled` with `type: "risk.catalog.disabled"`

---

### risk.catalog.duplicated

**Description**: Emitted when a risk is duplicated from global/industry to tenant-specific.

**Triggered When**:
- User duplicates a global/industry risk to create tenant-specific copy
- New tenant-specific risk is created

**Event Type**: `risk.catalog.duplicated`

**Publisher**: `src/events/publishers/RiskCatalogEventPublisher.ts` → `publishRiskCatalogEvent()`

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
      "const": "risk.catalog.duplicated"
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
      "const": "risk-catalog"
    },
    "data": {
      "type": "object",
      "required": ["sourceRiskId", "targetRiskId"],
      "properties": {
        "sourceRiskId": {
          "type": "string",
          "description": "Source risk ID (global/industry)"
        },
        "targetRiskId": {
          "type": "string",
          "description": "Target risk ID (tenant-specific)"
        },
        "userId": {
          "type": "string",
          "format": "uuid"
        }
      }
    }
  }
}
```
