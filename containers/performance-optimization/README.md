# Performance Optimization Module

Code performance optimization service for Coder IDE, providing code optimization, bundle size optimization, database query optimization, algorithm selection, and memory optimization.

## Features

- **Code Optimization**: Optimize code execution performance
- **Bundle Size Optimization**: Reduce bundle sizes
- **Database Query Optimization**: Optimize database queries
- **Algorithm Selection**: Recommend optimal algorithms
- **Memory Optimization**: Optimize memory usage
- **Network Optimization**: Optimize network performance
- **Render Optimization**: Optimize rendering performance
- **Baseline Metrics**: Measure baseline performance
- **Optimized Metrics**: Track optimization improvements
- **Recommendations**: Generate optimization recommendations

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Context Service (for code context)
- Observability Service (for metrics)
- Execution Service (for code execution)
- Quality Service (for code quality)

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

- `performance_optimizations` - Performance optimization data

### Environment Variables

```bash
PORT=3041
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
CONTEXT_SERVICE_URL=http://localhost:3034
OBSERVABILITY_URL=http://localhost:3018
EXECUTION_URL=http://localhost:3019
QUALITY_URL=http://localhost:3017
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

The Performance Optimization service provides multiple optimization types:

1. **Code**: Execution time optimization
2. **Bundle Size**: JavaScript bundle size reduction
3. **Database Query**: Query performance optimization
4. **Algorithm**: Algorithm selection and optimization
5. **Memory**: Memory usage optimization
6. **Network**: Network performance optimization
7. **Render**: Rendering performance optimization

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `performance.optimization.created` | `{ optimizationId, type, tenantId }` | Optimization created |
| `performance.optimization.completed` | `{ optimizationId, improvements }` | Optimization completed |
| `performance.optimization.failed` | `{ optimizationId, error }` | Optimization failed |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3041 | Server port |
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

