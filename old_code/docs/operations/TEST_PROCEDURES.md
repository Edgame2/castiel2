# Test Procedures

**Last Updated**: January 2025  
**Status**: Production Test Procedures

---

## Overview

This document provides comprehensive test procedures for:
- **Load Testing**: Performance and capacity testing
- **Security Testing**: Vulnerability and penetration testing
- **Chaos Engineering**: Resilience and fault tolerance testing
- **Disaster Recovery Testing**: Backup and recovery validation

All test procedures should be executed regularly to ensure system reliability, security, and recoverability.

---

## 1. Load Testing Procedures

### Prerequisites

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
   ```

2. **Set Environment Variables**:
   ```bash
   export API_BASE_URL=https://api-staging.castiel.app
   export TEST_USER_EMAIL=loadtest@castiel.app
   export TEST_USER_PASSWORD=<secure-password>
   export TEST_TENANT_ID=load-test-tenant
   ```

3. **Verify Services**:
   - API server is running and accessible
   - Redis is available (for caching)
   - Cosmos DB is accessible
   - Monitoring is enabled (Application Insights)

### Test Scenarios

#### 1.1 Normal Load Test

**Purpose**: Verify system performance under expected production load.

**Command**:
```bash
./scripts/run-load-test.sh
# Or directly:
k6 run --env TEST_TYPE=normal tests/load/k6-scenarios-enhanced.js
```

**Configuration**:
- Virtual Users: 50
- Duration: 10 minutes
- Ramp-up: 2 minutes

**Success Criteria**:
- p50 response time: < 200ms
- p95 response time: < 500ms
- p99 response time: < 1000ms
- Error rate: < 1%
- All health checks pass

**Frequency**: Weekly

#### 1.2 Peak Load Test

**Purpose**: Verify system performance under 2x expected production load.

**Command**:
```bash
k6 run --env TEST_TYPE=peak tests/load/k6-scenarios-enhanced.js
```

**Configuration**:
- Virtual Users: 100
- Duration: 15 minutes
- Ramp-up: 3 minutes

**Success Criteria**:
- p50 response time: < 300ms
- p95 response time: < 750ms
- p99 response time: < 1500ms
- Error rate: < 2%
- System remains stable

**Frequency**: Monthly

#### 1.3 Stress Test

**Purpose**: Identify system breaking points and capacity limits.

**Command**:
```bash
k6 run --env TEST_TYPE=stress tests/load/k6-scenarios-enhanced.js
```

**Configuration**:
- Virtual Users: 250
- Duration: 20 minutes
- Ramp-up: 5 minutes

**Success Criteria**:
- System gracefully degrades (no crashes)
- Error rate < 10%
- Recovery after load reduction
- No data corruption

**Frequency**: Quarterly

#### 1.4 Spike Test

**Purpose**: Test system resilience to sudden traffic spikes.

**Command**:
```bash
k6 run --env TEST_TYPE=spike tests/load/k6-scenarios-enhanced.js
```

**Configuration**:
- Initial VUs: 10
- Spike VUs: 200
- Spike duration: 5 minutes
- Total duration: 15 minutes

**Success Criteria**:
- System handles spike without crashing
- Auto-scaling activates within 2 minutes
- Response times recover after spike
- No data loss

**Frequency**: Monthly

#### 1.5 Soak Test

**Purpose**: Identify memory leaks and resource degradation over time.

**Command**:
```bash
k6 run --env TEST_TYPE=soak tests/load/k6-scenarios-enhanced.js
```

**Configuration**:
- Virtual Users: 50
- Duration: 1 hour
- Constant load

**Success Criteria**:
- No memory leaks (memory usage stable)
- No connection pool exhaustion
- Response times remain consistent
- Error rate remains < 1%

**Frequency**: Quarterly

### Load Test Execution Checklist

- [ ] Verify test environment matches production configuration
- [ ] Confirm test user credentials are valid
- [ ] Check Application Insights is receiving metrics
- [ ] Monitor system resources during test (CPU, memory, connections)
- [ ] Review test results against performance budgets
- [ ] Document any performance regressions
- [ ] Create tickets for performance issues
- [ ] Update baseline metrics if performance improved

### Load Test Results Analysis

1. **Response Time Analysis**:
   - Compare percentiles against performance budgets
   - Identify slow endpoints
   - Check for N+1 query patterns
   - Verify cache hit rates

2. **Error Analysis**:
   - Categorize errors (4xx vs 5xx)
   - Identify error patterns
   - Check for rate limiting issues
   - Verify database connection pool

3. **Resource Analysis**:
   - Monitor CPU usage
   - Check memory consumption
   - Verify connection pool usage
   - Review Cosmos DB RU consumption

### Related Documentation

- [Load Testing Guide](../performance/LOAD_TESTING_GUIDE.md)
- [Performance Budgets](../performance/PERFORMANCE_BUDGETS.md)

---

## 2. Security Testing Procedures

### Prerequisites

1. **Security Testing Tools**:
   - OWASP ZAP (for web application scanning)
   - Burp Suite (for manual penetration testing)
   - npm audit (for dependency vulnerability scanning)
   - Snyk (for security scanning)

2. **Test Environment**:
   - Staging environment (mirrors production)
   - Test user accounts with various permission levels
   - Isolated network (to prevent impact on production)

### Test Scenarios

#### 2.1 Authentication Security Testing

**Purpose**: Verify authentication mechanisms are secure.

**Test Cases**:

1. **Brute Force Protection**:
   ```bash
   # Test rate limiting on login attempts
   for i in {1..20}; do
     curl -X POST https://api-staging.castiel.app/api/v1/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"wrong"}'
   done
   # Should return 429 after 5 failed attempts
   ```

2. **Token Validation**:
   - Test expired tokens are rejected
   - Test invalid tokens are rejected
   - Test token tampering is detected
   - Verify token refresh mechanism

3. **Session Management**:
   - Test concurrent session limits
   - Verify session timeout
   - Test session invalidation on logout
   - Verify session isolation between users

**Success Criteria**:
- Rate limiting prevents brute force attacks
- Tokens are properly validated
- Sessions are securely managed
- No token leakage in logs

**Frequency**: Monthly

#### 2.2 Authorization Testing

**Purpose**: Verify access control and authorization mechanisms.

**Test Cases**:

1. **Tenant Isolation**:
   ```bash
   # Test user cannot access other tenant's data
   curl -X GET https://api-staging.castiel.app/api/v1/shards \
     -H "Authorization: Bearer $TOKEN_TENANT_A" \
     -H "X-Tenant-Id: tenant-b"
   # Should return 403 Forbidden
   ```

2. **Role-Based Access Control**:
   - Test users can only access permitted resources
   - Verify admin-only endpoints are protected
   - Test permission inheritance
   - Verify ACL enforcement

3. **API Endpoint Authorization**:
   - Test all endpoints require authentication
   - Verify proper authorization checks
   - Test privilege escalation attempts
   - Verify CORS configuration

**Success Criteria**:
- Tenant isolation is enforced
- RBAC is properly implemented
- All endpoints are protected
- No privilege escalation possible

**Frequency**: Monthly

#### 2.3 Input Validation Testing

**Purpose**: Verify input validation and sanitization.

**Test Cases**:

1. **SQL Injection**:
   ```bash
   # Test for SQL injection vulnerabilities
   curl -X GET "https://api-staging.castiel.app/api/v1/shards?search=' OR '1'='1" \
     -H "Authorization: Bearer $TOKEN"
   # Should sanitize input, not execute SQL
   ```

2. **XSS (Cross-Site Scripting)**:
   - Test stored XSS in user input
   - Test reflected XSS in query parameters
   - Verify output encoding
   - Test CSP headers

3. **Command Injection**:
   - Test for command injection in file operations
   - Verify path traversal protection
   - Test file upload validation

4. **Input Sanitization**:
   - Test special character handling
   - Verify input length limits
   - Test type validation
   - Verify encoding/decoding

**Success Criteria**:
- All inputs are validated
- No injection vulnerabilities
- Output is properly encoded
- File uploads are validated

**Frequency**: Monthly

#### 2.4 Dependency Vulnerability Scanning

**Purpose**: Identify known vulnerabilities in dependencies.

**Commands**:
```bash
# npm audit
cd apps/api && npm audit
cd apps/web && npm audit

