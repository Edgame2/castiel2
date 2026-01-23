# ML Service Module - Architecture

## Overview

The ML Service module provides machine learning model management, training, evaluation, and prediction capabilities.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `ml_models` | `/tenantId` | ML models and versions |
| `ml_features` | `/tenantId` | Feature store |
| `ml_training_jobs` | `/tenantId` | Training job records |
| `ml_evaluations` | `/tenantId` | Evaluation results |
| `ml_predictions` | `/tenantId` | Prediction history |

## Service Architecture

### Core Services

1. **FeatureStoreService** - Feature extraction and management
2. **ModelService** - Model versioning and deployment
3. **TrainingService** - Model training and job management
4. **EvaluationService** - Model evaluation and metrics
5. **CalibrationService** - Model calibration
6. **SyntheticDataService** - Synthetic data generation

### Prediction Services

- **Risk Scoring**: ML-based risk score predictions for opportunities
- **Forecasting**: ML-based revenue forecasting
- **Recommendations**: ML-based recommendations

## Dependencies

- **AI Service**: For AI model access
- **Logging**: For audit logging

