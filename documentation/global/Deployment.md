# Deployment Architecture

## Overview

This document describes the deployment architecture for Castiel, including Docker Compose setup, service dependencies, port assignments, environment variables, and scaling considerations.

## Deployment Architecture

```mermaid
graph TB
    subgraph Docker["Docker Compose"]
        subgraph Infrastructure["Infrastructure Services"]
            Postgres[(PostgreSQL<br/>5432)]
            RabbitMQ[RabbitMQ<br/>5672, 15672]
            Redis[Redis<br/>6379]
        end
        
        subgraph MainApp["Main Application"]
            Gateway[API Gateway<br/>3000]
        end
        
        subgraph Microservices["Microservices"]
            S1[Service 1<br/>3001-3020]
            S2[Service 2]
            S3[Service 3]
            S4[...]
        end
    end
    
    Gateway -->|Depends on| Infrastructure
    Gateway -->|Depends on| Microservices
    Microservices -->|Depends on| Infrastructure
    Microservices -->|Connects to| Postgres
    Microservices -->|Connects to| RabbitMQ
    Gateway -->|Connects to| Redis
```

## Docker Compose Structure

### Infrastructure Services

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: castiel
      POSTGRES_USER: coder
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

### Main Application

```yaml
  main-app:
    build: ./server
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - rabbitmq
      - redis
    environment:
      DATABASE_URL: postgresql://coder:${DB_PASSWORD}@postgres:5432/castiel
      RABBITMQ_URL: amqp://rabbitmq:5672
      REDIS_URL: redis://redis:6379
      PORT: 3000
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
```

### Microservices

Each microservice follows this pattern:

```yaml
  service-name:
    build: ./containers/service-name
    ports:
      - "PORT:PORT"
    depends_on:
      - postgres
      - rabbitmq
      - secret-management
    environment:
      DATABASE_URL: postgresql://coder:${DB_PASSWORD}@postgres:5432/castiel
      RABBITMQ_URL: amqp://rabbitmq:5672
      SECRET_SERVICE_URL: http://secret-management:3000
      PORT: PORT
      SERVICE_NAME: service-name
```

## Service Dependencies

### Startup Order

1. **Infrastructure** (PostgreSQL, RabbitMQ, Redis)
2. **Foundation Services** (Secret Management, Usage Tracking)
3. **AI Services** (AI Service, Embeddings, Prompt Management)
4. **Planning Services** (Planning, Execution, Knowledge Base)
5. **Productivity Services** (Calendar, Messaging, etc.)
6. **Main Application** (API Gateway)

### Dependency Graph

```mermaid
graph TB
    Infra[Infrastructure<br/>PostgreSQL, RabbitMQ, Redis]
    
    Secret[Secret Management<br/>3003]
    Usage[Usage Tracking<br/>3004]
    Notif[Notification Manager<br/>3001]
    
    AI[AI Service<br/>3006]
    Embed[Embeddings<br/>3005]
    Prompt[Prompt Management<br/>3002]
    
    MCP[MCP Server<br/>3009]
    KB[Knowledge Base<br/>3010]
    Planning[Planning<br/>3007]
    Exec[Execution<br/>3008]
    
    Gateway[API Gateway<br/>3000]
    
    Infra --> Secret
    Infra --> Usage
    Infra --> Notif
    
    Secret --> AI
    Secret --> Embed
    Secret --> Prompt
    
    AI --> MCP
    Embed --> KB
    Prompt --> Planning
    MCP --> KB
    KB --> Planning
    
    Planning --> Exec
    
    All[All Services] --> Gateway
```

## Port Assignments

| Service | Port | External Access |
|---------|------|----------------|
| **API Gateway** | 3000 | Yes (main entry) |
| **Notification Manager** | 3001 | No (internal) |
| **Prompt Management** | 3002 | No (internal) |
| **Secret Management** | 3003 | No (internal) |
| **Usage Tracking** | 3004 | No (internal) |
| **Embeddings** | 3005 | No (internal) |
| **AI Service** | 3006 | No (internal) |
| **Planning** | 3007 | No (internal) |
| **Execution** | 3008 | No (internal) |
| **MCP Server** | 3009 | No (internal) |
| **Knowledge Base** | 3010 | No (internal) |
| **Dashboard** | 3011 | No (internal) |
| **Calendar** | 3012 | No (internal) |
| **Messaging** | 3013 | No (internal) |
| **Logging** | 3014 | No (internal) |
| **Learning & Development** | 3015 | No (internal) |
| **Collaboration** | 3016 | No (internal) |
| **Quality** | 3017 | No (internal) |
| **Resource Management** | 3018 | No (internal) |
| **Workflow** | 3019 | No (internal) |
| **Observability** | 3020 | No (internal) |
| **PostgreSQL** | 5432 | Optional (dev) |
| **RabbitMQ** | 5672 | No (internal) |
| **RabbitMQ Management** | 15672 | Optional (dev) |
| **Redis** | 6379 | No (internal) |

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://coder:password@postgres:5432/castiel

