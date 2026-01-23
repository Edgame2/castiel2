# Performance Budgets

**Last Updated:** 2025-01-XX  
**Status:** Production Standards

---

## Overview

This document defines performance budgets and SLAs for the Castiel platform. All performance targets must be met to ensure optimal user experience.

---

## API Performance Budgets

### Response Time Targets

| Percentile | Target | Alert Threshold | Critical Threshold |
|------------|--------|------------------|-------------------|
| p50 (median) | < 200ms | > 300ms | > 400ms |
| p95 | < 500ms | > 750ms | > 1000ms |
| p99 | < 1000ms | > 1500ms | > 2000ms |

**Note:** These targets align with Phase 3.1 Performance Optimizations plan. More aggressive targets (p50 < 100ms, p95 < 200ms) are maintained for critical endpoints where possible.

### Endpoint-Specific Targets

#### Authentication Endpoints
- **POST /api/v1/auth/login:** p95 < 300ms
- **POST /api/v1/auth/refresh:** p95 < 200ms
- **GET /api/v1/auth/me:** p95 < 100ms

#### Data Endpoints
- **GET /api/v1/shard-types:** p95 < 200ms
- **GET /api/v1/shard-types/{id}:** p95 < 100ms
- **GET /api/v1/shards:** p95 < 300ms (with pagination)
- **POST /api/v1/shards:** p95 < 500ms
- **PUT /api/v1/shards/{id}:** p95 < 400ms

#### Search Endpoints
- **POST /api/v1/search/advanced:** p95 < 500ms
- **GET /api/v1/search/vector:** p95 < 300ms

#### AI Endpoints
- **POST /api/v1/insights/chat:** p95 < 2000ms (AI processing)
- **POST /api/v1/insights/generate:** p95 < 5000ms (AI processing)

---

## Frontend Performance Budgets

### Page Load Metrics

| Metric | Target | Alert Threshold | Critical Threshold |
|--------|--------|-----------------|-------------------|
| First Contentful Paint (FCP) | < 1.5s | > 2.0s | > 3.0s |
| Largest Contentful Paint (LCP) | < 2.5s | > 3.5s | > 4.5s |
| Time to Interactive (TTI) | < 3.5s | > 5.0s | > 7.0s |
| Total Blocking Time (TBT) | < 200ms | > 300ms | > 500ms |
| Cumulative Layout Shift (CLS) | < 0.1 | > 0.15 | > 0.25 |

### Bundle Size Targets

- **Initial JavaScript:** < 200KB (gzipped)
- **Total JavaScript:** < 500KB (gzipped)
- **CSS:** < 50KB (gzipped)
- **Images:** Optimized, WebP format preferred

### Route-Specific Targets

- **Dashboard:** FCP < 1.5s, TTI < 3.0s
- **Shard List:** FCP < 1.2s, TTI < 2.5s
- **Shard Detail:** FCP < 1.0s, TTI < 2.0s
- **Search:** FCP < 1.5s, TTI < 3.5s

---

## Database Performance Budgets

### Query Performance

| Query Type | Target | Alert Threshold | Critical Threshold |
|------------|--------|-----------------|-------------------|
| Simple queries | p95 < 50ms | > 100ms | > 200ms |
| Complex queries | p95 < 100ms | > 200ms | > 500ms |
| Aggregation queries | p95 < 200ms | > 500ms | > 1000ms |
| Vector search | p95 < 300ms | > 500ms | > 1000ms |

### Cosmos DB Metrics

- **Request Units (RU):** Monitor consumption, alert if >80% of provisioned
- **Latency:** p95 < 10ms (within region)
- **Throttling:** < 1% of requests
- **Availability:** > 99.9%

---

## BullMQ Job Processing Performance Budgets

### Job Processing Time Targets

| Metric | Target | Alert Threshold | Critical Threshold |
|--------|--------|-----------------|-------------------|
| Average processing time | < 5s | > 7s | > 10s |
| p95 processing time | < 30s | > 45s | > 60s |
| p99 processing time | < 60s | > 90s | > 120s |

### Queue-Specific Targets

#### High-Volume Queues
- **Embedding Jobs:** Average < 3s, p95 < 15s
- **Document Chunk Jobs:** Average < 2s, p95 < 10s
- **Document Check Jobs:** Average < 5s, p95 < 20s

#### Medium-Volume Queues
- **Content Generation Jobs:** Average < 10s, p95 < 30s (AI processing)
- **Enrichment Jobs:** Average < 8s, p95 < 25s
- **Risk Evaluation Jobs:** Average < 15s, p95 < 45s (AI processing)

