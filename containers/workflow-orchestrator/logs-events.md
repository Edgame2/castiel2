# Workflow Orchestrator Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Workflow Orchestrator module that get logged by the Logging module. These events represent important workflow orchestration activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Workflow Orchestrator module publishes the following events to the `coder_events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `workflow.opportunity.analysis.started` | Opportunity analysis workflow started | Logging module |
| `workflow.opportunity.analysis.completed` | Complete analysis workflow finished | Logging module |
| `workflow.opportunity.analysis.failed` | Workflow failed | Logging module |
| `workflow.step.completed` | Individual workflow step completed | Logging module |
| `workflow.job.trigger` | Batch job trigger (Plan §9.3); payload: job, metadata, triggeredBy, timestamp. Jobs: risk-snapshot-backfill, outcome-sync. Consumers: risk-analytics BatchJobWorker (bi_batch_jobs) | Logging module |

---

### workflow.opportunity.analysis.completed

**Description**: Emitted when a complete opportunity analysis workflow finishes successfully.

**Triggered When**:
- All workflow steps (risk analysis, scoring, forecasting, recommendations) complete
- Workflow results are aggregated and stored

**Event Type**: `workflow.opportunity.analysis.completed`

**Publisher**: `src/events/publishers/WorkflowOrchestratorEventPublisher.ts` → `publishWorkflowEvent()`

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
      "const": "workflow.opportunity.analysis.completed"
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
      "const": "workflow-orchestrator"
    },
    "data": {
      "type": "object",
      "required": ["workflowId", "opportunityId"],
      "properties": {
        "workflowId": {
          "type": "string",
          "format": "uuid"
        },
        "opportunityId": {
          "type": "string",
          "format": "uuid"
        },
        "results": {
          "type": "object",
          "description": "Aggregated results from all workflow steps",
          "properties": {
            "risk": {
              "type": "object",
              "description": "Risk analysis results"
            },
            "scoring": {
              "type": "object",
              "description": "Risk scoring results"
            },
            "forecast": {
              "type": "object",
              "description": "Forecast results"
            },
            "recommendations": {
              "type": "object",
              "description": "Recommendation results"
            }
          }
        }
      }
    }
  }
}
```

---

### workflow.opportunity.analysis.failed

**Description**: Emitted when a workflow fails.

**Triggered When**:
- A workflow step fails
- Workflow cannot complete

**Event Type**: `workflow.opportunity.analysis.failed`

**Publisher**: `src/events/publishers/WorkflowOrchestratorEventPublisher.ts` → `publishWorkflowEvent()`

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
      "const": "workflow.opportunity.analysis.failed"
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
      "const": "workflow-orchestrator"
    },
    "data": {
      "type": "object",
      "required": ["workflowId", "opportunityId", "error"],
      "properties": {
        "workflowId": {
          "type": "string",
          "format": "uuid"
        },
        "opportunityId": {
          "type": "string",
          "format": "uuid"
        },
        "error": {
          "type": "string",
          "description": "Error message"
        },
        "failedStep": {
          "type": "string",
          "description": "Step that failed"
        }
      }
    }
  }
}
```
