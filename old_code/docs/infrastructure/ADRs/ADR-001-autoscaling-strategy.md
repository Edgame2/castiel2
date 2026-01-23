# ADR-001: Autoscaling Strategy

**Status**: Accepted  
**Date**: January 2025  
**Deciders**: Architecture Team

---

## Context

The Castiel platform needs to handle variable workloads efficiently while minimizing costs. We need an autoscaling strategy that:
- Responds quickly to traffic spikes
- Minimizes costs during low-traffic periods
- Maintains performance SLAs
- Works across App Services, Functions, and Cosmos DB

---

## Decision

We will implement a multi-metric autoscaling strategy:

1. **App Services**: CPU, Memory, HTTP Queue Length, Request Count
2. **Azure Functions**: CPU, Execution Count (with max instances)
3. **Cosmos DB**: Serverless mode (automatic scaling)

### Scaling Rules

- **Scale Out**: When CPU > 70% OR Memory > 80% OR Queue Length > 100
- **Scale In**: When CPU < 30% AND Memory < 50% for 10 minutes
- **Cooldown**: 5 minutes for scale out, 10 minutes for scale in

---

## Consequences

### Positive
- Automatic response to traffic changes
- Cost optimization through right-sizing
- Better performance during peak loads

### Negative
- Slight delay in scaling (5-10 minutes)
- Potential cold starts for Functions
- Need to monitor and tune thresholds

---

## Alternatives Considered

1. **Manual Scaling**: Too slow and error-prone
2. **Predictive Scaling**: Requires historical data, complex setup
3. **Time-based Scaling**: Doesn't respond to actual demand

---

## Implementation Notes

- Configured in `infrastructure/terraform/app-services.tf` and `functions.tf`
- Monitoring via Application Insights
- Alerts configured for scaling events

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Autoscaling strategy documented but may not be fully implemented

#### Implemented Features (✅)

- ✅ Autoscaling strategy defined
- ✅ Scaling rules documented
- ✅ Monitoring approach defined

#### Known Limitations

- ⚠️ **Autoscaling Implementation** - Autoscaling may not be fully configured
  - **Code Reference:**
    - Terraform configuration may need verification
  - **Recommendation:**
    1. Verify autoscaling configuration in Terraform
    2. Test autoscaling behavior
    3. Monitor scaling events

- ⚠️ **Functions Migration** - Functions have been migrated to Container Apps
  - **Code Reference:**
    - Document references Azure Functions
  - **Recommendation:**
    1. Update documentation for Container Apps
    2. Document Container Apps autoscaling
    3. Remove Functions references

### Related Documentation

- [Gap Analysis](../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](../README.md) - Infrastructure overview
- [Terraform Deployment](../TERRAFORM_DEPLOYMENT.md) - Infrastructure deployment



