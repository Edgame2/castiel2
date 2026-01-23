# Health Check Implementation Guide

## Overview

All services in the Castiel platform implement comprehensive health check endpoints for monitoring, orchestration, and load balancing.

## Health Check Endpoints

### API Service (`apps/api`)

- **Health**: `GET /health` - Basic health check
- **Readiness**: `GET /readiness` - Checks if service is ready to accept traffic (verifies Redis connection)
- **Liveness**: `GET /liveness` - Simple check to verify the service process is running

**Example Response:**
```json
{
  "status": "ok",
  "service": "main-api",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Web Service (`apps/web`)

- **Health**: `GET /api/health` - Basic health check

**Example Response:**
```json
{
  "status": "healthy",
  "service": "web",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Workers-Sync Service (`apps/workers-sync`)

- **Health**: `GET /health` - Basic health check
- **Readiness**: `GET /readiness` - Checks Redis and Cosmos DB connections
- **Liveness**: `GET /liveness` - Simple check to verify the service process is running

**Readiness Check Response:**
```json
{
  "status": "ready",
  "service": "workers-sync",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "redis": { "status": "connected" },
    "cosmos": { "status": "connected" },
    "overall": "ready"
  }
}
```

### Workers-Processing Service (`apps/workers-processing`)

- **Health**: `GET /health` - Basic health check
- **Readiness**: `GET /readiness` - Checks Redis and Cosmos DB connections
- **Liveness**: `GET /liveness` - Simple check to verify the service process is running

### Workers-Ingestion Service (`apps/workers-ingestion`)

- **Health**: `GET /health` - Basic health check
- **Readiness**: `GET /readiness` - Checks Redis and Cosmos DB connections
- **Liveness**: `GET /liveness` - Simple check to verify the service process is running

## Docker Health Checks

All Dockerfiles include `HEALTHCHECK` instructions:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Health Check Configuration

- **Interval**: 30 seconds - How often to check
- **Timeout**: 3 seconds - Maximum time to wait for response
- **Start Period**: 5-10 seconds - Grace period after container starts
- **Retries**: 3 - Number of consecutive failures before marking unhealthy

## Azure Container Apps Integration

Azure Container Apps automatically uses the health check endpoints for:
- **Liveness probes**: Determines if a container should be restarted
- **Readiness probes**: Determines if a container is ready to receive traffic

### Recommended Configuration

For Container Apps, configure health probes in Terraform:

```hcl
# Example (if supported by Terraform provider)
health_probe {
  path                = "/health"
  interval_seconds    = 30
  timeout_seconds     = 3
  failure_threshold   = 3
  success_threshold   = 1
}
```

Currently, Container Apps use the Dockerfile `HEALTHCHECK` instruction by default.

## Health Check Status Codes

- **200 OK**: Service is healthy/ready/alive
- **503 Service Unavailable**: Service is not ready (readiness check only)

## Monitoring Integration

Health check results are tracked in:
- **Azure Application Insights**: Custom events and metrics
- **Container Apps Metrics**: Built-in health metrics
- **Docker Health Status**: Available via `docker ps` or `docker inspect`

## Testing Health Checks

### Local Testing

```bash
# API
curl http://localhost:3001/health
curl http://localhost:3001/readiness
curl http://localhost:3001/liveness

# Web
curl http://localhost:3000/api/health

# Workers-Sync
curl http://localhost:8080/health
curl http://localhost:8080/readiness
curl http://localhost:8080/liveness

# Workers-Processing
curl http://localhost:8080/health
curl http://localhost:8080/readiness
curl http://localhost:8080/liveness

# Workers-Ingestion
curl http://localhost:8080/health
curl http://localhost:8080/readiness
curl http://localhost:8080/liveness
```

### Docker Testing

```bash
# Check container health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Inspect health check details
docker inspect <container-name> | jq '.[0].State.Health'
```

### Azure Container Apps Testing

```bash
# Get Container App health status
az containerapp show \
  --name castiel-api-dev \
  --resource-group castiel-dev-rg \
  --query "properties.runningStatus"

# Check revision health
az containerapp revision list \
  --name castiel-api-dev \
  --resource-group castiel-dev-rg \
  --query "[].properties.healthState"
```

## Troubleshooting

### Health Check Failing

1. **Check service logs**:
   ```bash
   docker logs <container-name>
   ```

2. **Verify endpoint is accessible**:
   ```bash
   curl http://localhost:8080/health
   ```

3. **Check dependencies**:
   - Redis connection (for readiness checks)
   - Cosmos DB connection (for readiness checks)
   - Port configuration

4. **Verify environment variables**:
   - `PORT` is set correctly
   - Service is listening on `0.0.0.0` (not `localhost`)

### Readiness Check Failing

If readiness check returns `503`:
- **Redis**: Verify `REDIS_URL` or `REDIS_HOST` is configured correctly
- **Cosmos DB**: Verify `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` are set
- **Network**: Check firewall rules and network connectivity

### Liveness Check Failing

If liveness check fails:
- Service process may have crashed
- Check application logs for errors
- Verify container has sufficient resources (CPU, memory)

## Best Practices

1. **Keep health checks lightweight**: Don't perform expensive operations
2. **Use readiness for dependencies**: Check external services in readiness, not liveness
3. **Set appropriate timeouts**: Balance between responsiveness and reliability
4. **Monitor health metrics**: Track health check success/failure rates
5. **Alert on failures**: Set up alerts for repeated health check failures

## Related Documentation

- [Container Apps Deployment Guide](../ci-cd/CONTAINER_APPS_DEPLOYMENT.md)
- [Monitoring and Observability](./MONITORING.md)
- [Production Runbooks](./PRODUCTION_RUNBOOKS.md)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Health checks fully implemented

#### Implemented Features (✅)

- ✅ Health check endpoints for all services
- ✅ Readiness and liveness probes
- ✅ Docker health checks
- ✅ Azure Container Apps integration
- ✅ Monitoring integration

#### Known Limitations

- ⚠️ **Health Check Coverage** - Some services may not have comprehensive health checks
  - **Recommendation:**
    1. Verify all services have health checks
    2. Add dependency checks (Redis, Cosmos DB)
    3. Document health check coverage

- ⚠️ **Health Check Monitoring** - Health check monitoring may not be fully automated
  - **Recommendation:**
    1. Set up automated health check monitoring
    2. Configure alerts for health check failures
    3. Document monitoring procedures

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview
- [Monitoring Documentation](../monitoring/INTEGRATION_MONITORING.md) - Monitoring setup



