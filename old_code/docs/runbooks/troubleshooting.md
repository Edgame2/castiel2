# Troubleshooting Runbook

**Last Updated:** 2025-01-XX  
**Status:** Production Runbook

---

## Overview

This runbook provides step-by-step procedures for common troubleshooting scenarios in the Castiel platform.

---

## Service Won't Start

### Symptoms
- Service fails to start
- Container exits immediately
- Health checks failing

### Diagnosis Steps

1. **Check Logs:**
   ```bash
   # Docker logs
   docker logs <container-name>
   
   # Application logs
   tail -f /var/log/castiel/api.log
   ```

2. **Check Environment Variables:**
   ```bash
   # Verify required variables are set
   env | grep -E "COSMOS_DB|REDIS|JWT"
   ```

3. **Check Configuration:**
   ```bash
   # Run validation script
   cd apps/api && pnpm run validate:env
   ```

### Common Causes

**Missing Environment Variables:**
- **Fix:** Ensure all required variables from `.env.example` are set
- **Verify:** Run validation script

**Database Connection Failure:**
- **Fix:** Verify Cosmos DB endpoint and key
- **Test:** `curl https://<endpoint>/_explorer`

**Redis Connection Failure:**
- **Fix:** Verify Redis URL/host and credentials
- **Test:** `redis-cli -u <REDIS_URL> ping`

**Port Already in Use:**
- **Fix:** Change PORT or stop conflicting service
- **Check:** `lsof -ti:3001`

### Resolution

1. Fix the identified issue
2. Restart service
3. Verify health check: `curl http://localhost:3001/health`
4. Check logs for errors

---

## Database Connection Issues

### Symptoms
- "Connection refused" errors
- Timeout errors
- "Database not found" errors

### Diagnosis Steps

1. **Test Connection:**
   ```bash
   # Test Cosmos DB connection
   az cosmosdb sql container show \
     --account-name <account> \
     --database-name castiel \
     --name shards \
     --resource-group <rg>
   ```

2. **Check Network:**
   ```bash
   # Test connectivity
   curl -v https://<cosmos-endpoint>/
   ```

3. **Check Credentials:**
   ```bash
   # Verify key is correct
   echo $COSMOS_DB_KEY | wc -c  # Should be > 0
   ```

### Common Causes

**Invalid Endpoint:**
- **Fix:** Verify `COSMOS_DB_ENDPOINT` format
- **Format:** `https://<account>.documents.azure.com:443/`

**Invalid Key:**
- **Fix:** Regenerate key in Azure Portal
- **Update:** Set new key in environment

**Network Issues:**
- **Fix:** Check firewall rules
- **Verify:** Private endpoints configured

**Database Not Found:**
- **Fix:** Run database initialization script
- **Script:** `pnpm db:init`

### Resolution

1. Fix connection issue
2. Restart service
3. Verify connection in logs
4. Test database query

---

## Redis Connection Issues

### Symptoms
- "Connection refused" errors
- Cache not working
- Rate limiting not working

### Diagnosis Steps

1. **Test Connection:**
   ```bash
   # Test Redis connection
   redis-cli -u $REDIS_URL ping
   # Should return: PONG
   ```

2. **Check Network:**
   ```bash
   # Test connectivity
   nc -zv <redis-host> <redis-port>
   ```

3. **Check Credentials:**
   ```bash
   # Verify password if using password auth
   redis-cli -h <host> -p <port> -a <password> ping
   ```

### Common Causes

**Invalid URL:**
- **Fix:** Verify `REDIS_URL` format
- **Format:** `redis://[password@]host:port[/db]` or `rediss://` for TLS

**Redis Not Running:**
- **Fix:** Start Redis service
- **Docker:** `docker-compose up redis`

**TLS Mismatch:**
- **Fix:** Set `REDIS_TLS_ENABLED=true` if using TLS
- **Verify:** URL uses `rediss://` protocol

**Authentication Failure:**
- **Fix:** Verify password in `REDIS_URL` or `REDIS_PASSWORD`
- **Test:** Connect manually with credentials

### Resolution

1. Fix connection issue
2. Restart service
3. Verify cache operations work
4. Check Redis logs

---

## High Memory Usage

### Symptoms
- Service using >80% memory
- OOM (Out of Memory) errors
- Slow performance

### Diagnosis Steps

1. **Check Memory Usage:**
   ```bash
   # Container memory
   docker stats <container-name>
   
   # Process memory
   ps aux | grep node
   ```