# Snyk (if configured)
snyk test
snyk monitor
```

**Success Criteria**:
- No critical vulnerabilities
- High vulnerabilities patched within 7 days
- Medium vulnerabilities patched within 30 days
- Dependencies kept up to date

**Frequency**: Weekly (automated in CI)

#### 2.5 OWASP Top 10 Testing

**Purpose**: Verify protection against OWASP Top 10 vulnerabilities.

**Test Checklist**:

- [ ] A01:2021 – Broken Access Control
- [ ] A02:2021 – Cryptographic Failures
- [ ] A03:2021 – Injection
- [ ] A04:2021 – Insecure Design
- [ ] A05:2021 – Security Misconfiguration
- [ ] A06:2021 – Vulnerable and Outdated Components
- [ ] A07:2021 – Identification and Authentication Failures
- [ ] A08:2021 – Software and Data Integrity Failures
- [ ] A09:2021 – Security Logging and Monitoring Failures
- [ ] A10:2021 – Server-Side Request Forgery (SSRF)

**Tools**:
- OWASP ZAP automated scan
- Manual penetration testing
- Code review

**Frequency**: Quarterly

### Security Test Execution Checklist

- [ ] Use isolated test environment
- [ ] Obtain approval for security testing
- [ ] Document all findings
- [ ] Classify vulnerabilities (Critical, High, Medium, Low)
- [ ] Create security tickets for findings
- [ ] Verify fixes with retesting
- [ ] Update security documentation

### Security Test Results Analysis

1. **Vulnerability Classification**:
   - Critical: Fix within 24 hours
   - High: Fix within 7 days
   - Medium: Fix within 30 days
   - Low: Fix in next release cycle

2. **Remediation Tracking**:
   - Track all vulnerabilities in issue tracker
   - Verify fixes with retesting
   - Document security improvements

### Related Documentation

- [Authentication Security Verification Report](../AUTHENTICATION_SECURITY_VERIFICATION_REPORT.md)
- [AI Insights Security](../features/ai-insights/SECURITY.md)

---

## 3. Chaos Engineering Test Procedures

### Prerequisites

1. **Chaos Engineering Tools**:
   - Azure Chaos Studio (for Azure resource failures)
   - Custom scripts (for application-level chaos)
   - Kubernetes chaos tools (if using AKS)

2. **Test Environment**:
   - Staging environment (isolated from production)
   - Monitoring enabled (Application Insights)
   - Backup and recovery procedures tested

### Test Scenarios

#### 3.1 Infrastructure Chaos Tests

**Purpose**: Verify system resilience to infrastructure failures.

##### 3.1.1 Redis Failure

**Test**: Simulate Redis connection failure.

**Procedure**:
```bash
# Stop Redis service (in staging)
az redis update \
  --name <redis-name> \
  --resource-group <rg-name> \
  --set enableNonSslPort=false

