# Authentication System Deployment Checklist

**Version**: 1.0  
**Last Updated**: December 15, 2025  
**Target Environment**: Production

## Pre-Deployment Checklist

### 1. Environment Configuration ✓

#### Required Environment Variables
- [ ] `JWT_SECRET` - Minimum 32 characters, cryptographically random
- [ ] `JWT_ACCESS_TOKEN_EXPIRY` - Set to `15m` (15 minutes)
- [ ] `JWT_REFRESH_TOKEN_EXPIRY` - Set to `7d` (7 days)
- [ ] `JWT_VALIDATION_CACHE_ENABLED` - Set to `true`
- [ ] `JWT_VALIDATION_CACHE_TTL` - Set to `300` (5 minutes)
- [ ] `SESSION_TTL` - Set to `32400` (9 hours)
- [ ] `SESSION_SLIDING_WINDOW` - Set to `1800` (30 minutes)
- [ ] `RATE_LIMIT_MAX_ATTEMPTS` - Set to `5`
- [ ] `RATE_LIMIT_WINDOW_MS` - Set to `900000` (15 minutes)
- [ ] `REDIS_HOST` - Redis server hostname
- [ ] `REDIS_PORT` - Redis server port (default: 6379)
- [ ] `REDIS_PASSWORD` - Redis authentication password
- [ ] `REDIS_TLS_ENABLED` - Set to `true` for production
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NODE_ENV` - Set to `production`
- [ ] `AUDIT_LOG_ENABLED` - Set to `true`
- [ ] `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins

#### Verify Configuration
```bash
# Validate environment variables
pnpm run validate-env

# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### 2. Database Migrations ✓

- [ ] Review migration scripts in `apps/api/src/migrations/`
- [ ] Backup production database
- [ ] Run migrations on staging environment first
- [ ] Verify migration success on staging
- [ ] Plan rollback procedure

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
pnpm --filter api db:migrate

# Verify migrations
pnpm --filter api db:migrate:status
```

### 3. Dependencies & Build ✓

- [ ] Update all dependencies to latest stable versions
- [ ] Run security audit: `pnpm audit`
- [ ] Fix any high/critical vulnerabilities
- [ ] Build all packages: `pnpm build`
- [ ] Verify build artifacts generated

```bash
# Security audit
pnpm audit --audit-level=high

# Build
pnpm build

# Verify build
ls -la apps/api/dist
ls -la apps/web/.next
```

### 4. Test Execution ✓

#### Phase 1-3: Security & MFA Tests
- [ ] CSRF protection tests pass (10 scenarios)
- [ ] Security headers tests pass (29 scenarios)
- [ ] MFA flow tests pass (19 scenarios)

#### Phase 4: Tenant Switching & Token Blacklist Tests
- [ ] Tenant switching tests pass (14 scenarios)
- [ ] Token blacklist tests pass (15 scenarios)

#### Phase 5: Logout Verification Tests
- [ ] Logout all sessions tests pass (17 scenarios)
- [ ] Token revocation tests pass (15 scenarios)
- [ ] Logout pending requests tests pass (18 scenarios)
- [ ] Audit logout tests pass (17 scenarios)

#### Phase 6: Integration & Security Tests
- [ ] Full auth flow integration tests pass (13 scenarios)
- [ ] Security feature tests pass (27 scenarios)

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test tests/csrf-protection.test.ts
pnpm test tests/security-headers.test.ts
pnpm test tests/mfa-flow.test.ts
pnpm test tests/tenant-switching.test.ts
pnpm test tests/token-blacklist.test.ts
pnpm test tests/logout-all-sessions.test.ts
pnpm test tests/token-revocation.test.ts
pnpm test tests/logout-pending-requests.test.ts
pnpm test tests/audit-logout.test.ts
pnpm test tests/integration/auth-full-flow.test.ts
pnpm test tests/security/auth-security.test.ts

# Generate coverage report
pnpm test --coverage
```

### 5. Performance Baseline ✓

- [ ] JWT validation latency < 50ms (with cache enabled)
- [ ] Login endpoint latency < 200ms
- [ ] Logout endpoint latency < 500ms
- [ ] Token refresh latency < 150ms
- [ ] Concurrent logout (20 users) < 2000ms
- [ ] Redis response time < 10ms

```bash
# Performance test script
./scripts/performance-test.sh

# Manual performance checks
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 6. Security Verification ✓

#### Security Headers
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] `Content-Security-Policy` configured
- [ ] No `X-Powered-By` header
- [ ] No server version information exposed

#### Cookie Security
- [ ] `HttpOnly` flag set
- [ ] `Secure` flag set (production only)
- [ ] `SameSite=Strict` or `SameSite=Lax`
- [ ] Cookie expiry matches token expiry

