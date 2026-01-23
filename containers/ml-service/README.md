# ML Service Module

Machine learning model management and prediction service.

## Features

- **Feature Store**: Feature extraction and management
- **Model Management**: Model versioning and deployment
- **Training Service**: Model training and job management
- **Evaluation Service**: Model evaluation and metrics
- **Calibration Service**: Model calibration
- **Synthetic Data**: Synthetic data generation
- **Risk Scoring**: ML-based risk score predictions
- **Forecasting**: ML-based revenue forecasting
- **Recommendations**: ML-based recommendations

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)
- AI Service
- Logging Service

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers):

- `ml_models` - ML models (partition key: `/tenantId`)
- `ml_features` - Feature store (partition key: `/tenantId`)
- `ml_training_jobs` - Training jobs (partition key: `/tenantId`)
- `ml_evaluations` - Evaluation results (partition key: `/tenantId`)
- `ml_predictions` - Prediction history (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3033 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| ai_service.url | string | - | AI Service URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ml/risk-scoring/predict` | Predict risk score |
| POST | `/api/v1/ml/forecast/predict` | Predict forecast |
| POST | `/api/v1/ml/recommendations` | Get ML recommendations |
| GET | `/api/v1/ml/models` | List models |
| POST | `/api/v1/ml/models` | Create model |
| POST | `/api/v1/ml/training/jobs` | Create training job |
| GET | `/api/v1/ml/training/jobs/:id` | Get training job status |
| POST | `/api/v1/ml/evaluation` | Evaluate model |

## Events

### Published Events

- `ml.model.trained` - Model training completed
- `ml.model.deployed` - Model deployed
- `ml.prediction.made` - Prediction made

## Dependencies

- **AI Service**: For AI model access
- **Logging**: For audit logging

## License

Proprietary

