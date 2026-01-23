# Production Runbooks Index

**Last Updated**: January 2025  
**Status**: Production Runbook Index

---

## Overview

This directory contains all production runbooks for the Castiel platform. These runbooks provide step-by-step procedures for common operational tasks, incident response, troubleshooting, and maintenance operations.

---

## Quick Navigation

### 🚨 Emergency Procedures

- **[Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md)** - Complete incident response procedures for P0-P3 incidents
- **[Emergency Rollback](./rollback-procedures.md#emergency-rollback)** - Fast rollback procedures for critical incidents

### 📋 Core Runbooks

1. **[Incident Response](../operations/INCIDENT_RESPONSE_PLAN.md)**
   - Severity levels (P0-P3)
   - Response procedures
   - Escalation paths
   - Post-mortem process

2. **[Troubleshooting](./troubleshooting.md)**
   - Service won't start
   - Database connection issues
   - Redis connection issues
   - High memory usage
   - Slow API responses
   - Authentication failures

3. **[Database Migrations](./database-migrations.md)**
   - Pre-migration checklist
   - Migration execution
   - Verification procedures
   - Rollback procedures
   - Best practices

4. **[Rollback Procedures](./rollback-procedures.md)**
   - Code rollback (Blue-Green deployment)
   - Database rollback (Point-in-time restore)
   - Infrastructure rollback (Terraform)
   - Configuration rollback
   - Emergency rollback

### 📚 Additional Runbooks

- **[Production Runbooks](../operations/PRODUCTION_RUNBOOKS.md)** - General production procedures (deployment, monitoring, alerts, etc.)
- **[Disaster Recovery Runbook](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md)** - Disaster recovery scenarios and procedures
- **[Test Procedures](../operations/TEST_PROCEDURES.md)** - Load testing, security testing, chaos engineering, and DR testing
- **[Health Checks](../operations/HEALTH_CHECKS.md)** - Health check procedures and endpoints
- **[AI Insights Runbook](../operations/AI_INSIGHTS_RUNBOOK.md)** - AI-specific operational procedures

---

## Runbook Usage Guide

### When to Use Each Runbook

| Scenario | Primary Runbook | Secondary Runbook |
|----------|----------------|-------------------|
| Service is down | [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md) | [Troubleshooting](./troubleshooting.md) |
| High error rate | [Troubleshooting](./troubleshooting.md) | [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md) |
| Slow performance | [Troubleshooting](./troubleshooting.md) | [Production Runbooks](../operations/PRODUCTION_RUNBOOKS.md) |
| Database migration needed | [Database Migrations](./database-migrations.md) | [Rollback Procedures](./rollback-procedures.md) |
| Need to rollback deployment | [Rollback Procedures](./rollback-procedures.md) | [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md) |
| Security incident | [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md) | [Disaster Recovery](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md) |
| Data corruption | [Disaster Recovery](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md) | [Database Migrations](./database-migrations.md) |
| Regional outage | [Disaster Recovery](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md) | [Incident Response Plan](../operations/INCIDENT_RESPONSE_PLAN.md) |

### Runbook Execution Checklist

Before executing any runbook procedure:

- [ ] Read the entire runbook section relevant to your scenario
- [ ] Verify you have necessary access (Azure, SSH, database, etc.)
- [ ] Check if a maintenance window is needed
- [ ] Notify team members if required
- [ ] Have rollback procedure ready
- [ ] Document all steps taken
- [ ] Monitor system after procedure

---

## Runbook Maintenance

### Update Frequency

- **Quarterly Review**: All runbooks reviewed and updated
- **After Incidents**: Update relevant runbooks with lessons learned
- **After Infrastructure Changes**: Update affected runbooks
- **After New Features**: Add relevant procedures if needed

### Contributing to Runbooks

When updating runbooks:

1. **Test Procedures**: Test all procedures in staging before documenting
2. **Be Specific**: Include exact commands, paths, and values
3. **Add Context**: Explain why each step is necessary
4. **Include Examples**: Provide real examples where possible
5. **Cross-Reference**: Link to related runbooks and documentation
6. **Update Dates**: Update "Last Updated" date when making changes

### Runbook Quality Standards

All runbooks must:

- ✅ Have clear step-by-step procedures
- ✅ Include prerequisites and required access
- ✅ Provide verification steps
- ✅ Include rollback procedures where applicable
- ✅ Cross-reference related documentation
- ✅ Be tested in staging environment
- ✅ Include troubleshooting tips
- ✅ Have clear success criteria

---

## Emergency Contacts

### On-Call Rotation

- **Primary**: Backend engineer (API issues)
- **Secondary**: DevOps engineer (Infrastructure issues)
- **Escalation**: Engineering lead

### Communication Channels

- **Slack**: #castiel-incidents
- **PagerDuty**: Castiel On-Call
- **Status Page**: https://status.castiel.com
- **Email**: ops@castiel.com

---

## Related Documentation

- [Production Runbooks](../operations/PRODUCTION_RUNBOOKS.md) - General production procedures
- [Test Procedures](../operations/TEST_PROCEDURES.md) - Testing procedures
- [Disaster Recovery](../infrastructure/DISASTER_RECOVERY_RUNBOOK.md) - Disaster recovery scenarios
- [Health Checks](../operations/HEALTH_CHECKS.md) - Health check procedures
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview

---

## Runbook Status

| Runbook | Status | Last Updated | Next Review |
|---------|--------|--------------|-------------|
| Incident Response Plan | ✅ Complete | 2025-01-XX | Quarterly |
| Troubleshooting | ✅ Complete | 2025-01-XX | Quarterly |
| Database Migrations | ✅ Complete | 2025-01-XX | Quarterly |
| Rollback Procedures | ✅ Complete | 2025-01-XX | Quarterly |
| Production Runbooks | ✅ Complete | 2025-01-XX | Quarterly |
| Disaster Recovery | ✅ Complete | 2025-01-XX | Quarterly |
| Test Procedures | ✅ Complete | 2025-01-XX | Quarterly |

---

**Document Version**: 1.0  
**Last Review**: January 2025  
**Next Review**: Quarterly