#### Rate Limiting
- [ ] Login endpoint rate limited (5 attempts / 15 minutes)
- [ ] Rate limit per IP address
- [ ] Rate limit bypass for successful logins
- [ ] Rate limit headers exposed (`X-RateLimit-*`)

```bash
# Test security headers
curl -I https://api.castiel.com/health

# Test rate limiting
for i in {1..7}; do 
  curl -X POST https://api.castiel.com/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### 7. Monitoring & Logging ✓

- [ ] Application logs configured (Structured JSON)
- [ ] Audit logs enabled (`AUDIT_LOG_ENABLED=true`)
- [ ] Error tracking configured (Sentry, LogRocket, etc.)
- [ ] Performance monitoring configured (New Relic, DataDog, etc.)
- [ ] Alerts configured for:
  - High error rates (> 5%)
  - Slow response times (> 500ms p95)
  - Redis connection failures
  - Database connection failures
  - Rate limit exceeded events
  - Failed login attempts (> 100/hour)

```bash
# Test logging
tail -f logs/application.log

# Test audit logs
psql $DATABASE_URL -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10"

# Test error tracking
curl -X POST https://api.castiel.com/test-error
```

---

## Deployment Procedure

### Step 1: Pre-Deployment Verification (15 minutes)

1. **Run pre-deployment checklist above**
2. **Notify team of deployment window**
3. **Put application in maintenance mode (if applicable)**

```bash
# Set maintenance mode
export MAINTENANCE_MODE=true
```

### Step 2: Database Backup & Migration (10 minutes)

1. **Backup production database**
2. **Run migrations**
3. **Verify migration success**

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Migrate
pnpm --filter api db:migrate

# Verify
pnpm --filter api db:migrate:status
```

### Step 3: Application Deployment (20 minutes)

1. **Build application**
2. **Deploy API service**
3. **Deploy Web service**
4. **Verify services running**

```bash
# Build
pnpm build

# Deploy (using your deployment tool)
# Example: Azure App Service
az webapp deployment source config-zip \
  --resource-group castiel-rg \
  --name castiel-api \
  --src api.zip

az webapp deployment source config-zip \
  --resource-group castiel-rg \
  --name castiel-web \
  --src web.zip

# Verify
curl https://api.castiel.com/health
curl https://castiel.com/
```

### Step 4: Post-Deployment Verification (15 minutes)

1. **Run smoke tests**
2. **Verify critical flows**
3. **Check monitoring dashboards**
4. **Remove maintenance mode**

```bash
# Smoke tests
pnpm test:smoke

# Test critical flows
./scripts/test-critical-flows.sh

# Remove maintenance mode
unset MAINTENANCE_MODE
```

### Step 5: Monitor & Validate (30 minutes)

1. **Monitor error rates**
2. **Monitor response times**
3. **Monitor Redis/Database connections**
4. **Monitor user login success rate**
5. **Check for any anomalies**

```bash
# Monitor logs
tail -f logs/application.log

# Monitor metrics
curl https://api.castiel.com/metrics
```

---

## Smoke Tests

### Test 1: User Registration
```bash
curl -X POST https://api.castiel.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoke-test@example.com",
    "password": "TestPassword123!",
    "name": "Smoke Test User"
  }'

# Expected: 201 Created
```

### Test 2: User Login
```bash
curl -X POST https://api.castiel.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoke-test@example.com",
    "password": "TestPassword123!"
  }'

# Expected: 200 OK, returns accessToken and refreshToken
```

### Test 3: Access Protected Resource
```bash
curl https://api.castiel.com/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected: 200 OK, returns user profile
```

### Test 4: Token Refresh
```bash
curl -X POST https://api.castiel.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "$REFRESH_TOKEN"
  }'

# Expected: 200 OK, returns new accessToken and refreshToken
```

### Test 5: Logout
```bash
curl -X POST https://api.castiel.com/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected: 200 OK
```

### Test 6: Verify Token Blacklisted
```bash
curl https://api.castiel.com/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected: 401 Unauthorized
```

---

## Rollback Procedure

### If Deployment Fails

1. **Immediately notify team**
2. **Stop deployment process**
3. **Assess impact and severity**
4. **Execute rollback if critical**

### Rollback Steps (15 minutes)

#### Step 1: Revert Application Code
```bash
# Redeploy previous version
az webapp deployment source config-zip \
  --resource-group castiel-rg \
  --name castiel-api \
  --src api-previous.zip

az webapp deployment source config-zip \
  --resource-group castiel-rg \
  --name castiel-web \
  --src web-previous.zip
```

#### Step 2: Rollback Database Migrations (if needed)
```bash
# Restore database backup
pg_restore -d $DATABASE_URL backup_YYYYMMDD_HHMMSS.sql

# Or run down migrations
pnpm --filter api db:migrate:down
```

#### Step 3: Verify Rollback
```bash
# Test critical flows
./scripts/test-critical-flows.sh

# Verify application version
curl https://api.castiel.com/health | jq '.version'
```

