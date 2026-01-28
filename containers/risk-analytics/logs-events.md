# Risk Analytics Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Risk Analytics module that get logged by the Logging module. These events represent important risk evaluation and analytics activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Risk Analytics module publishes the following events to the `coder_events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `risk.evaluated` | Risk evaluation finalized; payload for Data Lake and risk_snapshots (Plan §9.1). data: tenantId, opportunityId, riskScore, categoryScores, topDrivers?, dataQuality?, **atRiskReasons?** (Plan §11.11, §944). | Logging (DataLakeCollector, MLAuditConsumer), risk-analytics (RiskSnapshotService) |
| `risk.evaluation.completed` | Risk evaluation completed for an opportunity | Logging module |
| `revenue-at-risk.calculated` | Revenue at risk calculated | Logging module |
| `quota.created` | Quota created | Logging module |
| `quota.deleted` | Quota deleted | Logging module |
| `early-warning.signals-detected` | Early warning signals detected | Logging module |
| `risk.simulation.completed` | Risk simulation completed | Logging module |
| `workflow.job.completed` | Batch job completed (Plan §9.3); payload: job, status, completedAt. Publisher: BatchJobWorker | Logging module |
| `workflow.job.failed` | Batch job failed (Plan §9.3); payload: job, error, failedAt. Publisher: BatchJobWorker | Logging module |
| `opportunity.outcome.recorded` | (DATA_LAKE_LAYOUT §3); payload: tenantId, opportunityId, outcome, competitorId?, closeDate, amount. Publishers: BatchJobWorker (outcome-sync); RiskAnalyticsEventConsumer on shard.updated / integration.opportunity.updated when IsClosed and CloseDate in last 24h (Plan §904, outcome_feedback.publish_on_shard_update). | Logging; RiskAnalyticsEventConsumer → /ml_outcomes |
| `risk.prediction.generated` | 30/60/90-day risk prediction written to risk_predictions (Plan §10). Payload: predictionId, opportunityId, horizons, modelId, predictionDate. Publisher: when EarlyWarningService.generatePredictions succeeds | Logging (MLAuditConsumer) |
| `opportunity.quick_action.requested` | Quick action from EarlyWarningCard/AnomalyCard (Plan §942, §11.10). Payload: opportunityId, userId, action (create_task\|log_activity\|start_remediation), payload?. Consumers: workflow-orchestrator, integration-manager, recommendations. | (async; no Logging consumer by default) |
| `anomaly.detected` | Anomaly alert written to risk_anomaly_alerts (Plan §920). Payload: tenantId, opportunityId, anomalyType, severity, description, detectedAt. Published when statistical/ML detection is implemented. Consumers: notification-manager, logging. | Logging, notification-manager |
| `hitl.approval.requested` | HITL (Plan §972): when feature_flags.hitl_approvals and riskScore ≥ hitl_risk_min and amount ≥ hitl_deal_min. Payload: tenantId, opportunityId, riskScore, amount, requestedAt; ownerId or approverId or recipientId (for notification-manager). Publisher: RiskEvaluationService after risk.evaluated. Consumers: notification-manager, workflow-orchestrator (or dedicated approval), logging/audit. | Logging (when MLAuditConsumer or HITL consumer binds), notification-manager |
| `risk.cluster.updated` | Risk clustering batch completed (Plan §7.1, §914). Payload: clusterIds, ruleCount. Published by RiskClusteringService.computeAndPersistForTenant. Consumers: logging, cache invalidation. | Logging |
| `ml.model.drift.detected` | (Plan §940) Published by **ml-service** ModelMonitoringService when PSI on `prediction` from `/ml_inference_logs` exceeds `model_monitoring.psi_threshold`. Payload: modelId, segment?, metric (e.g. `psi`), delta. Consumers: logging (MLAuditConsumer), alerting. | Logging |
| `ml.model.performance.degraded` | (Plan §940) Published by **ml-service** ModelMonitoringService when Brier or MAE (from ml_evaluations) exceeds `model_monitoring.brier_threshold` or `model_monitoring.mae_threshold`. Payload: modelId, metric (`brier`\|`mae`), value, threshold. Consumers: logging, alerting. | Logging |

---

## Consumed Events (Plan §921, §9)

