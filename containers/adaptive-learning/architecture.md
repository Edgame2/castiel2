# Adaptive Learning Module - Architecture

## Overview

The Adaptive Learning module implements a CAIS (Compound AI System) adaptive learning system for automatically learning optimal parameters for AI/ML components. It provides adaptive weight learning, model selection, signal weighting, and performance tracking.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `adaptive_learning_paths` | `/tenantId` | Learning paths and configurations |
| `adaptive_progress` | `/tenantId` | Learning progress tracking |
| `adaptive_skills` | `/tenantId` | Skill definitions and assessments |
| `adaptive_assessments` | `/tenantId` | Assessment data |
| `adaptive_assessment_results` | `/tenantId` | Assessment results and outcomes |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation and efficient tenant-scoped queries.

## Service Architecture

### Core Services

1. **LearningPathService** - Manages learning paths and configurations
2. **ProgressService** - Tracks learning progress and outcomes
3. **SkillService** - Manages skill definitions and assessments
4. **AssessmentService** - Handles assessment creation and evaluation

## Data Flow

```
User Request
    ↓
API Gateway
    ↓
Adaptive Learning Service
    ↓
AI Service / ML Service (for learning)
    ↓
Cosmos DB (store results)
    ↓
Event Publisher (RabbitMQ)
```

## Event Publishing

The module publishes events to RabbitMQ:
- `adaptive.learning.path.created`
- `adaptive.learning.progress.updated`
- `adaptive.learning.assessment.completed`

## External Dependencies

- **AI Service**: For AI-powered learning recommendations
- **ML Service**: For machine learning model training
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