#### Step 4: Monitor Post-Rollback
```bash
# Monitor error rates
tail -f logs/application.log

# Monitor user activity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sessions WHERE created_at > NOW() - INTERVAL '5 minutes'"
```

---

## Post-Deployment Monitoring (24 hours)

### Hour 1: Critical Monitoring
- [ ] Error rate < 1%
- [ ] Response time p95 < 500ms
- [ ] Login success rate > 95%
- [ ] No critical errors in logs
- [ ] Redis/Database connections stable

### Hour 6: Performance Monitoring
- [ ] Average response time < 200ms
- [ ] JWT validation latency < 50ms
- [ ] Token refresh success rate > 99%
- [ ] Session cleanup working
- [ ] Audit logs writing correctly

### Hour 24: Stability Monitoring
- [ ] No memory leaks detected
- [ ] No connection pool exhaustion
- [ ] Consistent performance metrics
- [ ] User feedback positive
- [ ] No critical bugs reported

---

## Key Metrics to Monitor

### Application Metrics
- **Error Rate**: < 1% (target: < 0.5%)
- **Response Time (p95)**: < 500ms (target: < 200ms)
- **Response Time (p99)**: < 1000ms (target: < 500ms)
- **Throughput**: Handle 1000 req/s (peak)
- **Uptime**: > 99.9%

### Authentication Metrics
- **Login Success Rate**: > 95%
- **Token Refresh Success Rate**: > 99%
- **Logout Success Rate**: > 99%
- **MFA Enrollment Rate**: Track trend
- **Failed Login Attempts**: < 100/hour (alert if exceeded)

### Security Metrics
- **Rate Limit Hits**: < 50/hour (alert if exceeded)
- **Token Blacklist Size**: Monitor growth
- **Suspicious Activity Events**: 0 (investigate any)
- **CSRF Token Validation Failures**: < 10/hour

### Performance Metrics
- **JWT Validation Latency**: < 50ms (with cache)
- **Login Latency**: < 200ms
- **Logout Latency**: < 500ms
- **Token Refresh Latency**: < 150ms
- **Database Query Time (p95)**: < 100ms
- **Redis Response Time (p95)**: < 10ms

---

## Troubleshooting Guide

### Issue: High Error Rate

**Symptoms**: Error rate > 5%

**Investigation**:
```bash
# Check error logs
tail -n 1000 logs/application.log | grep ERROR

# Check error types
psql $DATABASE_URL -c "SELECT error_type, COUNT(*) FROM error_logs GROUP BY error_type ORDER BY COUNT(*) DESC"
```

**Resolution**:
- Identify error source
- Apply hotfix if critical
- Consider rollback if widespread

### Issue: Slow Response Times

**Symptoms**: p95 response time > 500ms

**Investigation**:
```bash
# Check slow queries
psql $DATABASE_URL -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10"

# Check Redis latency
redis-cli --latency -h $REDIS_HOST -p $REDIS_PORT
```

**Resolution**:
- Optimize slow queries
- Increase Redis cache TTL
- Scale up infrastructure

### Issue: Login Failures

**Symptoms**: Login success rate < 90%

**Investigation**:
```bash
# Check failed login attempts
psql $DATABASE_URL -c "SELECT * FROM audit_logs WHERE event_type = 'LOGIN_FAILURE' ORDER BY timestamp DESC LIMIT 50"

# Check rate limiting
redis-cli -h $REDIS_HOST -p $REDIS_PORT GET rate_limit:*
```

**Resolution**:
- Check for rate limiting issues
- Verify database connectivity
- Check Redis connectivity

### Issue: Memory Leaks

**Symptoms**: Memory usage increasing over time

**Investigation**:
```bash
# Check memory usage
ps aux | grep node

# Generate heap snapshot
kill -USR2 $PID
```

**Resolution**:
- Analyze heap snapshot
- Identify leaking objects
- Apply fix and redeploy

---

## Success Criteria

Deployment is considered successful when:

- ✅ All pre-deployment checks pass
- ✅ All smoke tests pass
- ✅ Error rate < 1% for 1 hour
- ✅ Response time p95 < 500ms
- ✅ Login success rate > 95%
- ✅ No critical bugs reported
- ✅ Monitoring dashboards green
- ✅ User feedback positive

---

## Deployment Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tech Lead | | | |
| DevOps Engineer | | | |
| QA Engineer | | | |
| Product Manager | | | |

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Tech Lead | | | |
| DevOps On-Call | | | |
| Database Admin | | | |
| Security Team | | | |

---

## Deployment History

| Date | Version | Deployer | Status | Notes |
|------|---------|----------|--------|-------|
| 2025-12-15 | 1.0.0 | GitHub Copilot | Planned | Initial auth system deployment |

---

**Document Version**: 1.0  
**Last Reviewed**: December 15, 2025  
**Next Review**: January 15, 2026