| Event | Publisher | Risk-analytics action |
|-------|-----------|------------------------|
| `sentiment.trends.updated` | ai-insights or data-enrichment | Upserts `risk_sentiment_trends` (one doc per period). Payload: `tenantId`, `opportunityId`, `trends: [{ period, score, sampleSize? }]`. `GET /api/v1/opportunities/:id/sentiment-trends` reads from risk_sentiment_trends. |

---

### anomaly.detected

**Description**: Emitted when an anomaly is detected for an opportunity and persisted to `risk_anomaly_alerts`. Statistical (Z-score) detection is implemented via `AnomalyDetectionService.runStatisticalDetection` (Plan §920); ML (Isolation Forest) TBD. `publishAnomalyDetected` in RiskAnalyticsEventPublisher.

**Triggered When**:
- `POST /api/v1/opportunities/:opportunityId/anomalies/detect` runs Z-score detection and zScore ≥ 1.5 (medium or high)
- Anomaly detection (statistical or ML) finds an anomaly and alert is stored in `risk_anomaly_alerts`

**Event Type**: `anomaly.detected`

**Publisher**: `src/events/publishers/RiskAnalyticsEventPublisher.ts` → `publishAnomalyDetected()`

**Payload (data)**: `tenantId`, `opportunityId`, `anomalyType` (statistical|ml|pattern), `severity` (low|medium|high), `description`, `detectedAt`. Optional: `subtype`, `details`, `ownerId` (opportunity OwnerId; from c_opportunity.structuredData.OwnerId via shard-manager when `POST .../anomalies/detect` runs and `services.shard_manager.url` is set; notification-manager uses it to notify the owner).

**Consumers**: notification-manager (alerts when `ownerId` present; Plan §7.2), Logging (audit).

---

### hitl.approval.requested (Plan §972)

**Description**: HITL (Human-in-the-Loop) approval request when a high-risk, high-value opportunity exceeds configurable thresholds. Emitted by `RiskEvaluationService` after `risk.evaluated` when `feature_flags.hitl_approvals` is true and `riskScore >= thresholds.hitl_risk_min` and `amount >= thresholds.hitl_deal_min`.

**Triggered When**:
- Risk evaluation completes in `evaluateRisk`
- `feature_flags.hitl_approvals === true`
- `riskScore >= thresholds.hitl_risk_min` (default 0.8)
- `amount >= thresholds.hitl_deal_min` (default 1_000_000); amount from `c_opportunity.structuredData.Amount` or `amount`

**Publisher**: `src/events/publishers/RiskAnalyticsEventPublisher.ts` → `publishHitlApprovalRequested()`

**Payload (data)**: `tenantId`, `opportunityId`, `riskScore`, `amount`, `requestedAt`. Optional: `ownerId` (from c_opportunity `OwnerId`/`ownerId`; for notification-manager), `approverId`, `recipientId`, `correlationId`, `approvalUrl`.

**Consumers**: notification-manager (eventMapper; IN_APP+EMAIL when `ownerId`/`approverId`/`recipientId` present), workflow-orchestrator or dedicated approval service, logging/audit. Runbook: `deployment/monitoring/runbooks/hitl-approval-flow.md`.

---

### risk.evaluation.completed

**Description**: Emitted when a risk evaluation is completed for an opportunity.

**Triggered When**:
- Risk evaluation finishes processing (rule-based, AI, historical, ML)
- Evaluation results are stored in database
- Risk score and revenue at risk are calculated

**Event Type**: `risk.evaluation.completed`

