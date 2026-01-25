# Recommendations Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Recommendations module that get logged by the Logging module. These events represent important recommendation generation activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Recommendations module publishes the following events to the `coder_events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `recommendation.generation.started` | Recommendation generation started | Logging module |
| `recommendation.generation.completed` | Recommendations generated | Logging module |
| `recommendation.generation.failed` | Recommendation generation failed | Logging module |
| `recommendation.feedback.received` | User feedback on recommendation | Logging module |
| `remediation.workflow.created` | Remediation workflow created (Plan §7.1, §929). Payload: workflowId, opportunityId, assignedTo. Consumers: notification-manager. | notification-manager |
| `remediation.step.completed` | A remediation step completed; allStepsComplete=false until last. Payload: workflowId, stepNumber, completedBy, allStepsComplete. Consumers: notification-manager. | notification-manager |
| `remediation.workflow.completed` | Remediation workflow completed or cancelled (Plan §10, §929). Payload: workflowId, opportunityId, status, completedAt, userId?, duration?. Consumed by **logging MLAuditConsumer**. | Logging module |

---

### recommendation.generation.completed

**Description**: Emitted when recommendations are successfully generated.

**Triggered When**:
- Recommendation generation completes
- Recommendations are stored in database

**Event Type**: `recommendation.generation.completed`

**Publisher**: `src/events/publishers/RecommendationEventPublisher.ts` → `publishRecommendationEvent()`

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
      "const": "recommendation.generation.completed"
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
      "const": "recommendations"
    },
    "data": {
      "type": "object",
      "required": ["recommendationId", "opportunityId"],
      "properties": {
        "recommendationId": {
          "type": "string",
          "format": "uuid"
        },
        "opportunityId": {
          "type": "string",
          "format": "uuid"
        },
        "recommendationsCount": {
          "type": "integer",
          "description": "Number of recommendations generated"
        }
      }
    }
  }
}
```

---

### recommendation.feedback.received

**Description**: Emitted when user provides feedback on a recommendation (accept/ignore/irrelevant). Critical for CAIS learning.

**Triggered When**:
- User accepts, ignores, or marks recommendation as irrelevant
- Feedback is stored in database

**Event Type**: `recommendation.feedback.received`

**Publisher**: `src/events/publishers/RecommendationEventPublisher.ts` → `publishRecommendationEvent()`

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
      "const": "recommendation.feedback.received"
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
      "const": "recommendations"
    },
    "data": {
      "type": "object",
      "required": ["recommendationId", "action", "userId"],
      "properties": {
        "recommendationId": {
          "type": "string",
          "format": "uuid"
        },
        "action": {
          "type": "string",
          "enum": ["accept", "ignore", "irrelevant"]
        },
        "userId": {
          "type": "string",
          "format": "uuid"
        },
        "comment": {
          "type": "string",
          "description": "Optional user comment"
        }
      }
    }
  }
}
```

---

### remediation.workflow.completed (Plan §10, §929)

**Description**: Emitted when a remediation workflow is completed (all steps done) or cancelled. Consumed by **logging MLAuditConsumer** for audit (Blob, 7-year retention).

**Triggered When**:
- RemediationWorkflowService completes the last step or workflow is cancelled
- Call `publishRemediationWorkflowCompleted(tenantId, { workflowId, opportunityId, status, completedAt?, userId? })`

**Event Type**: `remediation.workflow.completed`

**Publisher**: `src/events/publishers/RecommendationEventPublisher.ts` → `publishRemediationWorkflowCompleted()`

**Payload**: `{ workflowId, opportunityId, status: 'completed'|'cancelled', completedAt, userId?, duration? }` (duration in seconds when completed).