2. **Check for Memory Leaks:**
   ```bash
   # Heap snapshot (Node.js)
   node --inspect app.js
   # Then use Chrome DevTools
   ```

3. **Review Recent Changes:**
   - Check recent deployments
   - Review large data queries
   - Check for unbounded loops

### Common Causes

**Memory Leak:**
- **Fix:** Identify and fix leak
- **Tools:** Node.js heap profiler, Application Insights

**Large Data Queries:**
- **Fix:** Add pagination to queries
- **Verify:** No `fetchAll()` without limits

**Too Many Connections:**
- **Fix:** Review connection pooling
- **Check:** Database and Redis connection counts

**Large Service Files:**
- **Fix:** Refactor large services (long-term)
- **Mitigation:** Increase memory limits (short-term)

### Resolution

1. Identify root cause
2. Apply fix (pagination, connection limits, etc.)
3. Restart service
4. Monitor memory usage
5. Consider scaling if needed

---

## Slow API Responses

### Symptoms
- API response times >1 second
- Timeout errors
- User complaints

### Diagnosis Steps

1. **Check Application Insights:**
   - Review response time metrics
   - Identify slow endpoints
   - Check dependency performance

2. **Check Database Performance:**
   ```bash
   # Review slow queries
   # Check Cosmos DB metrics in Azure Portal
   ```

3. **Check Redis Performance:**
   ```bash
   # Redis latency
   redis-cli --latency
   ```

4. **Review Recent Changes:**
   - Recent deployments
   - Configuration changes
   - Traffic patterns

### Common Causes

**Slow Database Queries:**
- **Fix:** Optimize queries, add indexes
- **Check:** Query execution plans

**Cache Misses:**
- **Fix:** Review cache strategy
- **Check:** Cache hit rates

**High Load:**
- **Fix:** Scale horizontally
- **Check:** Auto-scaling configuration

**External API Slowdown:**
- **Fix:** Implement circuit breakers
- **Check:** External service status

### Resolution

1. Identify bottleneck
2. Optimize (queries, caching, scaling)
3. Deploy fix
4. Monitor performance
5. Verify improvement

---

## Authentication Failures

### Symptoms
- Users cannot log in
- "Invalid token" errors
- 401 Unauthorized responses

### Diagnosis Steps

1. **Check JWT Configuration:**
   ```bash
   # Verify secrets are set
   echo $JWT_ACCESS_SECRET | wc -c  # Should be >= 32
   echo $JWT_REFRESH_SECRET | wc -c  # Should be >= 32
   ```

2. **Check Token Validation:**
   - Review authentication logs
   - Check token expiry times
   - Verify token blacklist

3. **Check Redis (for token cache):**
   ```bash
   # Verify Redis is accessible
   redis-cli -u $REDIS_URL ping
   ```

### Common Causes

**Invalid JWT Secrets:**
- **Fix:** Regenerate secrets, update environment
- **Verify:** Secrets match across services

**Token Expiry Mismatch:**
- **Fix:** Align expiry times
- **Check:** `JWT_ACCESS_TOKEN_EXPIRY` configuration

**Redis Unavailable:**
- **Fix:** Restore Redis connection
- **Impact:** Token validation cache disabled

**Clock Skew:**
- **Fix:** Ensure server time is synchronized
- **Check:** NTP configuration

### Resolution

1. Fix configuration issue
2. Restart service
3. Test authentication flow
4. Verify tokens work

---

## Quick Reference

### Health Check Endpoints
- API: `GET /health`
- API: `GET /ready`
- API: `GET /metrics`

### Log Locations
- Application: Application Insights
- Infrastructure: Azure Monitor
- Local: `/var/log/castiel/` or container logs

### Common Commands
```bash
# Restart service
docker-compose restart api

# Check logs
docker logs -f api

# Validate environment
cd apps/api && pnpm run validate:env

# Test database
az cosmosdb sql container show --account-name <account> --database-name castiel --name shards

# Test Redis
redis-cli -u $REDIS_URL ping
```

---

## Escalation

If issue cannot be resolved using this runbook:
1. Check [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md)
2. Escalate to on-call engineer
3. Create incident ticket
4. Document findings for post-mortem

---

## Related Documentation

- [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md)
- [Database Migrations](./database-migrations.md)
- [Rollback Procedures](./rollback-procedures.md)
