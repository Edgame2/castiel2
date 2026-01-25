# Multi-Modal Service Module - Architecture

## Overview

The Multi-Modal Service module handles multi-modal inputs (images, diagrams, audio, video) for Castiel, providing image understanding, diagram parsing, audio transcription, and video analysis.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `multimodal_jobs` | `/tenantId` | Multi-modal job data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ImageService** - Image understanding and analysis
2. **DiagramService** - Diagram parsing and conversion
3. **AudioService** - Audio transcription
4. **VideoService** - Video analysis
5. **OCRService** - Text extraction from images/video

## Data Flow

```
User Request (image/diagram/audio/video)
    ↓
Multi-Modal Service
    ↓
AI Service (understanding and generation)
    ↓
Code Generation Service (code generation)
    ↓
Context Service (context assembly)
    ↓
Cosmos DB (store job data)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **AI Service**: For understanding and generation
- **Code Generation Service**: For code generation
- **Context Service**: For context assembly
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
