# ADR-003: Network Security and Isolation

**Status**: Accepted  
**Date**: January 2025  
**Deciders**: Security Team, Architecture Team

---

## Context

Security is critical for Castiel, which handles sensitive customer data. We need to:
- Protect against external threats
- Isolate internal services
- Meet compliance requirements (SOC 2, GDPR)
- Prevent data exfiltration

---

## Decision

We will implement defense-in-depth network security:

1. **Private Endpoints**: All Azure services accessible only via VNet
2. **Network Security Groups**: Least-privilege rules per subnet
3. **Web Application Firewall**: OWASP 3.2 rules, Prevention mode
4. **DDoS Protection**: Standard tier for production

### Network Architecture

- **App Services Subnet**: Outbound HTTPS only, no inbound
- **Redis Subnet**: Inbound from App Services only
- **Private Endpoints Subnet**: Isolated for service connections

---

## Consequences

### Positive
- Strong security posture
- Compliance-ready
- Reduced attack surface
- Better audit trail

### Negative
- More complex network configuration
- Potential connectivity issues during troubleshooting
- Additional costs (WAF, DDoS Protection)

---

## Alternatives Considered

1. **Public Endpoints Only**: Too insecure
2. **VPN-Only Access**: Too restrictive for cloud services
3. **Hybrid Approach**: Selected (private endpoints + WAF)

---

## Implementation Notes

- NSGs: `infrastructure/terraform/network-security.tf`
- Private Endpoints: `infrastructure/terraform/private-endpoints.tf`
- WAF: `infrastructure/terraform/waf.tf`

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Network security strategy documented but may not be fully implemented

#### Implemented Features (✅)

- ✅ Network security strategy defined
- ✅ Security architecture documented
- ✅ Implementation approach defined

#### Known Limitations

- ⚠️ **Network Security Implementation** - Network security may not be fully configured
  - **Code Reference:**
    - Terraform configuration may need verification
  - **Recommendation:**
    1. Verify network security configuration
    2. Test network isolation
    3. Document network security setup

- ⚠️ **Private Endpoints** - Private endpoints may not be configured
  - **Recommendation:**
    1. Configure private endpoints
    2. Test private endpoint connectivity
    3. Document private endpoint setup

### Related Documentation

- [Gap Analysis](../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](../README.md) - Infrastructure overview
- [Terraform Deployment](../TERRAFORM_DEPLOYMENT.md) - Infrastructure deployment