**Publisher**: `src/events/publishers/RiskAnalyticsEventPublisher.ts` → `publishRiskAnalyticsEvent()`

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
      "const": "risk.evaluation.completed"
    },
    "version": {
      "type": "string",
      "const": "1.0.0"
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
      "type": "string",
      "const": "risk-analytics"
    },
    "data": {
      "type": "object",
      "required": ["evaluationId", "opportunityId", "riskScore", "revenueAtRisk"],
      "properties": {
        "evaluationId": {
          "type": "string",
          "format": "uuid",
          "description": "Risk evaluation ID"
        },
        "opportunityId": {
          "type": "string",
          "format": "uuid",
          "description": "Opportunity ID"
        },
        "riskScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Overall risk score (0-1)"
        },
        "revenueAtRisk": {
          "type": "number",
          "description": "Revenue at risk amount"
        },
        "detectedRisksCount": {
          "type": "integer",
          "description": "Number of detected risks"
        },
        "trigger": {
          "type": "string",
          "enum": ["scheduled", "opportunity_updated", "shard_created", "shard_updated", "manual", "risk_catalog_created", "risk_catalog_updated", "workflow"],
          "description": "What triggered the evaluation"
        },
        "workflowId": {
          "type": "string",
          "format": "uuid",
          "description": "Workflow ID if triggered by workflow"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "correlationId": {
          "type": "string",
          "description": "Correlation ID for request tracking"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who triggered the evaluation"
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
  "type": "risk.evaluation.completed",
  "version": "1.0.0",
  "timestamp": "2026-01-23T10:30:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": "risk-analytics",
  "data": {
    "evaluationId": "789e4567-e89b-12d3-a456-426614174001",
    "opportunityId": "456e4567-e89b-12d3-a456-426614174002",
    "riskScore": 0.65,
    "revenueAtRisk": 325000,
    "detectedRisksCount": 5,
    "trigger": "opportunity_updated"
  },
  "metadata": {
    "correlationId": "corr-123",
    "userId": "user-456"
  }
}
```

---

### revenue-at-risk.calculated

**Description**: Emitted when revenue at risk is calculated for an opportunity, portfolio, team, or tenant.

**Triggered When**:
- Revenue at risk calculation completes
- Results are stored in database

**Event Type**: `revenue-at-risk.calculated`

**Publisher**: `src/services/RevenueAtRiskService.ts` → `publishRiskAnalyticsEvent()`

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
      "const": "revenue-at-risk.calculated"
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
      "const": "risk-analytics"
    },
    "data": {
      "type": "object",
      "required": ["opportunityId", "dealValue", "revenueAtRisk", "riskScore"],
      "properties": {
        "opportunityId": {
          "type": "string",
          "format": "uuid"
        },
        "dealValue": {
          "type": "number",
          "description": "Total deal value"
        },
        "revenueAtRisk": {
          "type": "number",
          "description": "Revenue at risk amount"
        },
        "riskScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "scope": {
          "type": "string",
          "enum": ["opportunity", "portfolio", "team", "tenant"],
          "description": "Scope of calculation"
        }
      }
    }
  }
}
```

---

### quota.created

**Description**: Emitted when a quota is created.

**Triggered When**:
- Quota is successfully created
- Quota is stored in database

**Event Type**: `quota.created`

**Publisher**: `src/services/QuotaService.ts` → `publishRiskAnalyticsEvent()`

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
      "const": "quota.created"
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
      "const": "risk-analytics"
    },
    "data": {
      "type": "object",
      "required": ["quotaId", "quotaType"],
      "properties": {
        "quotaId": {
          "type": "string",
          "format": "uuid"
        },
        "quotaType": {
          "type": "string",
          "enum": ["individual", "team", "tenant"]
        },
        "targetUserId": {
          "type": "string",
          "format": "uuid"
        },
        "teamId": {
          "type": "string",
          "format": "uuid"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User who created the quota"
        }
      }
    }
  }
}
```

---

### quota.deleted

**Description**: Emitted when a quota is deleted.

**Triggered When**:
- Quota is successfully deleted from database

**Event Type**: `quota.deleted`

**Publisher**: `src/services/QuotaService.ts` → `publishRiskAnalyticsEvent()`

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
      "const": "quota.deleted"
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
      "const": "risk-analytics"
    },
    "data": {
      "type": "object",
      "required": ["quotaId"],
      "properties": {
        "quotaId": {
          "type": "string",
          "format": "uuid"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User who deleted the quota"
        }
      }
    }
  }
}
```

---

### early-warning.signals-detected

**Description**: Emitted when early warning signals are detected for an opportunity.

**Triggered When**:
- Early warning detection completes
- One or more signals are detected

**Event Type**: `early-warning.signals-detected`

