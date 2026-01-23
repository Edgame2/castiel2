# ML API Reference

## Overview

This document describes the API endpoints for the ML system, including model management, inference for priority use cases (Risk Scoring, Revenue Forecasting, Recommendations), feedback collection, and training orchestration.

## Base URL

All endpoints are prefixed with `/api/v1/ml`

## Authentication

All endpoints require authentication. Include the authentication token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Endpoints

### Model Management

#### List Models

Get a list of available models.

```http
GET /api/v1/ml/models
```

**Query Parameters:**
- `modelType` (optional): Filter by model type (`risk_scoring`, `forecasting`, `recommendations`, `llm_fine_tuned`)
- `tenantId` (optional): Filter by tenant ID
- `status` (optional): Filter by status (`training`, `active`, `deprecated`)
- `limit` (optional): Maximum number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "models": [
    {
      "id": "model_123",
      "modelType": "risk_scoring",
      "version": "1.2.3",
      "name": "risk_scoring_1.2.3",
      "status": "active",
      "isDefault": true,
      "metrics": {
        "mse": 0.023,
        "r2Score": 0.87
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "deployedAt": "2025-01-20T10:00:00Z"
    }
  ],
  "total": 10,
  "limit": 100,
  "offset": 0
}
```

#### Get Model

Get details for a specific model.

```http
GET /api/v1/ml/models/:modelId
```

**Response:**
```json
{
  "id": "model_123",
  "modelType": "risk_scoring",
  "version": "1.2.3",
  "name": "risk_scoring_1.2.3",
  "tenantId": null,
  "scope": "global",
  "trainingDate": "2025-01-15T10:00:00Z",
  "trainingExamples": 5000,
  "validationExamples": 750,
  "testExamples": 750,
  "metrics": {
    "mse": 0.023,
    "mae": 0.12,
    "rmse": 0.15,
    "r2Score": 0.87
  },
  "featureSchema": {
    "version": "v1.0",
    "features": [...]
  },
  "featureList": ["dealValue", "probability", "riskScore", ...],
  "featureImportance": {
    "riskScore": 0.25,
    "probability": 0.18,
    ...
  },
  "status": "active",
  "isDefault": true,
  "deployedAt": "2025-01-20T10:00:00Z",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### Get Model Metrics

Get performance metrics for a model.

```http
GET /api/v1/ml/models/:modelId/metrics
```

**Query Parameters:**
- `startDate` (optional): Start date for metrics period
- `endDate` (optional): End date for metrics period

**Response:**
```json
{
  "modelId": "model_123",
  "period": {
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-28T00:00:00Z"
  },
  "metrics": {
    "totalPredictions": 1000,
    "accuratePredictions": 870,
    "accuracy": 0.87,
    "precision": 0.85,
    "recall": 0.89,
    "f1Score": 0.87,
    "mae": 0.12,
    "rmse": 0.15,
    "avgLatency": 245,
    "p95Latency": 450,
    "errorRate": 0.02
  },
  "calculatedAt": "2025-01-28T10:00:00Z"
}
```

### Feedback Collection

#### Submit Risk Feedback

Submit feedback on a risk prediction.

```http
POST /api/v1/ml/feedback
```

**Request Body:**
```json
{
  "opportunityId": "opp_123",
  "riskId": "risk_456",
  "feedbackType": "acknowledge",
  "action": "acknowledged",
  "rating": 5,
  "comment": "Accurate risk identification",
  "predictedRisk": {
    "riskId": "risk_456",
    "riskName": "Budget Constraint",
    "confidence": 0.85
  },
  "modelVersion": "1.2.3"
}
```

**Response:**
```json
{
  "id": "feedback_789",
  "status": "recorded",
  "recordedAt": "2025-01-28T10:00:00Z"
}
```

#### Record Outcome

Record the outcome (won/lost) for an opportunity.

```http
POST /api/v1/ml/outcomes/:opportunityId
```

**Request Body:**
```json
{
  "outcome": "won",
  "outcomeDate": "2025-01-28T10:00:00Z",
  "finalValue": 50000,
  "finalRevenue": 50000,
  "actualRisks": ["risk_456", "risk_789"],
  "mitigationEffectiveness": {
    "engage_stakeholder": 0.8,
    "accelerate_review": 0.6
  }
}
```

**Response:**
```json
{
  "id": "outcome_123",
  "status": "recorded",
  "recordedAt": "2025-01-28T10:00:00Z",
  "predictionAccuracy": {
    "riskScoreAccuracy": 0.92,
    "outcomeAccuracy": 1.0
  }
}
```

#### Get Feedback Statistics

Get feedback statistics for analysis.

```http
GET /api/v1/ml/feedback/stats
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `tenantId` (optional): Filter by tenant

**Response:**
```json
{
  "period": {
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-28T00:00:00Z"
  },
  "totalFeedback": 500,
  "feedbackByType": {
    "acknowledge": 300,
    "dismiss": 100,
    "correct": 50,
    "mitigate": 50
  },
  "averageRating": 4.2,
  "feedbackQuality": 0.84
}
```

### Training

#### Schedule Training

Schedule a model training job.

```http
POST /api/v1/ml/training/schedule
```

**Request Body:**
```json
{
  "modelType": "risk_scoring",
  "options": {
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-28T00:00:00Z",
    "minSnapshots": 1000,
    "includeOutcomes": true,
    "hyperparameterOptimization": true
  }
}
```

**Response:**
```json
{
  "jobId": "training_job_123",
  "status": "scheduled",
  "estimatedDuration": 7200,
  "scheduledAt": "2025-01-28T10:00:00Z"
}
```

#### Get Training Status

Get the status of a training job.

```http
GET /api/v1/ml/training/:jobId
```

**Response:**
```json
{
  "jobId": "training_job_123",
  "status": "running",
  "progress": 0.65,
  "currentStep": "model_training",
  "startedAt": "2025-01-28T10:00:00Z",
  "estimatedCompletion": "2025-01-28T12:00:00Z",
  "metrics": {
    "trainingExamples": 5000,
    "validationExamples": 750,
    "testExamples": 750
  }
}
```

#### List Training Jobs

List training jobs.

```http
GET /api/v1/ml/training
```

**Query Parameters:**
- `status` (optional): Filter by status
- `modelType` (optional): Filter by model type
- `limit` (optional): Maximum results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "training_job_123",
      "modelType": "risk_scoring",
      "status": "completed",
      "startedAt": "2025-01-28T10:00:00Z",
      "completedAt": "2025-01-28T12:00:00Z",
      "result": {
        "modelId": "model_123",
        "metrics": {
          "r2Score": 0.87
        }
      }
    }
  ],
  "total": 10
}
```

### Inference

#### Get ML-Enhanced Risk Evaluation

Get a risk evaluation enhanced with ML predictions. **All risk scores are calibrated** using Platt Scaling or Isotonic Regression to ensure interpretable probabilities (see [ML_OPERATIONAL_STANDARDS.md](../ML_OPERATIONAL_STANDARDS.md)).

```http
POST /api/v1/ml/opportunities/:opportunityId/evaluate
```

**Request Body:**
```json
{
  "includeMLPredictions": true,
  "includeOutcomePrediction": true,
  "includeMitigationRecommendations": true
}
```

**Response:**
```json
{
  "evaluationDate": "2025-01-28T10:00:00Z",
  "riskScore": 0.65,
  "categoryScores": {
    "Commercial": 0.7,
    "Technical": 0.6,
    "Financial": 0.5
  },
  "revenueAtRisk": 32500,
  "risks": [...],
  "mlPredictions": {
    "riskScore": {
      "predicted": 0.68,
      "confidence": 0.92,
      "modelVersion": "1.2.3",
      "calibrated": true,
      "calibrationMethod": "platt"
    },
    "outcome": {
      "wonProbability": 0.75,
      "lostProbability": 0.25,
      "confidence": 0.88,
      "modelVersion": "1.2.3"
    },
    "mitigationRecommendations": [
      {
        "action": "engage_stakeholder",
        "priority": "high",
        "expectedImpact": 0.8,
        "confidence": 0.85
      }
    ]
  },
  "calculatedAt": "2025-01-28T10:00:00Z"
}
```

#### Async Inference (Phase 2)

**Note:** Async inference mode is required for batch forecasts and dashboards (see [ML_OPERATIONAL_STANDARDS.md](../ML_OPERATIONAL_STANDARDS.md)). This prevents UI blocking and reduces latency pressure.

**Request Async Inference:**

```http
POST /api/v1/ml/inference/async
```

**Request Body:**
```json
{
  "modelType": "forecasting",
  "features": {
    "dealValue": 50000,
    "probability": 0.75,
    "daysToClose": 30
  },
  "callbackUrl": "https://api.example.com/webhooks/inference-complete"
}
```

**Response:**
```json
{
  "jobId": "inference_job_123",
  "status": "queued",
  "estimatedCompletion": "2025-01-28T10:00:30Z",
  "createdAt": "2025-01-28T10:00:00Z"
}
```

**Poll for Results:**

```http
GET /api/v1/ml/inference/async/:jobId
```

**Response (Processing):**
```json
{
  "jobId": "inference_job_123",
  "status": "processing",
  "estimatedCompletion": "2025-01-28T10:00:30Z"
}
```

**Response (Completed):**
```json
{
  "jobId": "inference_job_123",
  "status": "completed",
  "result": {
    "prediction": 37500,
    "confidence": 0.92,
    "modelVersion": "1.2.3"
  },
  "completedAt": "2025-01-28T10:00:25Z"
}
```

**Response (Failed):**
```json
{
  "jobId": "inference_job_123",
  "status": "failed",
  "error": "Model endpoint unavailable",
  "failedAt": "2025-01-28T10:00:15Z"
}
```

### A/B Testing

#### Setup A/B Test

Setup an A/B test between two model versions.

```http
POST /api/v1/ml/ab-tests
```

**Request Body:**
```json
{
  "modelType": "risk_scoring",
  "newModelId": "model_456",
  "trafficPercentage": 10,
  "durationDays": 7,
  "tenantId": "tenant_123"
}
```

**Response:**
```json
{
  "abTestId": "ab_test_123",
  "controlModelId": "model_123",
  "treatmentModelId": "model_456",
  "trafficPercentage": 10,
  "status": "active",
  "startDate": "2025-01-28T10:00:00Z",
  "endDate": "2025-02-04T10:00:00Z"
}
```

#### Get A/B Test Results

Get results for an A/B test.

```http
GET /api/v1/ml/ab-tests/:abTestId/results
```

**Response:**
```json
{
  "abTestId": "ab_test_123",
  "status": "completed",
  "winner": "treatment",
  "significance": {
    "pValue": 0.03,
    "statisticallySignificant": true
  },
  "controlMetrics": {
    "accuracy": 0.85,
    "mae": 0.15,
    "requestCount": 900
  },
  "treatmentMetrics": {
    "accuracy": 0.88,
    "mae": 0.12,
    "requestCount": 100
  },
  "recommendation": "Promote treatment model to default",
  "evaluatedAt": "2025-02-04T10:00:00Z"
}
```

### Model Deployment

#### Deploy Model

Deploy a model to production.

```http
POST /api/v1/ml/models/:modelId/deploy
```

**Request Body:**
```json
{
  "environment": "production",
  "setAsDefault": true
}
```

**Response:**
```json
{
  "modelId": "model_123",
  "status": "deployed",
  "deployedAt": "2025-01-28T10:00:00Z",
  "environment": "production",
  "isDefault": true
}
```

#### Rollback Model

Rollback to a previous model version.

```http
POST /api/v1/ml/models/rollback
```

**Request Body:**
```json
{
  "modelType": "risk_scoring",
  "tenantId": "tenant_123"
}
```

**Response:**
```json
{
  "previousModelId": "model_123",
  "newDefaultModelId": "model_122",
  "rolledBackAt": "2025-01-28T10:00:00Z"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "modelType",
    "issue": "Invalid model type"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Model not found",
  "modelId": "model_123"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "req_123"
}
```

## Rate Limiting

API requests are rate-limited:
- **Standard**: 100 requests per minute per user
- **Training**: 10 requests per hour per user
- **Deployment**: 5 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

Subscribe to training job completion events:

```http
POST /api/v1/ml/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/training-complete",
  "events": ["training.completed", "training.failed"],
  "secret": "your-webhook-secret"
}
```

## SDK Examples

### TypeScript/JavaScript

```typescript
import { RiskMLClient } from '@castiel/risk-ml-client';

const client = new RiskMLClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.castiel.com'
});

// Get ML-enhanced evaluation
const evaluation = await client.evaluateOpportunity('opp_123', {
  includeMLPredictions: true,
  includeOutcomePrediction: true
});

// Submit feedback
await client.submitFeedback({
  opportunityId: 'opp_123',
  riskId: 'risk_456',
  action: 'acknowledged',
  rating: 5
});

// Record outcome
await client.recordOutcome('opp_123', {
  outcome: 'won',
  finalValue: 50000
});
```

### Python

```python
from castiel_risk_ml import RiskMLClient

client = RiskMLClient(
    api_key='your-api-key',
    base_url='https://api.castiel.com'
)

# Get ML-enhanced evaluation
evaluation = client.evaluate_opportunity(
    'opp_123',
    include_ml_predictions=True,
    # Use forecasting endpoint instead
    # POST /api/v1/ml/forecasting/predict
)

# Submit feedback
client.submit_feedback(
    opportunity_id='opp_123',
    risk_id='risk_456',
    action='acknowledged',
    rating=5
)
```

---

## CAIS Services API

**Base URL:** `/api/cais`

All CAIS (Compound AI System) service endpoints are prefixed with `/api/cais`. For complete documentation of all 22 new services, see [CAIS_NEW_SERVICES_DOCUMENTATION.md](./CAIS_NEW_SERVICES_DOCUMENTATION.md).

### Quick Reference

#### Conflict Resolution Learning
- `POST /api/cais/conflict-resolution/resolve` - Resolve conflict with learned strategy
- `POST /api/cais/conflict-resolution/record-outcome` - Record outcome for learning

#### Memory Management
- `POST /api/cais/memory/store` - Store memory in appropriate tier
- `GET /api/cais/memory/retrieve/:contextKey` - Retrieve memories

#### Communication Analysis
- `POST /api/cais/communication/analyze-email` - Analyze email content
- `POST /api/cais/communication/analyze-meeting` - Analyze meeting transcript

#### Forecast Services
- `POST /api/cais/forecast-decomposition/decompose` - Decompose forecast
- `POST /api/cais/consensus-forecasting/generate` - Generate consensus forecast
- `POST /api/cais/forecast-commitment/analyze` - Analyze commitment

#### Playbook Execution
- `POST /api/cais/playbook/create` - Create playbook
- `POST /api/cais/playbook/execute` - Execute playbook

#### Self-Healing
- `POST /api/cais/self-healing/detect-and-remediate` - Detect and remediate issues
- `POST /api/cais/self-healing/policy` - Create remediation policy

**Note:** For complete API documentation including request/response schemas, authentication, and error handling, refer to [CAIS_NEW_SERVICES_DOCUMENTATION.md](./CAIS_NEW_SERVICES_DOCUMENTATION.md).
