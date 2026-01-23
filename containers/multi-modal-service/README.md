# Multi-Modal Service Module

Handle multi-modal inputs (images, diagrams, audio, video) for Coder IDE, providing image understanding, diagram parsing, audio transcription, and video analysis.

## Features

- **Image Understanding**: Design-to-code conversion, screenshot analysis, wireframe parsing
- **Diagram Understanding**: Architecture diagrams, flowcharts, UML, ER diagrams to code
- **Audio Understanding**: Voice command transcription, meeting notes, tutorial audio
- **Video Understanding**: Tutorial-to-implementation, demo analysis, screen recording processing
- **Whiteboard Parsing**: Hand-drawn diagrams and sketches
- **Text Extraction**: OCR from images and video frames
- **Code Generation**: Generate code from visual inputs
- **Structured Data Extraction**: Parse diagrams into structured formats

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service (for understanding and generation)
- Code Generation Service (for code generation)
- Context Service (for context assembly)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `multimodal_jobs` - Multi-modal processing job data

### Environment Variables

```bash
PORT=3044
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://localhost:3006
CODE_GENERATION_URL=http://localhost:3040
CONTEXT_SERVICE_URL=http://localhost:3034
RABBITMQ_URL=amqp://localhost:5672
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Architecture

The Multi-Modal Service processes different media types:

1. **Images**: OCR, element detection, design-to-code
2. **Diagrams**: Architecture parsing, flowchart analysis
3. **Audio**: Speech-to-text, command extraction
4. **Video**: Frame analysis, tutorial extraction

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `multimodal.job.created` | `{ jobId, type, tenantId }` | Multi-modal job created |
| `multimodal.job.completed` | `{ jobId, output, analysis }` | Multi-modal job completed |
| `multimodal.job.failed` | `{ jobId, error }` | Multi-modal job failed |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3044 | Server port |
| `server.host` | string | 0.0.0.0 | Server host |
| `cosmos_db.endpoint` | string | - | Cosmos DB endpoint |
| `cosmos_db.key` | string | - | Cosmos DB key |
| `cosmos_db.database_id` | string | castiel | Database ID |

## Testing

```bash
npm test
```

## License

Proprietary - Coder IDE

