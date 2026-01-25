# Workflow Orchestrator Module - Architecture

## Overview

The Workflow Orchestrator module orchestrates asynchronous workflows for opportunity change events. It coordinates parallel execution of risk analysis, risk scoring, forecasting, and recommendations when opportunities are updated.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `workflow_workflows` | `/tenantId` | Workflow definitions |
| `workflow_steps` | `/tenantId` | Individual workflow steps |
| `workflow_executions` | `/tenantId` | Workflow execution records |

## Service Architecture

### Core Services

1. **WorkflowOrchestratorService** - Main workflow orchestration
   - Detects opportunity change events
   - Orchestrates parallel execution of workflows
   - Manages workflow state and dependencies
   - Handles workflow failures and retries
   - Publishes workflow completion events
   - Tracks workflow execution status

## Integration Points

- **integration-manager**: Detects opportunity changes
- **risk-analytics**: Risk analysis and scoring workflows
- **ml-service**: ML-enhanced workflows
- **forecasting**: Forecasting workflows
- **recommendations**: Recommendation workflows
- **adaptive-learning**: CAIS integration

## Event-Driven Communication

### Published Events

- `workflow.opportunity.analysis.started` - Opportunity analysis workflow started
- `workflow.opportunity.analysis.completed` - Complete analysis workflow finished
- `workflow.opportunity.analysis.failed` - Workflow failed
- `workflow.step.completed` - Individual workflow step completed
- `workflow.risk.analysis.requested` - Request risk analysis (consumed by risk-analytics)
- `workflow.risk.scoring.requested` - Request risk scoring (consumed by risk-analytics)
- `workflow.forecast.requested` - Request forecast (consumed by forecasting)
- `workflow.recommendation.requested` - Request recommendations (consumed by recommendations)

### Consumed Events

- `integration.opportunity.updated` - Salesforce opportunity change detected
- `shard.updated` (opportunity type) - Opportunity shard updated
- `risk.evaluation.completed` - Risk evaluation step completed
- `risk.scoring.completed` - Risk scoring step completed
- `forecast.completed` - Forecast step completed
- `recommendation.generation.completed` - Recommendation step completed

## Workflow Pattern

When integration-manager detects Salesforce opportunity change:

1. Integration Manager publishes: `integration.opportunity.updated`
2. Workflow Orchestrator consumes event
3. Orchestrator creates workflow execution record
4. Orchestrator publishes parallel workflow step events:
   - `workflow.risk.analysis.requested` → risk-analytics
   - `workflow.risk.scoring.requested` → risk-analytics
   - `workflow.forecast.requested` → forecasting
   - `workflow.recommendation.requested` → recommendations
5. Services process in parallel (async)
6. Each service publishes completion event
7. Orchestrator tracks completion of all steps
8. When all complete → Publish: `workflow.opportunity.analysis.completed`

## Security

- All queries include tenantId in partition key
- Workflow state includes tenantId for isolation
- All workflow events include tenantId
