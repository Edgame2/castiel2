# Auto-Scaling Testing Guide

## Overview

This guide provides instructions for testing the auto-scaling implementation for Castiel platform services deployed on Azure Container Apps.

## Prerequisites

- Azure Container Apps environment deployed
- Application Insights configured and collecting metrics
- Monitoring dashboards accessible
- Load testing tools available (e.g., k6, Apache Bench, or custom scripts)

## Testing Checklist

### 1. Pre-Deployment Verification

- [ ] Terraform plan shows scaling rules are configured
- [ ] Min/max replica limits are appropriate for environment
- [ ] Scaling rules syntax is valid (no Terraform errors)
- [ ] Metrics endpoints are accessible (`/metrics` on workers)
- [ ] Health check endpoints return queue depth information

### 2. Scale-Up Testing

#### 2.1 CPU-Based Scaling (Workers)

**Test Scenario**: Generate CPU load to trigger scaling

1. **Setup**:
   - Deploy workers with current configuration
   - Note initial replica count
   - Monitor via Azure Portal or Application Insights

2. **Execute**:
   - Generate CPU-intensive workload (e.g., process large documents, run complex embeddings)
   - Monitor CPU utilization via Container Apps metrics
   - Wait for scaling trigger (CPU > 70% for 2 minutes)

3. **Verify**:
   - Replicas increase when CPU threshold exceeded
   - New replicas start successfully
   - No service disruption during scaling
   - Queue processing continues normally
   - Metrics reflect new replica count

**Expected Result**: Workers scale up from 1 to 2+ replicas when CPU > 70%

#### 2.2 Memory-Based Scaling (Workers)

**Test Scenario**: Generate memory pressure to trigger scaling

1. **Setup**: Same as CPU test

2. **Execute**:
   - Generate memory-intensive workload
   - Monitor memory utilization
   - Wait for scaling trigger (Memory > 80% for 2 minutes)

3. **Verify**: Same as CPU test

**Expected Result**: Workers scale up when memory > 80%

#### 2.3 HTTP Request Rate Scaling (API)

**Test Scenario**: Generate high request rate to trigger API scaling

1. **Setup**:
   - Deploy API with current configuration
   - Note initial replica count (should be min replicas)

2. **Execute**:
   - Use load testing tool to generate > 50 concurrent requests per replica
   - Maintain load for > 2 minutes
   - Monitor request rate via Application Insights

3. **Verify**:
   - API replicas increase when threshold exceeded
   - Response times remain acceptable
   - No errors during scaling
   - Load is distributed across replicas

**Expected Result**: API scales up when > 50 concurrent requests per replica

#### 2.4 Queue Depth Proxy Scaling (Workers)

**Test Scenario**: High queue depth should increase CPU/memory, triggering scaling

1. **Setup**:
   - Deploy workers
   - Enqueue large number of jobs (e.g., 500+ jobs)

2. **Execute**:
   - Monitor queue depth via `/metrics` endpoint
   - Monitor CPU/memory as workers process jobs
   - Wait for CPU/memory thresholds to be exceeded

3. **Verify**:
   - Workers scale up as queue is processed
   - Queue depth decreases as replicas increase
   - All jobs are eventually processed

**Expected Result**: Workers scale up due to CPU/memory load from processing queue backlog

### 3. Scale-Down Testing

#### 3.1 CPU-Based Scale-Down

**Test Scenario**: Reduce load to trigger scale-down

1. **Setup**:
   - Ensure workers are scaled up (2+ replicas)
   - Note current replica count

2. **Execute**:
   - Stop generating load
   - Wait for CPU to drop below 30%
   - Maintain low CPU for 5 minutes (cooldown period)

3. **Verify**:
   - Replicas decrease after cooldown period
   - Remaining replicas continue processing
   - No jobs are lost during scale-down
   - Metrics reflect reduced replica count

**Expected Result**: Workers scale down when CPU < 30% for 5 minutes

#### 3.2 Memory-Based Scale-Down

**Test Scenario**: Similar to CPU scale-down

1. **Execute**:
   - Stop memory-intensive workload
   - Wait for memory to drop below 40%
   - Maintain low memory for 5 minutes

2. **Verify**: Same as CPU scale-down

**Expected Result**: Workers scale down when memory < 40% for 5 minutes

#### 3.3 HTTP Request Rate Scale-Down (API)

**Test Scenario**: Reduce API traffic to trigger scale-down

1. **Setup**: API scaled up (2+ replicas)

2. **Execute**:
   - Reduce request rate to < 10 requests/second per replica
   - Maintain low rate for 5 minutes

3. **Verify**:
   - API replicas decrease after cooldown
   - Remaining replicas handle traffic
   - No request failures during scale-down

**Expected Result**: API scales down when < 10 requests/second per replica for 5 minutes

### 4. Edge Cases and Failure Scenarios

#### 4.1 Rapid Load Changes

**Test**: Rapidly increase and decrease load