**Publisher**: `src/services/EarlyWarningService.ts` → `publishRiskAnalyticsEvent()`

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
      "const": "early-warning.signals-detected"
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
      "const": "risk-analytics"
    },
    "data": {
      "type": "object",
      "required": ["opportunityId", "signalCount"],
      "properties": {
        "opportunityId": {
          "type": "string",
          "format": "uuid"
        },
        "signalCount": {
          "type": "integer",
          "description": "Number of signals detected"
        },
        "signals": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "signalType": {
                "type": "string",
                "enum": ["stage_stagnation", "activity_drop", "stakeholder_churn", "risk_acceleration", "anomaly"]
              },
              "severity": {
                "type": "string",
                "enum": ["low", "medium", "high", "critical"]
              }
            }
          }
        }
      }
    }
  }
}
```

---

### risk.simulation.completed

**Description**: Emitted when a risk simulation completes.

**Triggered When**:
- Risk simulation finishes processing
- Simulation results are stored

**Event Type**: `risk.simulation.completed`

**Publisher**: `src/services/SimulationService.ts` → `publishRiskAnalyticsEvent()`

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
      "const": "risk.simulation.completed"
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
      "const": "risk-analytics"
    },
    "data": {
      "type": "object",
      "required": ["simulationId", "opportunityId", "scenarioName"],
      "properties": {
        "simulationId": {
          "type": "string",
          "format": "uuid"
        },
        "opportunityId": {
          "type": "string",
          "format": "uuid"
        },
        "scenarioName": {
          "type": "string",
          "description": "Name of the simulation scenario"
        },
        "riskScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "revenueAtRisk": {
          "type": "number"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User who ran the simulation"
        }
      }
    }
  }
}
```

---

## Consumed Events

The Risk Analytics module consumes the following events:

| Event | Handler | Description |
|-------|---------|-------------|
| `opportunity.updated` | RiskAnalyticsEventConsumer | Trigger risk evaluation when opportunity is updated (honors `auto_evaluation.trigger_on_opportunity_update`) |
| `integration.opportunity.updated` | RiskAnalyticsEventConsumer | Trigger risk evaluation when opportunity is updated via integration sync (honors `auto_evaluation.trigger_on_opportunity_update`) |
| `integration.opportunities.updated.batch` | RiskAnalyticsEventConsumer | Trigger parallel risk evaluations for batch opportunity updates (processes opportunities in parallel with concurrency limit) |
| `shard.created` | RiskAnalyticsEventConsumer | Trigger risk evaluation when opportunity shard is created (honors `auto_evaluation.trigger_on_shard_update`) |
| `shard.updated` | RiskAnalyticsEventConsumer | Trigger risk evaluation when opportunity shard is updated (honors `auto_evaluation.trigger_on_shard_update`) |
| `risk.catalog.updated` | RiskAnalyticsEventConsumer | Re-evaluate opportunities whose evaluations reference the updated risk (honors `auto_evaluation.trigger_on_risk_catalog_update`; limit `max_reevaluations_per_catalog_event`) |
| `risk.catalog.enabled` | RiskAnalyticsEventConsumer | Re-evaluate opportunities whose evaluations reference the enabled risk |
| `risk.catalog.disabled` | RiskAnalyticsEventConsumer | Re-evaluate opportunities whose evaluations reference the disabled risk |
| `integration.sync.completed` | RiskAnalyticsEventConsumer | Log only; individual shard/opportunity events trigger evaluations |
| `workflow.risk.analysis.requested` | RiskAnalyticsEventConsumer | Process workflow-triggered risk analysis |
| `workflow.risk.scoring.requested` | RiskAnalyticsEventConsumer | Process workflow-triggered risk scoring |
| `workflow.job.trigger` | BatchJobWorker (queue bi_batch_jobs) | Run risk-snapshot-backfill or outcome-sync (Plan §9.3) |
| `opportunity.outcome.recorded` | RiskAnalyticsEventConsumer | Append to Data Lake /ml_outcomes (DATA_LAKE_LAYOUT §2.2, §3) |

---

## Event Processing

All events published by the Risk Analytics module follow the `DomainEvent<T>` structure pattern and include:
- Unique event ID
- Event type following naming convention: `{domain}.{entity}.{action}`
- Version for schema evolution
- ISO 8601 timestamp
- Tenant ID for multi-tenancy
- Source identifier
- Event data payload
- Optional metadata (correlationId, userId)

The Logging module consumes these events and creates audit log entries for compliance and tracking purposes.
