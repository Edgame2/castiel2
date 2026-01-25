# ML Service Module - Architecture

## Overview

The ML Service module provides machine learning model management and prediction service for Castiel, including feature store, model training, evaluation, and predictions.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `ml_models` | `/tenantId` | ML model definitions |
| `ml_features` | `/tenantId` | Feature store data |
| `ml_training_jobs` | `/tenantId` | Training job data |
| `ml_evaluations` | `/tenantId` | Evaluation results |
| `ml_predictions` | `/tenantId` | Prediction history |
| `multimodal_jobs` | `/tenantId` | Multi-modal job data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ModelService** - Model management and versioning
2. **FeatureService** - Feature extraction and management
3. **TrainingService** - Model training and job management
4. **EvaluationService** - Model evaluation and metrics
5. **PredictionService** - Prediction generation

## Data Flow

```
User Request
    ↓
ML Service
    ↓
AI Service (for embeddings)
    ↓
Embeddings Service (vector operations)
    ↓
Model Training / Prediction
    ↓
Cosmos DB (store models and results)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **AI Service**: For embeddings
- **Embeddings Service**: For vector operations
- **Logging Service**: For audit logging

## ConfigurationAll configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.