# Or block Redis port
az network nsg rule create \
  --resource-group <rg-name> \
  --nsg-name <nsg-name> \
  --name block-redis \
  --priority 100 \
  --access Deny \
  --protocol Tcp \
  --destination-port-ranges 6380
```

**Expected Behavior**:
- Application continues to function (graceful degradation)
- Cache operations fail gracefully
- Rate limiting falls back to in-memory
- System recovers when Redis is restored

**Success Criteria**:
- No application crashes
- Error rate < 5%
- System recovers within 5 minutes
- No data loss

**Frequency**: Quarterly

##### 3.1.2 Cosmos DB Latency Injection

**Test**: Simulate high Cosmos DB latency.

**Procedure**:
```bash
# Use Azure Chaos Studio to inject latency
# Or use custom middleware to add artificial delay
```

**Expected Behavior**:
- Application handles slow database gracefully
- Timeouts are properly configured
- Retry logic activates
- User experience degrades gracefully

**Success Criteria**:
- No application crashes
- Timeouts prevent hanging requests
- Retry logic works correctly
- Monitoring alerts trigger

**Frequency**: Quarterly

##### 3.1.3 Container App Restart

**Test**: Simulate container app restart.

**Procedure**:
```bash
# Restart container app
az containerapp restart \
  --name <app-name> \
  --resource-group <rg-name>
