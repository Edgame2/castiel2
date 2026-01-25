# Forecasting Module - Architecture

## Overview

The Forecasting module provides forecasting and prediction services for the Castiel system. It decomposes forecasts, generates consensus forecasts, manages forecast commitments, and analyzes pipeline health.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `forecast_decompositions` | `/tenantId` | Forecast decompositions |
| `forecast_consensus` | `/tenantId` | Consensus forecasts |
| `forecast_commitments` | `/tenantId` | Forecast commitments |
| `forecast_pipeline_health` | `/tenantId` | Pipeline health data |

## Service Architecture

### Core Services

1. **ForecastingService** - Forecasting orchestration
   - Forecast decomposition
   - Consensus forecasting
   - Forecast commitment management
   - Pipeline health analysis

## Integration Points

- **risk-analytics**: Risk data
- **analytics-service**: Analytics
- **ml-service**: ML-based forecasting
- **adaptive-learning**: CAIS integration
- **pipeline-manager**: Pipeline data

## Event-Driven Communication

**Consumed Events**:
- `opportunity.updated` - Update forecasts when opportunities change
- `risk.evaluation.completed` - Update forecasts when risk evaluations complete
- `integration.sync.completed` - Update forecasts after sync
- `workflow.forecast.requested` - Process workflow-triggered forecast
