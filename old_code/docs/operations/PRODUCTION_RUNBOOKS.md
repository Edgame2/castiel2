# Production Runbooks

**Last Updated**: December 2025  
**Status**: Operational Procedures for Castiel Production Environment

---

## Table of Contents

1. [Incident Response](#incident-response)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Troubleshooting](#troubleshooting)
5. [Database Operations](#database-operations)
6. [Cache Management](#cache-management)
7. [Service Health Checks](#service-health-checks)
8. [Rollback Procedures](#rollback-procedures)

---

## Incident Response

### Severity Levels

- **P0 - Critical**: Service completely down, data loss, security breach
- **P1 - High**: Major feature broken, significant performance degradation
- **P2 - Medium**: Minor feature broken, moderate performance impact
- **P3 - Low**: Cosmetic issues, minor performance impact

### Incident Response Process

1. **Acknowledge** - Confirm incident in monitoring system
2. **Assess** - Determine severity and impact
3. **Communicate** - Notify stakeholders via status page
4. **Investigate** - Check logs, metrics, recent deployments
5. **Mitigate** - Apply temporary fix if possible
6. **Resolve** - Implement permanent fix
7. **Post-Mortem** - Document root cause and prevention

### On-Call Rotation

- **Primary**: Backend engineer (API issues)
- **Secondary**: DevOps engineer (Infrastructure issues)
- **Escalation**: Engineering lead

### Emergency Contacts

- **Slack**: #castiel-incidents
- **PagerDuty**: Castiel On-Call
- **Status Page**: https://status.castiel.com

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review approved
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Rollback plan prepared
- [ ] Monitoring dashboards updated
- [ ] Stakeholders notified

### Deployment Steps

1. **Create Release Branch**
   ```bash
   git checkout -b release/v1.x.x
   git push origin release/v1.x.x
   ```

2. **Run Pre-Deployment Tests**
   ```bash
   pnpm test
   pnpm test:coverage
   pnpm typecheck
   pnpm lint
   ```

3. **Build Artifacts**
   ```bash
   pnpm build
   ```

4. **Deploy to Staging**
   ```bash
   # Azure App Service deployment
   az webapp deployment source config-zip \
     --resource-group rg-castiel-staging \
     --name app-castiel-api-staging \
     --src dist.zip
   ```

5. **Verify Staging**
   - Check health endpoint: `https://api-staging.castiel.com/health`
   - Run smoke tests
   - Verify critical user flows

6. **Deploy to Production**
   ```bash
   # Blue-Green deployment recommended
   az webapp deployment slot swap \
     --resource-group rg-castiel-prod \
     --name app-castiel-api-prod \
     --slot staging \
     --target-slot production
   ```

7. **Post-Deployment Verification**
   - Monitor error rates for 15 minutes
   - Check performance metrics
   - Verify critical endpoints
   - Monitor user feedback

### Rollback Procedure

If deployment causes issues:

1. **Immediate Rollback** (if critical)
   ```bash
   az webapp deployment slot swap \
     --resource-group rg-castiel-prod \
     --name app-castiel-api-prod \
     --slot production \
     --target-slot staging
   ```

2. **Investigate** - Check logs and metrics
3. **Fix** - Address root cause
4. **Redeploy** - After fix is verified

---

## Monitoring & Alerts

### Key Metrics to Monitor

#### API Metrics
- **Response Time**: p50, p95, p99 percentiles
- **Error Rate**: 4xx and 5xx errors per minute
- **Request Rate**: Requests per second
- **Endpoint Performance**: Slow endpoints (>500ms p95)

#### Infrastructure Metrics
- **CPU Usage**: Should be <70% average
- **Memory Usage**: Should be <80% average
- **Database RU Consumption**: Monitor Cosmos DB RUs
- **Redis Memory**: Monitor cache memory usage
- **Queue Depth**: Service Bus queue lengths

#### Business Metrics
- **Active Users**: Concurrent users
- **API Calls**: Total API calls per hour
- **Cost per Tenant**: AI/embedding costs
- **Cache Hit Rate**: Should be >80%

### Critical Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| API Error Rate | >5% for 5 minutes | Check logs, investigate |
| Response Time p95 | >1000ms for 10 minutes | Check slow queries, optimize |
| Database RU | >80% of provisioned | Scale up or optimize queries |
| Redis Memory | >90% | Clear cache or scale up |
| Service Bus Queue | >1000 messages | Check worker health |
| Embedding Failures | >10% failure rate | Check Azure OpenAI status |

### Alert Response

1. **Acknowledge** alert in monitoring system
2. **Check** relevant dashboards
3. **Investigate** logs and metrics
4. **Mitigate** if possible (scale, restart, clear cache)
5. **Resolve** root cause
6. **Document** incident

---

## Troubleshooting

### Common Issues

#### High Error Rate

**Symptoms**: Increased 4xx/5xx errors in monitoring

**Investigation**:
```bash
# Check recent errors in Application Insights
az monitor app-insights query \
  --app app-castiel-api-prod \
  --analytics-query "exceptions | where timestamp > ago(1h) | summarize count() by type"

# Check API logs
az webapp log tail --name app-castiel-api-prod --resource-group rg-castiel-prod
```

**Common Causes**:
- Recent deployment with bugs
- Database connection issues
- Rate limiting triggered
- Authentication token issues

**Resolution**:
- Check recent deployments
- Verify database connectivity
- Check rate limit configuration
- Review authentication logs

#### Slow Response Times

**Symptoms**: p95 response time >1000ms

**Investigation**:
```bash
# Check slow endpoints
curl https://api.castiel.com/api/admin/performance/slow

# Check database query performance
# Use QueryOptimizationService dashboard
```

**Common Causes**:
- Slow database queries
- Missing indexes
- Cache misses
- High load

**Resolution**:
- Optimize slow queries
- Add database indexes
- Improve cache hit rate
- Scale horizontally

#### Database Connection Issues

**Symptoms**: Cosmos DB connection errors

**Investigation**:
```bash
# Check Cosmos DB status
az cosmosdb show --name cosmos-castiel-prod --resource-group rg-castiel-prod

# Check connection strings
az cosmosdb keys list --name cosmos-castiel-prod --resource-group rg-castiel-prod
```

**Resolution**:
- Verify connection strings in Key Vault
- Check Cosmos DB service status
- Verify firewall rules
- Check RU provisioning

#### Cache Issues

**Symptoms**: Low cache hit rate, high Redis memory

**Investigation**:
```bash
# Check cache stats
curl https://api.castiel.com/api/admin/cache/stats

# Check Redis memory
az redis show --name redis-castiel-prod --resource-group rg-castiel-prod
```

**Resolution**:
- Clear old cache entries
- Adjust TTL values
- Scale Redis if needed
- Review cache key patterns

---

## Database Operations

### Cosmos DB Operations

#### Backup

Cosmos DB has automatic backups. Manual backup:

```bash
# Export data (use Azure Data Factory or Cosmos DB Data Migration Tool)
```

#### Restore

```bash
# Restore from point-in-time backup via Azure Portal
# Or restore from exported data
```

#### Scaling

```bash
# Scale RU/s
az cosmosdb sql container throughput update \
  --account-name cosmos-castiel-prod \
  --database-name castiel \
  --name shards \
  --resource-group rg-castiel-prod \
  --throughput 4000
```

#### Index Management

```bash
# Rebuild indexes (via Azure Portal or SDK)
# Check index usage via QueryOptimizationService
```

### Migration Procedures

1. **Test Migration** in staging
2. **Backup** production data
3. **Run Migration** script
4. **Verify** data integrity
5. **Monitor** for issues

---

## Cache Management

### Redis Operations

#### Clear Cache

```bash
# Clear specific cache key pattern
curl -X POST https://api.castiel.com/api/admin/cache/clear \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pattern": "shard_cache:*"}'
```

#### Cache Statistics

```bash
# Get cache stats
curl https://api.castiel.com/api/admin/cache/stats
```

#### Cache Warming

```bash
# Warm cache for frequently accessed data
# Use CacheOptimizationService recommendations
```

---

## Service Health Checks

### Health Endpoints

- **API Health**: `GET /health`
- **Readiness**: `GET /health/ready`
- **Liveness**: `GET /health/live`

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

API_URL="https://api.castiel.com"

# Check health
HEALTH=$(curl -s "$API_URL/health")
if [ $? -ne 0 ]; then
  echo "❌ Health check failed"
  exit 1
fi

# Check readiness
READY=$(curl -s "$API_URL/health/ready")
if [ $? -ne 0 ]; then
  echo "❌ Readiness check failed"
  exit 1
fi

echo "✅ All health checks passed"
```

---

## Rollback Procedures

### Code Rollback

1. **Identify** last known good version
2. **Create** rollback branch
3. **Deploy** previous version
4. **Verify** functionality
5. **Investigate** root cause

### Database Rollback

1. **Stop** writes to affected tables
2. **Restore** from backup
3. **Verify** data integrity
4. **Resume** operations

### Configuration Rollback

1. **Revert** environment variables in Key Vault
2. **Restart** affected services
3. **Verify** configuration

---

## Emergency Procedures

### Service Down

1. **Check** Azure service status
2. **Restart** App Service if needed
3. **Scale** up if resource constrained
4. **Check** recent deployments
5. **Rollback** if deployment-related

### Data Corruption

1. **Stop** writes immediately
2. **Assess** scope of corruption
3. **Restore** from backup
4. **Verify** data integrity
5. **Resume** operations

### Security Incident

1. **Isolate** affected systems
2. **Preserve** logs and evidence
3. **Notify** security team
4. **Assess** impact
5. **Remediate** vulnerabilities
6. **Document** incident

---

## Contact Information

- **On-Call**: PagerDuty
- **Slack**: #castiel-ops
- **Email**: ops@castiel.com
- **Status Page**: https://status.castiel.com

---

**Document Version**: 1.0  
**Last Review**: January 2025  
**Next Review**: Quarterly

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Production runbooks fully documented

#### Implemented Features (✅)

- ✅ Incident response procedures
- ✅ Deployment procedures
- ✅ Monitoring and alerts
- ✅ Troubleshooting guides
- ✅ Database operations
- ✅ Cache management
- ✅ Rollback procedures

#### Known Limitations

- ⚠️ **Runbook Testing** - Runbooks may not be regularly tested
  - **Recommendation:**
    1. Test runbooks in staging environment
    2. Update runbooks based on actual incidents
    3. Document lessons learned

- ⚠️ **Automation** - Some procedures may be manual
  - **Recommendation:**
    1. Automate common procedures
    2. Create scripts for repetitive tasks
    3. Document automation procedures

### Related Documentation

- [Runbooks Index](../runbooks/README.md) - Master index of all production runbooks
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md) - Detailed incident response procedures
- [Troubleshooting Runbook](../runbooks/troubleshooting.md) - Troubleshooting procedures
- [Database Migrations](../runbooks/database-migrations.md) - Database migration procedures
- [Rollback Procedures](../runbooks/rollback-procedures.md) - Rollback procedures
- [Secret Rotation Procedures](./SECRET_ROTATION_PROCEDURES.md) - Secret rotation procedures and automation
- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Health Checks](./HEALTH_CHECKS.md) - Health check procedures
- [Test Procedures](./TEST_PROCEDURES.md) - Load testing, security testing, chaos engineering, and DR test procedures
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview







