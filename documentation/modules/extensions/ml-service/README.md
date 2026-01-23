# ML Service Module

Machine learning model management and prediction service.

**Service**: `containers/ml-service/`  
**Port**: 3033  
**API Base**: `/api/v1/ml`  
**Database**: Cosmos DB NoSQL (containers: `ml_models`, `ml_features`, `ml_training_jobs`, `ml_evaluations`, `ml_predictions`)

## Overview

The ML Service module provides machine learning model management, training, evaluation, and prediction capabilities.

## Features

- Feature store management
- Model versioning and deployment
- Training job management
- Model evaluation and metrics
- Model calibration
- Synthetic data generation
- Risk scoring predictions
- Revenue forecasting
- ML-based recommendations

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/ml-service/README.md)

## Dependencies

- AI Service (for AI model access)
- Logging (for audit logging)

