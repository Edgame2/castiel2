# AI Insights - Operational Runbook

**Last Updated**: January 2025  
**Purpose**: Operational procedures for AI Insights system

---

## Table of Contents

1. [Service Health Checks](#service-health-checks)
2. [Common Issues and Resolutions](#common-issues-and-resolutions)
3. [Deployment Procedures](#deployment-procedures)
4. [Rollback Procedures](#rollback-procedures)
5. [Emergency Response](#emergency-response)
6. [Debugging Guides](#debugging-guides)
7. [Monitoring and Alerts](#monitoring-and-alerts)

---

## Service Health Checks

### Check Service Registry Health

```bash
# Via API
curl -H "Authorization: Bearer $TOKEN" \
  https://api.castiel.com/api/v1/health/services

# Expected response includes:
# - Service status (healthy/unhealthy/unknown)
# - Dependencies status
# - Last health check timestamp
```

### Check Individual Services

**Context Cache Service**:
```bash
# Check cache metrics
curl -H "Authorization: Bearer $TOKEN" \
  https://api.castiel.com/api/v1/cache/metrics

# Expected: Hit rate >80%, low error rate
```

**Feedback Service**:
```bash
# Check feedback metrics
curl -H "Authorization: Bearer $TOKEN" \
  https://api.castiel.com/api/v1/feedback/metrics?period=day

# Expected: Positive rate >70%, no critical alerts
```

**Risk Evaluation Service**:
```bash
# Check service availability
# Via service registry health check
# Expected: Service healthy, dependencies available
```

---

## Common Issues and Resolutions

### Issue: High Emergency Prompt Fallback Usage

**Symptoms**:
- `insight.prompt-fallback-emergency` events in monitoring
- Users receiving generic responses

**Diagnosis**:
1. Check if system prompts are seeded:
   ```bash
   # Check prompts container
   # Verify prompts exist for tenant "SYSTEM"
   ```

2. Check PromptResolverService availability:
   - Verify service is initialized
   - Check database connectivity
   - Review service registry health

**Resolution**:
1. Seed system prompts:
   ```bash
   pnpm --filter @castiel/api run seed:prompts
   ```

2. Verify prompts are accessible:
   ```bash
   # Check via API or database
   # Verify prompts exist with status "active"
   ```

3. Monitor for continued fallback usage

---

### Issue: High Negative Feedback Rate

**Symptoms**:
- Feedback alerts (high/critical severity)
- Negative feedback rate >25%

**Diagnosis**:
1. Check feedback dashboard:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.castiel.com/api/v1/feedback/dashboard
   ```

2. Review top issues and recommendations
3. Check model-specific metrics
4. Review insight type breakdown

**Resolution**:
1. **Immediate** (if critical):
   - Review recent prompt changes
   - Check for model degradation
   - Review context quality metrics

2. **Short-term**:
   - Apply prompt improvement suggestions
   - Consider A/B testing alternative prompts
   - Review and fix identified issues

3. **Long-term**:
   - Monitor trends
   - Implement continuous improvements
   - Track improvement effectiveness

---

### Issue: Context Cache Staleness

**Symptoms**:
- `context-cache.stale-hit` events
- Users receiving outdated information

**Diagnosis**:
1. Check cache metrics:
   ```bash
   # Review cache staleness metrics
   # Check average age of cache hits
   ```

2. Review cache TTL settings
3. Check cache invalidation patterns

**Resolution**:
1. **Immediate**:
   - Invalidate stale caches manually if needed
   - Review cache invalidation rules

2. **Short-term**:
   - Adjust TTL based on data change frequency
   - Improve cache invalidation triggers
   - Review cache warming strategy

3. **Long-term**:
   - Implement smarter cache invalidation
   - Optimize cache warming
   - Monitor cache effectiveness

---

### Issue: PII Detection/Redaction Failures

**Symptoms**:
- PII exposure incidents
- Redaction errors in logs

**Diagnosis**:
1. Check PII detection service health
2. Review detection patterns
3. Check redaction strategy configuration

**Resolution**:
1. **Immediate**:
   - Review and update PII patterns
   - Verify redaction strategies
   - Check configuration

2. **Short-term**:
   - Update detection patterns
   - Improve redaction strategies
   - Add missing PII types

3. **Long-term**:
   - Regular pattern updates
   - ML-based detection enhancement
   - Compliance review

---

### Issue: Risk Analysis Tool Failures

**Symptoms**:
- AI Chat unable to query risk analysis
- Tool execution errors

**Diagnosis**:
1. Check RiskEvaluationService availability
2. Verify tool registration
3. Check permissions

**Resolution**:
1. Verify RiskEvaluationService is initialized
2. Check tool registration in AIToolExecutorService
3. Verify user permissions (`risk:read` or `risk:write`)
4. Review tool execution logs

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All system prompts seeded
- [ ] Service registry health checks passing
- [ ] Configuration validated
- [ ] Database migrations completed
- [ ] Cache cleared (if needed)
- [ ] Monitoring alerts configured

### Deployment Steps

1. **Backup Current State**:
   ```bash
   # Backup database
   # Backup configuration
   # Backup prompts
   ```

2. **Deploy Code**:
   ```bash
   # Standard deployment process
   # Verify deployment success
   ```

3. **Post-Deployment Verification**:
   ```bash
   # Check service health
   # Verify prompts are accessible
   # Test critical endpoints
   # Monitor for errors
   ```

4. **Seed System Prompts** (if needed):
   ```bash
   pnpm --filter @castiel/api run seed:prompts
   ```

5. **Monitor**:
   - Watch for errors in first 15 minutes
   - Check feedback metrics
   - Verify cache performance
   - Review alert frequency

---

## Rollback Procedures

### Quick Rollback

1. **Revert Code Deployment**:
   ```bash
   # Standard rollback process
   ```

2. **Clear Caches** (if needed):
   ```bash
   # Clear context caches
   # Clear prompt caches
   ```

3. **Verify Rollback**:
   - Check service health
   - Test critical endpoints
   - Monitor for errors

### Data Rollback

**Prompts**:
- Revert to previous prompt versions via database
- Or re-seed from backup

**Configuration**:
- Revert configuration changes
- Restart services if needed

---

## Emergency Response

### Critical: Harmful Content Reported

**Immediate Actions**:
1. Review reported content
2. Check prompt injection defenses
3. Review content filters
4. Consider blocking model/template combination

**Follow-up**:
1. Investigate root cause
2. Update defenses if needed
3. Review similar content
4. Notify affected users

### Critical: System-Wide Failures

**Immediate Actions**:
1. Check service registry for failed services
2. Review error logs
3. Check database connectivity
4. Verify Redis connectivity

**Fallback**:
1. Enable emergency fallbacks if needed
2. Disable non-critical features
3. Notify users of degraded service

---

## Debugging Guides

### Debug Context Assembly

**Enable Debug Logging**:
```typescript
// Set log level to debug
// Review context assembly logs
```

**Check Points**:
1. Primary chunk retrieval
2. RAG chunk retrieval
3. Cache hits/misses
4. Token counting
5. Context quality assessment

**Common Issues**:
- Empty context → Check vector search
- Stale context → Check cache TTL
- Token overflow → Check token limits
- Missing related shards → Check relationships

### Debug Feedback Analysis

**Check Feedback Collection**:
1. Verify feedback is being recorded
2. Check FeedbackLearningService availability
3. Review feedback entry format

**Check Analysis**:
1. Verify sufficient sample size
2. Check analysis period
3. Review pattern detection

**Check Alerts**:
1. Verify alert thresholds
2. Check alert generation
3. Review alert delivery

### Debug Prompt Resolution

**Check Prompt Availability**:
1. Verify prompts are seeded
2. Check prompt status (active/draft/archived)
3. Review prompt scope (system/tenant/project/user)

**Check Resolution**:
1. Review resolution precedence
2. Check cache hits/misses
3. Verify template rendering

**Check Fallbacks**:
1. Review fallback triggers
2. Check emergency fallback usage
3. Verify fallback prompts

---

## Monitoring and Alerts

### Key Metrics to Monitor

**Performance**:
- Response latency (P50, P95, P99)
- Token usage
- Cache hit rates
- Error rates

**Quality**:
- Feedback positive/negative rates
- Satisfaction scores
- Context quality scores
- Grounding scores

**Security**:
- PII detection/redaction events
- Prompt injection attempts
- Permission violations
- Citation validation failures

### Alert Configuration

**Critical Alerts**:
- Harmful content reported
- System-wide service failures
- Critical negative feedback rate (>50%)
- PII exposure incidents

**High Priority Alerts**:
- High negative feedback rate (>35%)
- Model-specific issues
- Prompt template issues
- Cache critical staleness

**Medium Priority Alerts**:
- Medium negative feedback rate (>25%)
- Context quality degradation
- Increased error rates

### Alert Response

**Critical**: Immediate response required
**High**: Response within 1 hour
**Medium**: Response within 4 hours
**Low**: Review during next business day

---

## Maintenance Procedures

### Regular Maintenance Tasks

**Daily**:
- Review feedback metrics
- Check for critical alerts
- Monitor cache performance

**Weekly**:
- Review feedback trends
- Analyze prompt performance
- Review and apply improvement suggestions
- Check service health

**Monthly**:
- Comprehensive feedback analysis
- Prompt template review
- Cache optimization review
- Security audit review

### Prompt Template Updates

1. Create new prompt version
2. Test in staging
3. A/B test if appropriate
4. Deploy to production
5. Monitor feedback metrics
6. Rollback if negative impact

### Cache Optimization

1. Review cache metrics
2. Identify optimization opportunities
3. Adjust TTL values
4. Implement cache warming
5. Monitor improvements

---

## Support Contacts

**On-Call Rotation**: See internal documentation

**Escalation Path**:
1. Check runbook
2. Review logs and metrics
3. Escalate to on-call engineer
4. Escalate to team lead if needed

---

**Status**: ✅ Production-ready operational procedures

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - AI Insights runbook fully documented

#### Implemented Features (✅)

- ✅ Service health checks
- ✅ Common issues and resolutions
- ✅ Deployment procedures
- ✅ Rollback procedures
- ✅ Emergency response
- ✅ Monitoring and alerts

#### Known Limitations

- ⚠️ **Runbook Testing** - Runbook procedures may not be regularly tested
  - **Recommendation:**
    1. Test runbook procedures in staging
    2. Update runbook based on actual incidents
    3. Document lessons learned

- ⚠️ **Automation** - Some procedures may be manual
  - **Recommendation:**
    1. Automate common procedures
    2. Create scripts for repetitive tasks
    3. Document automation procedures

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [AI Insights Feature](../features/ai-insights/README.md) - AI Insights documentation
- [Production Runbooks](./PRODUCTION_RUNBOOKS.md) - General production procedures