# Message Queue
RABBITMQ_URL=amqp://rabbitmq:5672

# Cache
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Service URLs
SECRET_SERVICE_URL=http://secret-management:3000
AI_SERVICE_URL=http://ai-service:3000
# ... other service URLs

# Application
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
```

### Service-Specific Variables

Each service may have additional environment variables:
- API keys for external services
- Service-specific configuration
- Feature flags
- Rate limits
- Timeouts

## Network Architecture

### Docker Network

All services run on a shared Docker network (`coder-network`):

```yaml
networks:
  coder-network:
    driver: bridge
```

### Service Discovery

Services discover each other via Docker Compose service names:
- `http://service-name:PORT`
- Example: `http://ai-service:3006`

## Scaling Considerations

### Horizontal Scaling

**Stateless Services**
- All microservices are stateless
- Can be scaled horizontally
- Load balancing via API Gateway

**Scaling Strategy**:
```yaml
  ai-service:
    deploy:
      replicas: 3
    # Load balanced via API Gateway
```

### Vertical Scaling

**Resource Limits**:
```yaml
  service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Database Scaling

**Read Replicas**:
- Primary database for writes
- Read replicas for read-heavy operations
- Connection pooling via Prisma

**Database Optimization**:
- Strategic indexing
- Query optimization
- Connection pooling
- Caching layer (Redis)

## Production Deployment

### Recommended Setup

1. **Container Orchestration**
   - Kubernetes (recommended for production)
   - Docker Swarm (alternative)
   - Docker Compose (development)

2. **Load Balancing**
   - API Gateway load balancer
   - Service mesh (optional)

3. **High Availability**
   - Multiple API Gateway instances
   - Database replication
   - Redis cluster
   - RabbitMQ cluster

4. **Monitoring**
   - Prometheus for metrics
   - Grafana for dashboards
   - ELK stack for logging
   - Distributed tracing

5. **Security**
   - HTTPS/TLS
   - Network policies
   - Secret management
   - Security scanning

### Production Checklist

- [ ] Environment variables configured
- [ ] Secrets properly managed
- [ ] Database backups configured
- [ ] Monitoring and alerting setup
- [ ] Log aggregation configured
- [ ] Health checks implemented
- [ ] Graceful shutdown handling
- [ ] Resource limits set
- [ ] Network security configured
- [ ] SSL/TLS certificates configured

## Health Checks

### Service Health Checks

Each service implements health check endpoints:

```typescript
// Health check endpoints
GET /health        // Basic health
GET /health/ready  // Readiness check
GET /health/live   // Liveness check
```

### Docker Health Checks

```yaml
  service:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Backup and Recovery

### Database Backups

- **Automated Backups**: Daily database backups
- **Backup Storage**: Secure backup storage
- **Recovery Testing**: Regular recovery testing

### Configuration Backups

- **Environment Variables**: Version controlled
- **Docker Compose**: Version controlled
- **Secrets**: Secure secret management

## Monitoring

### Metrics Collection

- **Prometheus**: Metrics collection
- **Service Metrics**: Per-service metrics
- **System Metrics**: Infrastructure metrics

### Logging

- **Centralized Logging**: ELK stack or similar
- **Log Aggregation**: All service logs
- **Log Retention**: Configurable retention

### Alerting

- **Service Alerts**: Service health alerts
- **Performance Alerts**: Performance degradation
- **Error Alerts**: Error rate alerts

## Related Documentation

- [Architecture](./Architecture.md) - System architecture
- [Technology Stack](./TechnologyStack.md) - Technologies used
- [Data Flow](./DataFlow.md) - Communication patterns
