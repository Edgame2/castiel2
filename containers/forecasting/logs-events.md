# Forecasting Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Forecasting module that get logged by the Logging module. These events represent important forecasting activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Forecasting module publishes the following events to the `coder_events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `forecast.completed` | Complete forecast workflow completed | Logging module |
| `forecast.decomposition.completed` | Forecast decomposition completed | Logging module |
| `forecast.consensus.completed` | Consensus forecast completed | Logging module |
| `forecast.commitment.completed` | Forecast commitment completed | Logging module |

---

### forecast.completed

**Description**: Emitted when a complete forecast workflow is finished.

**Triggered When**:
- Forecast generation completes
- Forecast results are stored in database

**Event Type**: `forecast.completed`

**Publisher**: `src/events/publishers/ForecastEventPublisher.ts` → `publishForecastEvent()`

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
      "const": "forecast.completed"
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
      "const": "forecasting"
    },
    "data": {
      "type": "object",
      "required": ["forecastId", "opportunityId"],
      "properties": {
        "forecastId": {
          "type": "string",
          "format": "uuid"
        },
        "opportunityId": {
          "type": "string",
          "format": "uuid"
        },
        "revenueForecast": {
          "type": "number",
          "description": "Forecasted revenue amount"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Forecast confidence score"
        }
      }
    }
  }
}
```