**Verify**:
- Scaling doesn't oscillate rapidly
- Cooldown periods prevent thrashing
- System remains stable

#### 4.2 Maximum Replica Limit

**Test**: Generate load that would exceed max replicas

**Verify**:
- Scaling stops at max replica limit
- System handles load at max capacity
- Alerts fire if load exceeds capacity

#### 4.3 Minimum Replica Limit

**Test**: Ensure system doesn't scale below minimum

**Verify**:
- Replicas never go below minimum
- System remains available at minimum replicas

#### 4.4 Service Disruption During Scaling

**Test**: Monitor during scale-up and scale-down

**Verify**:
- No request failures during scaling
- Jobs continue processing
- Health checks remain passing
- No data loss

### 5. Monitoring and Observability

#### 5.1 Metrics Verification

- [ ] Queue depth metrics visible in Application Insights
- [ ] Worker metrics (active jobs, error rate) tracked
- [ ] API metrics (request rate, latency) tracked
- [ ] Replica count changes visible in Container Apps metrics

#### 5.2 Dashboard Verification

- [ ] Queue metrics dashboard shows queue depth
- [ ] Worker metrics dashboard shows scaling events
- [ ] System health dashboard reflects scaling behavior

#### 5.3 Alert Verification

- [ ] Alerts fire when scaling thresholds exceeded
- [ ] Alerts fire when max replicas reached
- [ ] Alert notifications received correctly

### 6. Performance Validation

#### 6.1 Response Time Under Load

**Test**: Measure API response times during scale-up

**Verify**:
- Response times remain within SLA (p95 < 500ms)
- No degradation during scaling events
- Response times improve as replicas increase

#### 6.2 Queue Processing Rate

**Test**: Measure job processing rate during scale-up

**Verify**:
- Processing rate increases with replica count
- Queue depth decreases as replicas scale up
- No job backlog accumulation

### 7. Cost Validation

#### 7.1 Resource Usage

- [ ] Monitor Container Apps resource consumption
- [ ] Verify scaling reduces costs during low load
- [ ] Verify scaling increases capacity during high load
- [ ] Cost remains within budget

## Load Testing Tools

### Option 1: k6

```bash
# Install k6
# brew install k6  # macOS
# Or download from https://k6.io/

# Run load test
k6 run load-test.js
```

Example `load-test.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.get('https://your-api-endpoint/api/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
```

### Option 2: Apache Bench

```bash
# Generate 1000 requests with 50 concurrent
ab -n 1000 -c 50 https://your-api-endpoint/api/health
```

### Option 3: Custom Script

Create a script that:
- Enqueues jobs to test worker scaling
- Makes API requests to test API scaling
- Monitors metrics during test
- Reports results

## Monitoring During Tests

### Azure Portal

1. Navigate to Container Apps
2. Select the app (API or workers)
3. View "Scale" tab to see replica count
4. View "Metrics" tab to see CPU, memory, request rate

### Application Insights

1. Navigate to Application Insights
2. View "Metrics" for custom metrics (queue.depth, etc.)
3. View "Workbooks" for dashboards
4. View "Logs" for scaling events

### Metrics Endpoint

```bash
# Get queue metrics from workers
curl https://workers-processing-endpoint/metrics

# Expected response includes queue depth per queue
```

## Success Criteria

- ✅ Scale-up triggers correctly under load
- ✅ Scale-down occurs when load decreases
- ✅ No service disruption during scaling
- ✅ Replica counts stay within min/max limits
- ✅ Metrics accurately reflect scaling behavior
- ✅ Alerts fire appropriately
- ✅ Cost remains within budget
- ✅ Performance meets SLA requirements

## Troubleshooting

### Scaling Not Triggering

1. **Check Metrics**: Verify CPU/memory/request metrics are being collected
2. **Check Thresholds**: Verify thresholds are appropriate (may need adjustment)
3. **Check Cooldown**: Ensure sufficient time has passed (cooldown periods)
4. **Check Limits**: Verify not at max replicas already

### Rapid Oscillation

1. **Increase Cooldown**: Extend cooldown periods in scaling rules
2. **Adjust Thresholds**: Widen gap between scale-up and scale-down thresholds
3. **Check Load Pattern**: Ensure load is stable, not fluctuating rapidly

### Scaling Too Slow

1. **Reduce Cooldown**: Shorten cooldown periods (with caution)
2. **Lower Thresholds**: Make scaling more aggressive
3. **Check Metrics Collection**: Ensure metrics are collected frequently enough

## Post-Testing

After successful testing:

1. Document actual scaling behavior
2. Adjust thresholds if needed based on test results
3. Update monitoring dashboards with real data
4. Document any issues encountered and resolutions
5. Update runbooks with scaling procedures

## Next Steps

After validation:

1. Deploy to staging environment
2. Run extended load tests (24+ hours)
3. Monitor cost and performance
4. Adjust thresholds based on production-like load
5. Deploy to production with monitoring
