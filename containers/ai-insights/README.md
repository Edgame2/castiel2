# AI Insights Module

AI-powered insights and recommendations service for Castiel.

## Features

- **AI Insights**: Generate insights from shard data
- **Proactive Insights**: Automated insight generation
- **Collaborative Insights**: Shared insights and collaboration
- **Risk Analysis**: Comprehensive risk evaluation and analysis
  - RiskEvaluationService with adaptive weights
  - ML-based risk score predictions
  - Multiple risk detection methods
  - Risk catalog management
  - Revenue at risk calculations
  - Early warning system
  - Risk explainability
- **Search**: AI-powered search capabilities

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+
- AI Service
- Shard Manager Service
- Embeddings Service
- Logging Service

### Database Setup

- `ai_insights` - Insight documents (partition key: `/tenantId`)
- `ai_proactive_insights` - Proactive insight triggers (partition key: `/tenantId`)
- `ai_collaborative_insights` - Collaborative insights (partition key: `/tenantId`)
- `ai_risk_analysis` - Risk analysis results (partition key: `/tenantId`)
- `risk_catalog` - Risk catalog definitions (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3027 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| ai_service.url | string | - | AI Service URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/insights` | List insights |
| POST | `/api/v1/insights` | Generate insight |
| GET | `/api/v1/insights/:id` | Get insight |
| GET | `/api/v1/insights/proactive` | Get proactive insights |
| GET | `/api/v1/insights/collaborative` | Get collaborative insights |
| POST | `/api/v1/risk-analysis/evaluate` | Evaluate risk for shard |
| GET | `/api/v1/risk-analysis/catalog` | Get risk catalog |
| POST | `/api/v1/risk-analysis/catalog` | Create risk catalog entry |
| GET | `/api/v1/risk-analysis/revenue-at-risk` | Calculate revenue at risk |
| GET | `/api/v1/risk-analysis/early-warnings` | Get early warnings |

## Events

### Published Events

- `insight.generated` - Insight generated
- `insight.shared` - Insight shared
- `risk.analysis.completed` - Risk analysis completed

## Dependencies

- **AI Service**: For AI model access
- **Shard Manager**: For data access
- **Embeddings**: For vector search
- **ML Service**: For ML-based risk scoring (optional)
- **Adaptive Learning**: For adaptive risk detection weights (optional)
- **Logging**: For audit logging

## License

Proprietary

