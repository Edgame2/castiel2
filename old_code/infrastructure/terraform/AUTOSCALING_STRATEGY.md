# Auto-Scaling Strategy for Castiel Platform

## Overview

This document defines the auto-scaling strategy for Castiel platform services deployed on Azure Container Apps. Auto-scaling ensures optimal resource utilization, cost efficiency, and performance under varying load conditions.

## Scaling Triggers

### 1. Queue Depth (Workers Only)
- **Metric**: `queue.depth` (custom metric from Application Insights)
- **Purpose**: Scale workers based on job backlog
- **Thresholds**:
  - **Scale Up**: Queue depth > 100 jobs per worker
  - **Scale Down**: Queue depth < 20 jobs per worker
- **Cooldown**: 5 minutes (300 seconds)

### 2. CPU Utilization
- **Metric**: Container CPU usage percentage
- **Purpose**: Scale based on compute resource utilization
- **Thresholds**:
  - **Scale Up**: CPU > 70% for 2 minutes
  - **Scale Down**: CPU < 30% for 5 minutes
- **Cooldown**: 2 minutes for scale-up, 5 minutes for scale-down

### 3. Memory Utilization
- **Metric**: Container memory usage percentage
- **Purpose**: Scale based on memory resource utilization
- **Thresholds**:
  - **Scale Up**: Memory > 80% for 2 minutes
  - **Scale Down**: Memory < 40% for 5 minutes
- **Cooldown**: 2 minutes for scale-up, 5 minutes for scale-down

### 4. HTTP Request Rate (API Only)
- **Metric**: Requests per second
- **Purpose**: Scale API based on traffic load
- **Thresholds**:
  - **Scale Up**: > 50 requests/second per replica for 2 minutes
  - **Scale Down**: < 10 requests/second per replica for 5 minutes
- **Cooldown**: 2 minutes for scale-up, 5 minutes for scale-down

## Scaling Policies

### Workers (Processing, Sync, Ingestion)

**Min Replicas**:
- Development: 0 (scale to zero)
- Production: 1

**Max Replicas**:
- Development: 3
- Production: 20

**Scale Rules**:
1. **Queue Depth Rule** (Primary)
   - Type: Custom metric (Application Insights)
   - Metric: `queue.depth`
   - Scale up: > 100 jobs per replica
   - Scale down: < 20 jobs per replica
   - Cooldown: 5 minutes

2. **CPU Rule** (Secondary)
   - Type: CPU utilization
   - Scale up: > 70% for 2 minutes
   - Scale down: < 30% for 5 minutes
   - Cooldown: 2 minutes (up), 5 minutes (down)

3. **Memory Rule** (Secondary)
   - Type: Memory utilization
   - Scale up: > 80% for 2 minutes
   - Scale down: < 40% for 5 minutes
   - Cooldown: 2 minutes (up), 5 minutes (down)

### API Service

**Min Replicas**:
- Development: 0 (scale to zero)
- Production: 2 (for high availability)

**Max Replicas**:
- Development: 3
- Production: 20

**Scale Rules**:
1. **HTTP Request Rate Rule** (Primary)
   - Type: HTTP requests per second
   - Scale up: > 50 requests/second per replica for 2 minutes
   - Scale down: < 10 requests/second per replica for 5 minutes
   - Cooldown: 2 minutes (up), 5 minutes (down)

2. **CPU Rule** (Secondary)
   - Type: CPU utilization
   - Scale up: > 70% for 2 minutes
   - Scale down: < 30% for 5 minutes
   - Cooldown: 2 minutes (up), 5 minutes (down)

3. **Memory Rule** (Secondary)
   - Type: Memory utilization
   - Scale up: > 80% for 2 minutes
   - Scale down: < 40% for 5 minutes
   - Cooldown: 2 minutes (up), 5 minutes (down)

## Cooldown Periods

Cooldown periods prevent rapid scaling oscillations:

- **Scale-Up Cooldown**: 2-5 minutes (shorter to respond quickly to load)
- **Scale-Down Cooldown**: 5 minutes (longer to ensure load has truly decreased)

## Scale Calculation

### Queue Depth Scaling
For workers, the target replica count is calculated as:
```
target_replicas = ceil(queue_depth / jobs_per_replica)
```
Where `jobs_per_replica = 100` (configurable threshold)

### CPU/Memory Scaling
For CPU and memory, scaling uses percentage-based thresholds:
- Scale up when utilization exceeds threshold for duration
- Scale down when utilization falls below threshold for duration

## Implementation Notes

1. **Queue Depth Metrics**: Exposed via Application Insights custom metrics (`queue.depth`)
2. **Health Check Endpoints**: Workers expose `/health` endpoint with queue depth information
3. **Metrics Endpoint**: Application Insights automatically collects metrics from Container Apps
4. **Scaling Rules**: Configured via Terraform `scale` blocks in Container App resources

## Cost Optimization

- **Scale to Zero**: Enabled for development environments
- **Min Replicas**: Set to minimum required for production availability
- **Max Replicas**: Capped to prevent runaway costs
- **Cooldown Periods**: Prevent unnecessary scaling operations

## Monitoring

Auto-scaling behavior is monitored via:
- Application Insights dashboards (queue metrics, worker metrics)
- Container Apps metrics (CPU, memory, replica count)
- Alerts for scaling events and anomalies

## Validation

After implementation, validate:
- Scale-up triggers correctly under load
- Scale-down occurs when load decreases
- No service disruption during scaling
- Cost remains within budget
- Scaling behavior matches expected patterns
