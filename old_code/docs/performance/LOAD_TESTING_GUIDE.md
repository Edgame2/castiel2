# Load Testing Guide

## Overview

This guide provides instructions for running load tests against the Castiel API to verify performance budgets and identify bottlenecks.

## Prerequisites

1. **Install k6**: 
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   
   # Windows (using Chocolatey)
   choco install k6
   ```

2. **Set Environment Variables**:
   ```bash
   export API_BASE_URL=http://localhost:3001
   export TEST_USER_EMAIL=test@example.com
   export TEST_USER_PASSWORD=test-password
   export TEST_TENANT_ID=test-tenant
   ```

3. **Start Services**:
   - API server running on port 3001
   - Redis running (for caching)
   - Cosmos DB accessible (for data)

## Test Scenarios

### 1. Normal Load Test

Simulates expected production traffic (50 concurrent users).

```bash
k6 run --env TEST_TYPE=normal tests/load/k6-scenarios-enhanced.js
```

**Expected Results**:
- p50 response time: < 200ms
- p95 response time: < 500ms
- p99 response time: < 1000ms
- Error rate: < 1%

### 2. Peak Load Test

Simulates 2x expected production traffic (100 concurrent users).

```bash
k6 run --env TEST_TYPE=peak tests/load/k6-scenarios-enhanced.js
```

**Expected Results**:
- p50 response time: < 300ms
- p95 response time: < 750ms
- p99 response time: < 1500ms
- Error rate: < 2%

### 3. Stress Test

Simulates 5x expected production traffic (250 concurrent users).

```bash
k6 run --env TEST_TYPE=stress tests/load/k6-scenarios-enhanced.js
```

**Purpose**: Identify breaking points and system limits.

### 4. Spike Test

Simulates sudden traffic spike (10 → 200 users).

```bash
k6 run --env TEST_TYPE=spike tests/load/k6-scenarios-enhanced.js
```

**Purpose**: Test system resilience to sudden load increases.

### 5. Soak Test

Long-running test (1 hour) to identify memory leaks.

```bash
k6 run --env TEST_TYPE=soak tests/load/k6-scenarios-enhanced.js
```

**Purpose**: Identify resource leaks and degradation over time.

## Running Load Tests

### Basic Usage

```bash
# Normal load test
k6 run --env TEST_TYPE=normal tests/load/k6-scenarios-enhanced.js

# With custom base URL
k6 run --env TEST_TYPE=normal --env API_BASE_URL=https://api.castiel.app tests/load/k6-scenarios-enhanced.js

# With output to file
k6 run --env TEST_TYPE=normal --out json=results.json tests/load/k6-scenarios-enhanced.js
```

### Advanced Options

```bash
# Run with custom VU count and duration
k6 run --vus 100 --duration 10m tests/load/k6-scenarios-enhanced.js

# Run with iterations
k6 run --vus 50 --iterations 1000 tests/load/k6-scenarios-enhanced.js

# Run with custom thresholds
k6 run --env TEST_TYPE=normal \
  --thresholds http_req_duration='p(95)<500' \
  tests/load/k6-scenarios-enhanced.js
```

### Cloud Execution (k6 Cloud)

```bash
# Login to k6 Cloud
k6 login cloud

# Run test in cloud
k6 cloud --env TEST_TYPE=normal tests/load/k6-scenarios-enhanced.js
```

## Interpreting Results

### Key Metrics

1. **Response Time Percentiles**:
   - p50 (median): Typical response time
   - p95: 95% of requests faster than this
   - p99: 99% of requests faster than this

2. **Error Rate**:
   - Should be < 1% for normal load
   - Monitor for 4xx (client errors) vs 5xx (server errors)

3. **Throughput**:
   - Requests per second (RPS)
   - Should increase with load (up to system limits)

4. **Cache Performance**:
   - Cache hit rate (from `X-Cache` headers)
   - Higher hit rate = better performance

### Sample Output

```
✓ login status is 200
✓ get shard types status is 200
✓ list shards response time < 300ms
✗ search response time < 500ms (actual: 650ms)

checks.........................: 95.00% ✓ 1900  ✗ 100
data_received..................: 12 MB  200 kB/s
data_sent......................: 2.5 MB 42 kB/s
http_req_duration..............: avg=250ms min=50ms med=200ms max=2000ms p(95)=500ms p(99)=1000ms
http_req_failed................: 1.00%  ✓ 20    ✗ 1980
http_reqs......................: 2000   33.33/s
iteration_duration.............: avg=2.5s min=1s med=2s max=10s
vus............................: 50     min=50 max=50
```

### Analyzing Bottlenecks

1. **High Response Times**:
   - Check database query performance
   - Verify cache hit rates
   - Check for N+1 queries
   - Monitor Cosmos DB RU consumption

2. **High Error Rates**:
   - Check application logs
   - Monitor database connection pool
   - Verify rate limiting isn't too aggressive
   - Check for memory/resource exhaustion

3. **Low Throughput**:
   - Check worker concurrency settings
   - Verify queue processing speed
   - Monitor CPU/memory usage
   - Check for blocking operations

## Performance Budget Verification

Compare test results against performance budgets defined in `docs/performance/PERFORMANCE_BUDGETS.md`:

### API Endpoints

| Endpoint | p95 Target | Alert Threshold |
|----------|-----------|-----------------|
| Health Check | < 100ms | > 150ms |
| Get Shard Types | < 200ms | > 300ms |
| List Shards | < 300ms | > 500ms |
| Search Advanced | < 500ms | > 750ms |
| Create Shard | < 500ms | > 750ms |

### Overall Performance

- **p50**: < 200ms (target), > 300ms (alert)
- **p95**: < 500ms (target), > 750ms (alert)
- **p99**: < 1000ms (target), > 1500ms (alert)
- **Error Rate**: < 1% (target), > 5% (critical)

## Continuous Integration

### GitHub Actions Example

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run Load Test
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: |
          k6 run --env TEST_TYPE=normal --out json=results.json tests/load/k6-scenarios-enhanced.js
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results.json
```

## Troubleshooting

### Authentication Failures

- Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are correct
- Check that the test user exists in the database
- Verify API is accessible at `API_BASE_URL`

### High Error Rates

- Check application logs for errors
- Verify database connectivity
- Check Redis connectivity (for caching)
- Monitor resource usage (CPU, memory, connections)

### Slow Response Times

- Check database query performance
- Verify cache is working (check `X-Cache` headers)
- Monitor Cosmos DB RU consumption
- Check for rate limiting
- Verify auto-scaling is working

### Test Failures

- Ensure all services are running
- Check network connectivity
- Verify test data exists (shard types, shards)
- Review k6 logs for specific errors

## Best Practices

1. **Run tests regularly**: Weekly automated tests, before major releases
2. **Start small**: Begin with normal load, then increase
3. **Monitor during tests**: Watch application metrics in real-time
4. **Compare baselines**: Track performance over time
5. **Test in production-like environment**: Use staging environment that mirrors production
6. **Document results**: Keep records of test results and improvements
7. **Fix regressions**: Block deployments if performance degrades >10%

## Related Documentation

- [Performance Budgets](./PERFORMANCE_BUDGETS.md)
- [API Optimization Plan](./API_OPTIMIZATION_PLAN.md)
- [Database Query Optimization](./DATABASE_QUERY_OPTIMIZATION_ANALYSIS.md)
- [BullMQ Optimization Plan](./BULLMQ_OPTIMIZATION_PLAN.md)