#### Low-Volume Queues
- **Sync Jobs:** Average < 5s, p95 < 20s
- **Ingestion Events:** Average < 2s, p95 < 10s

### Queue Metrics

- **Queue Depth:** Alert if > 1000 jobs, Critical if > 5000 jobs
- **Failed Job Rate:** Alert if > 5%, Critical if > 10%
- **Stalled Jobs:** Alert if > 10, Critical if > 50
- **Job Throughput:** Monitor jobs/second per worker

---

## Monitoring & Alerting

### Application Insights Alerts

1. **API Response Time:**
   - Alert if p95 > 750ms for 5 minutes
   - Critical if p95 > 1000ms for 2 minutes

2. **Error Rate:**
   - Alert if error rate > 1% for 5 minutes
   - Critical if error rate > 5% for 2 minutes

3. **Database Query Time:**
   - Alert if p95 > 200ms for 5 minutes
   - Critical if p95 > 500ms for 2 minutes

4. **BullMQ Job Processing:**
   - Alert if average processing time > 7s for 5 minutes
   - Alert if p95 processing time > 45s for 5 minutes
   - Critical if average processing time > 10s for 2 minutes
   - Critical if p95 processing time > 60s for 2 minutes
   - Alert if queue depth > 1000 jobs
   - Critical if queue depth > 5000 jobs
   - Alert if failed job rate > 5% for 5 minutes
   - Critical if failed job rate > 10% for 2 minutes

5. **Frontend Metrics:**
   - Alert if LCP > 3.5s for 10 minutes
   - Critical if LCP > 4.5s for 5 minutes

### Performance Dashboards

- **API Performance Dashboard:**
  - Response times by endpoint
  - Error rates
  - Throughput
  - Dependency performance

- **Frontend Performance Dashboard:**
  - Core Web Vitals
  - Bundle sizes
  - Load times by route
  - User experience metrics

- **Database Performance Dashboard:**
  - Query performance
  - RU consumption
  - Throttling events
  - Index usage

- **BullMQ Performance Dashboard:**
  - Job processing times (average, p95, p99)
  - Queue depth by queue
  - Failed job rates
  - Job throughput
  - Worker health metrics
  - Stalled jobs

---

## Performance Optimization Guidelines

### API Optimization

1. **Database Queries:**
   - Use pagination (max 1000 items)
   - Add appropriate indexes
   - Use connection pooling
   - Implement query result caching

2. **Caching:**
   - Cache frequently accessed data
   - Use Redis for distributed caching
   - Set appropriate TTLs
   - Implement cache invalidation

3. **Response Optimization:**
   - Compress responses (gzip)
   - Use field selection/projection
   - Minimize payload size
   - Use HTTP/2

### Frontend Optimization

1. **Code Splitting:**
   - Route-based code splitting
   - Lazy load heavy components
   - Dynamic imports for large libraries

2. **Asset Optimization:**
   - Optimize images (WebP, responsive)
   - Minify and compress assets
   - Use CDN for static assets
   - Implement lazy loading

3. **Rendering Optimization:**
   - Server-side rendering where appropriate
   - Optimize React rendering
   - Use virtualization for long lists
   - Debounce/throttle user interactions

### Database Optimization

1. **Query Optimization:**
   - Use appropriate indexes
   - Avoid N+1 queries
   - Use DataLoader pattern
   - Optimize partition keys

2. **Connection Management:**
   - Use connection pooling
   - Monitor connection counts
   - Set appropriate timeouts
   - Handle connection errors gracefully

---

## Performance Testing

### Load Testing

- **Frequency:** Weekly automated, before major releases
- **Tools:** k6, Artillery, or JMeter
- **Scenarios:**
  - Normal load (expected traffic)
  - Peak load (2x expected traffic)
  - Stress test (5x expected traffic)

### Performance Regression Testing

- **Frequency:** On every deployment
- **Metrics:** Compare against baseline
- **Action:** Block deployment if regression >10%

---

## Performance Budget Violations

### Response Procedure

1. **Detect:** Monitoring alerts
2. **Investigate:** Identify root cause
3. **Mitigate:** Apply quick fixes
4. **Optimize:** Implement long-term fixes
5. **Verify:** Confirm performance restored

### Escalation

- **Alert Threshold:** Notify team
- **Critical Threshold:** Escalate to on-call
- **Sustained Violation:** Create incident ticket

---

## Related Documentation

- [Architecture Documentation](../ARCHITECTURE.md)
- [Monitoring Guide](../monitoring/APPLICATION_INSIGHTS_CONFIG.md)
- [Load Testing Guide](./LOAD_TESTING.md)