```

**Expected Behavior**:
- In-flight requests are handled gracefully
- New requests are queued or fail gracefully
- Health checks detect restart
- Auto-scaling maintains availability

**Success Criteria**:
- No data loss
- Minimal service interruption (< 30 seconds)
- Health checks recover
- Monitoring detects restart

**Frequency**: Monthly

#### 3.2 Application Chaos Tests

**Purpose**: Verify application resilience to internal failures.

##### 3.2.1 Worker Failure

**Test**: Simulate worker process crash.

**Procedure**:
```bash
# Kill worker process
kubectl delete pod <worker-pod-name>
# Or restart worker container app
```

**Expected Behavior**:
- Jobs are requeued
- No job loss
- Other workers continue processing
- System recovers automatically

**Success Criteria**:
- No job loss
- Jobs are requeued within 1 minute
- System recovers automatically
- Monitoring alerts trigger

**Frequency**: Quarterly

##### 3.2.2 Queue Backlog

**Test**: Simulate queue backlog buildup.

**Procedure**:
```bash
# Inject large number of jobs into queue
# Or reduce worker concurrency
```

**Expected Behavior**:
- Queue depth monitoring alerts
- Auto-scaling activates
- System handles backlog
- No job loss

**Success Criteria**:
- Alerts trigger at threshold
- Auto-scaling activates
- Backlog is processed
- No job loss

**Frequency**: Quarterly

#### 3.3 Network Chaos Tests

**Purpose**: Verify network resilience.

##### 3.3.1 Network Partition

**Test**: Simulate network partition between services.

**Procedure**:
```bash
# Use Azure Chaos Studio or network rules
# Block communication between API and database
```

**Expected Behavior**:
- Services handle network failures gracefully
- Retry logic activates
- Circuit breakers prevent cascading failures
- System recovers when network is restored

**Success Criteria**:
- No cascading failures
- Circuit breakers activate
- System recovers automatically
- Monitoring detects partition

**Frequency**: Quarterly

### Chaos Test Execution Checklist

- [ ] Use isolated test environment
- [ ] Verify backups are current
- [ ] Enable detailed monitoring
- [ ] Document baseline metrics
- [ ] Execute chaos test
- [ ] Monitor system behavior
- [ ] Verify recovery
- [ ] Document findings
- [ ] Create improvement tickets

### Chaos Test Results Analysis

1. **Resilience Metrics**:
   - Mean Time To Recovery (MTTR)
   - Error rate during chaos
   - Data loss incidents
   - Service availability

2. **Improvement Opportunities**:
   - Identify weak points
   - Document failure modes
   - Propose improvements
   - Update runbooks

### Related Documentation

- [Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)

---

## 4. Disaster Recovery Test Procedures

### Prerequisites

1. **Backup Verification**:
   - Cosmos DB continuous backup enabled
   - Redis backup configured
   - Terraform state backed up
   - Configuration documented

2. **Test Environment**:
   - Isolated recovery environment
   - Access to backup storage
   - Recovery scripts tested
   - Monitoring enabled

### Test Scenarios

#### 4.1 Backup Verification Test

**Purpose**: Verify backups are working and can be restored.

**Procedure**:

1. **Cosmos DB Backup Verification**:
   ```bash
   # List available restore points
   az cosmosdb sql container list-restorable-resources \
     --account-name <cosmos-account> \
     --location <location> \
     --database-name castiel
   
   # Verify backup retention
   az cosmosdb show \
     --name <cosmos-account> \
     --resource-group <rg-name> \
     --query "backupPolicy"
   ```

2. **Redis Backup Verification**:
   ```bash
   # Check Redis backup configuration
   az redis show \
     --name <redis-name> \
     --resource-group <rg-name> \
     --query "redisConfiguration.rdbBackupEnabled"
   ```

3. **Terraform State Backup**:
   ```bash
   # Export Terraform state
   terraform state pull > state-backup-$(date +%Y%m%d).json
   ```

**Success Criteria**:
- Cosmos DB backups are available
- Redis backups are configured
- Terraform state is backed up
- Backup retention meets RPO requirements

**Frequency**: Monthly

#### 4.2 Point-in-Time Recovery Test

**Purpose**: Verify ability to restore to a specific point in time.

**Procedure**:

1. **Create Test Data**:
   ```bash
   # Create test shard
   curl -X POST https://api-staging.castiel.app/api/v1/shards \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"DR-Test-Shard","type":"document"}'
   ```

2. **Note Timestamp**: Record current time

3. **Delete Test Data**: Delete the test shard

4. **Restore to Point-in-Time**:
   ```bash
   # Restore Cosmos DB container
   az cosmosdb sql container restore \
     --account-name <cosmos-account> \
     --database-name castiel \
     --name shards \
     --restore-timestamp <timestamp-before-deletion>
   ```

5. **Verify Data**: Confirm test shard is restored

**Success Criteria**:
- Data can be restored to specific timestamp
- RPO of 1 hour is met
- No data corruption
- Application functions correctly after restore

**Frequency**: Quarterly

#### 4.3 Full System Recovery Test

**Purpose**: Verify complete system recovery from backup.

**Procedure**:

1. **Document Current State**:
   - Export Terraform state
   - Document resource configurations
   - Export application settings

2. **Simulate Disaster**:
   - Delete test environment resources
   - Or use isolated recovery environment

3. **Execute Recovery**:
   ```bash
   # Restore infrastructure
   terraform apply
   
   # Restore Cosmos DB
   az cosmosdb sql container restore ...
   
   # Restore Redis (if applicable)
   az redis create --restore ...
   
   # Restore application configuration
   az containerapp update --set-env-vars ...
   ```

4. **Verify System**:
   - Health checks pass
   - Data integrity verified
   - Application functions correctly
   - Monitoring is working

**Success Criteria**:
- RTO of 4 hours is met
- All services are restored
- Data integrity is maintained
- System is fully functional

**Frequency**: Annually (or after major infrastructure changes)

#### 4.4 Regional Failover Test

**Purpose**: Verify multi-region failover capability.

**Procedure**:

1. **Verify Secondary Region**:
   ```bash
   # Check Cosmos DB multi-region configuration
   az cosmosdb show \
     --name <cosmos-account> \
     --resource-group <rg-name> \
     --query "locations"
   ```

2. **Initiate Failover**:
   ```bash
   # Failover Cosmos DB to secondary region
   az cosmosdb failover-priority-change \
     --account-name <cosmos-account> \
     --resource-group <rg-name> \
     --failover-policies <policies>
   ```

3. **Update Traffic Manager**:
   ```bash
   # Update Traffic Manager to point to secondary region
   az network traffic-manager profile update ...
   ```

4. **Verify Functionality**:
   - Health checks pass
   - Application functions correctly
   - Data is accessible
   - Performance is acceptable

**Success Criteria**:
- Failover completes within RTO
- No data loss
- Application functions correctly
- Performance is acceptable

**Frequency**: Annually

### DR Test Execution Checklist

- [ ] Verify backups are current
- [ ] Document current system state
- [ ] Use isolated test environment
- [ ] Execute recovery procedure
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Document recovery time
- [ ] Update runbooks based on findings
- [ ] Create improvement tickets

### DR Test Results Analysis

1. **Recovery Metrics**:
   - Recovery Time Objective (RTO): Target 4 hours
   - Recovery Point Objective (RPO): Target 1 hour
   - Data loss incidents
   - Service availability during recovery

2. **Improvement Opportunities**:
   - Identify recovery bottlenecks
   - Document lessons learned
   - Propose automation improvements
   - Update runbooks

### Related Documentation

- [Disaster Recovery Test Procedures](./DISASTER_RECOVERY_TEST_PROCEDURES.md) - Comprehensive DR test procedures and schedule
- [Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md) - DR recovery procedures
- [Backup Verification Report](./BACKUP_VERIFICATION_REPORT.md) - Backup configuration and verification
- [Production Runbooks](./PRODUCTION_RUNBOOKS.md) - Production procedures

---

## Test Schedule

### Recommended Test Frequency

| Test Type | Frequency | Owner |
|-----------|-----------|-------|
| Load Testing (Normal) | Weekly | DevOps Team |
| Load Testing (Peak) | Monthly | DevOps Team |
| Load Testing (Stress) | Quarterly | DevOps Team |
| Security Testing (Automated) | Weekly (CI) | Security Team |
| Security Testing (Manual) | Monthly | Security Team |
| Security Testing (OWASP) | Quarterly | Security Team |
| Chaos Engineering | Quarterly | DevOps Team |
| DR Backup Verification | Monthly | DevOps Team |
| DR Point-in-Time Recovery | Quarterly | DevOps Team |
| DR Full System Recovery | Annually | DevOps Team |
| DR Regional Failover | Annually | DevOps Team |

### Test Calendar

- **Weekly**: Normal load tests, automated security scans
- **Monthly**: Peak load tests, manual security testing, backup verification
- **Quarterly**: Stress tests, OWASP testing, chaos engineering, point-in-time recovery
- **Annually**: Full system recovery, regional failover

---

## Test Reporting

### Test Report Template

For each test execution, document:

1. **Test Information**:
   - Test type and scenario
   - Date and time
   - Test environment
   - Test duration

2. **Test Results**:
   - Success/failure status
   - Key metrics
   - Issues identified
   - Performance compared to baselines

3. **Findings**:
   - Issues discovered
   - Severity classification
   - Recommended actions
   - Improvement opportunities

4. **Actions**:
   - Tickets created
   - Runbooks updated
   - Documentation updated
   - Follow-up tests scheduled

### Test Results Storage

- Store test results in: `docs/test-results/`
- Format: Markdown with timestamps
- Include: Metrics, screenshots, logs
- Archive: Keep results for 1 year

---

## Continuous Improvement

### Test Procedure Updates

- Review test procedures quarterly
- Update based on:
  - New features
  - Infrastructure changes
  - Incident learnings
  - Industry best practices

### Metrics Tracking

Track the following metrics over time:
- Test execution frequency
- Test success rate
- Issues discovered per test
- Time to fix issues
- Recovery time improvements

---

## Contact Information

- **Test Coordinator**: DevOps Team Lead
- **Security Testing**: Security Team
- **Load Testing**: Performance Team
- **DR Testing**: Infrastructure Team

---

## Appendix: Quick Reference

### Load Testing Commands

```bash
# Normal load
./scripts/run-load-test.sh

# Peak load
k6 run --env TEST_TYPE=peak tests/load/k6-scenarios-enhanced.js

# Stress test
k6 run --env TEST_TYPE=stress tests/load/k6-scenarios-enhanced.js
```

### Security Testing Commands

```bash
# Dependency scan
npm audit
snyk test

# OWASP ZAP scan
zap-cli quick-scan https://api-staging.castiel.app
```

### DR Testing Commands

```bash
# Verify backups
az cosmosdb sql container list-restorable-resources ...

# Restore point-in-time
az cosmosdb sql container restore ...
```

---

## Related Documentation

- [Load Testing Guide](../performance/LOAD_TESTING_GUIDE.md)
- [Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)
- [Production Runbooks](./PRODUCTION_RUNBOOKS.md)
- [Performance Budgets](../performance/PERFORMANCE_BUDGETS.md)
