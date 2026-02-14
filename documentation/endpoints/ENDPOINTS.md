# Endpoints — Exhaustive List with Implementation Status

**Date:** 2026-02-12  
**Scope:** All Castiel API endpoints across gateway, services, and OpenAPI specs  
**Status values:** Fully | Partial | Stub | Missing

---

## Legend

| Status | Meaning |
|--------|---------|
| **Fully** | Complete implementation; service logic, tests, UI integration where applicable |
| **Partial** | Implemented but gaps (tests, config, X-Tenant-ID, docs, feature flags) |
| **Stub** | Placeholder or scaffolding only; backend not wired or minimal logic |
| **Missing** | Not implemented; in OpenAPI/spec but no route, or route exists but not wired to gateway |

Paths `/health`, `/ready`, `/metrics` in tables are **service-relative** (not client path); when called via gateway the client path is `/api/v1/<service-path>` where applicable.

---

## 1. Auth Service — Client path: `/api/v1/auth`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/health | Fully | Liveness |
| GET | /api/v1/ready | Fully | Readiness |
| POST | /api/v1/auth/login | Fully | Credentials login |
| POST | /api/v1/auth/login/complete-mfa | Fully | Complete MFA after login |
| POST | /api/v1/auth/register | Fully | User registration |
| POST | /api/v1/auth/forgot-password | Fully | Password reset request |
| POST | /api/v1/auth/reset-password | Fully | Password reset with token |
| GET | /api/v1/auth/verify-email | Fully | Email verification |
| POST | /api/v1/auth/verify-email | Fully | Resend verification |
| POST | /api/v1/auth/logout | Fully | Clear session |
| GET | /api/v1/auth/me | Fully | Current user |
| POST | /api/v1/auth/refresh | Fully | Refresh token |
| GET | /api/v1/auth/mfa/status | Fully | MFA enrollment status |
| POST | /api/v1/auth/mfa/enroll | Fully | TOTP enroll |
| POST | /api/v1/auth/mfa/verify | Fully | Verify TOTP |
| POST | /api/v1/auth/mfa/verify-backup | Fully | Verify backup code |
| POST | /api/v1/auth/mfa/backup-codes/generate | Fully | Generate backup codes |
| POST | /api/v1/auth/mfa/disable | Fully | Disable MFA |
| GET | /api/v1/auth/google/callback | Fully | OAuth callback |
| GET | /api/v1/auth/oauth/github/callback | Fully | OAuth callback |
| GET | /api/v1/auth/api-keys | Partial | User-scoped; feature flag |
| POST | /api/v1/auth/api-keys | Partial | Feature flag |
| DELETE | /api/v1/auth/api-keys/:id | Partial | Feature flag |
| GET | /api/v1/auth/health | Fully | Health check |
| GET | /api/v1/auth/tenants/:tenantId/sso/config | Fully | SSO config (tenant-scoped; preferred) |
| PUT | /api/v1/auth/tenants/:tenantId/sso/config | Fully | Update SSO config (tenant-scoped; preferred) |
| POST | /api/v1/auth/tenants/:tenantId/sso/config | Fully | Configure SSO (tenant-scoped; preferred) |
| POST | /api/v1/auth/tenants/:tenantId/sso/test | Fully | Test SSO connection (tenant-scoped; preferred) |
| POST | /api/v1/auth/tenants/:tenantId/sso/disable | Fully | Disable SSO (tenant-scoped; preferred) |
| GET | /api/v1/auth/tenants/:tenantId/sso/credentials | Fully | Get SSO credentials (service-to-service; preferred) |
| POST | /api/v1/auth/tenants/:tenantId/sso/certificate/rotate | Fully | Rotate SSO certificate (tenant-scoped; preferred) |
| GET/PUT/POST | /api/v1/auth/organizations/:orgId/sso/* | Deprecated | Use /api/v1/auth/tenants/:tenantId/sso/* instead; removal in 2 versions |

---

## 2. User Management — Client path: `/api/v1/users`, `/api/v1/tenants`, etc.

Note: All user-management resources are tenant-scoped. Client path uses `tenantId`; there is no organization entity. Service liveness/readiness (`/health`, `/ready`) are service-relative.

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/users | Fully | List users (query tenantId) |
| GET | /api/v1/users/me | Fully | Current profile |
| PUT | /api/v1/users/me | Fully | Update profile |
| GET | /api/v1/users/:id | Fully | Get user by id |
| PUT | /api/v1/users/:id | Fully | Admin update user |
| DELETE | /api/v1/users/:userId | Fully | Delete user (Super Admin) |
| POST | /api/v1/users/me/deactivate | Fully | Deactivate self |
| POST | /api/v1/users/:userId/deactivate | Fully | Admin deactivate |
| POST | /api/v1/users/:userId/reactivate | Fully | Admin reactivate |
| GET | /api/v1/users/me/sessions | Fully | List sessions |
| DELETE | /api/v1/users/me/sessions/:sessionId | Fully | Revoke session |
| POST | /api/v1/users/me/sessions/revoke-all-others | Fully | Revoke others |
| POST | /api/v1/invitations/:token/accept | Fully | Accept invitation (public) |
| GET | /api/v1/tenants/:tenantId/teams | Fully | List teams |
| POST | /api/v1/tenants/:tenantId/teams | Fully | Create team |
| GET | /api/v1/tenants/:tenantId/teams/:teamId | Fully | Get team |
| PUT | /api/v1/tenants/:tenantId/teams/:teamId | Fully | Update team |
| DELETE | /api/v1/tenants/:tenantId/teams/:teamId | Fully | Delete team |
| POST | /api/v1/tenants/:tenantId/teams/:teamId/members | Fully | Add team member |
| DELETE | /api/v1/tenants/:tenantId/teams/:teamId/members/:userId | Fully | Remove team member |
| GET | /api/v1/tenants/:tenantId/roles | Fully | List roles |
| POST | /api/v1/tenants/:tenantId/roles | Fully | Create role |
| GET | /api/v1/tenants/:tenantId/roles/:roleId | Fully | Get role |
| PUT | /api/v1/tenants/:tenantId/roles/:roleId | Fully | Update role |
| DELETE | /api/v1/tenants/:tenantId/roles/:roleId | Fully | Delete role |
| GET | /api/v1/tenants/:tenantId/roles/:roleId/permissions | Fully | Role permissions |
| GET | /api/v1/tenants/:tenantId/permissions | Fully | List permissions |
| POST | /api/v1/tenants/:tenantId/invitations | Fully | Create invitation |
| GET | /api/v1/tenants/:tenantId/invitations | Fully | List invitations |
| POST | /api/v1/tenants/:tenantId/invitations/:invitationId/resend | Fully | Resend invitation |
| DELETE | /api/v1/tenants/:tenantId/invitations/:invitationId | Fully | Cancel invitation |
| GET | /api/v1/tenants/:tenantId/api-keys | Stub | List API keys (backend TBD) |
| POST | /api/v1/tenants/:tenantId/api-keys | Stub | Create API key (backend TBD) |
| DELETE | /api/v1/tenants/:tenantId/api-keys/:keyId | Stub | Revoke API key (backend TBD) |
| POST | /api/v1/tenants/:tenantId/api-keys/:keyId/rotate | Stub | Rotate API key (backend TBD) |
| GET | /api/v1/admin/tenants | Stub | Admin list tenants (recommendations; returns empty) |
| GET | /api/v1/admin/tenants/:tenantId | Stub | Admin get tenant (recommendations; 404 for now) |
| GET | /health | Fully | Service-relative; not used as client path |
| GET | /ready | Fully | Service-relative; not used as client path |
| GET | /api/v1/users/health | Fully | Users health |

---

## 3. Recommendations Service

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/recommendations | Fully | List by opportunityId |
| GET | /api/v1/recommendations/:id | Fully | Get recommendation |
| POST | /api/v1/recommendations/:id/feedback | Fully | Submit feedback |
| GET | /api/v1/opportunities/:id/mitigation-actions | Fully | Ranked mitigation actions |
| GET | /api/v1/remediation-workflows | Fully | List by opportunityId |
| POST | /api/v1/remediation-workflows | Fully | Create workflow |
| GET | /api/v1/remediation-workflows/:id | Fully | Get workflow |
| POST | /api/v1/remediation-workflows/:id/steps/:step/complete | Fully | Complete step |
| PUT | /api/v1/remediation-workflows/:id/cancel | Fully | Cancel workflow |
| GET | /api/v1/feedback/aggregation | Fully | Feedback aggregation |
| GET | /api/v1/admin/feedback-types | Fully | List feedback types |
| POST | /api/v1/admin/feedback-types | Fully | Create feedback type |
| GET | /api/v1/admin/feedback-types/:id | Fully | Get feedback type |
| PUT | /api/v1/admin/feedback-types/:id | Fully | Update feedback type |
| DELETE | /api/v1/admin/feedback-types/:id | Fully | Delete feedback type |
| GET | /api/v1/admin/feedback-config | Fully | Global feedback config |
| PUT | /api/v1/admin/feedback-config | Fully | Update feedback config |
| GET | /api/v1/admin/tenants | Fully | List tenants |
| POST | /api/v1/admin/tenants | Fully | Create tenant |
| GET | /api/v1/admin/tenants/:id | Fully | Get tenant |
| PUT | /api/v1/admin/tenants/:id | Fully | Update tenant |
| GET | /api/v1/admin/tenant-templates | Fully | List templates |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |
| GET | /metrics | Fully | Service-relative; not used as client path |

---

## 4. Risk Analytics

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/risk/evaluations/:evaluationId | Fully | Get evaluation |
| GET | /api/v1/risk/opportunities/:opportunityId/latest-evaluation | Fully | Latest evaluation |
| GET | /api/v1/forecasts/:period/scenarios | Fully | Forecast scenarios |
| GET | /api/v1/opportunities/:opportunityId/risk-explainability | Fully | Top drivers |
| GET | /api/v1/opportunities/:opportunityId/risk-snapshots | Fully | Risk snapshots |
| GET | /api/v1/opportunities/:opportunityId/win-probability | Fully | Win probability |
| GET | /api/v1/opportunities/:opportunityId/win-probability/explain | Fully | Explainability |
| GET | /api/v1/opportunities/:opportunityId/win-probability/trend | Fully | Win probability trend |
| GET | /api/v1/opportunities/:opportunityId/risk-predictions | Fully | Risk predictions |
| POST | /api/v1/opportunities/:opportunityId/risk-predictions/generate | Fully | Generate predictions |
| GET | /api/v1/opportunities/:opportunityId/risk-velocity | Fully | Risk velocity |
| GET | /api/v1/opportunities/:opportunityId/stakeholder-graph | Fully | Stakeholder graph |
| GET | /api/v1/opportunities/:opportunityId/anomalies | Fully | Anomalies |
| POST | /api/v1/opportunities/:opportunityId/anomalies/detect | Fully | Detect anomalies |
| GET | /api/v1/opportunities/:opportunityId/sentiment-trends | Fully | Sentiment trends |
| POST | /api/v1/opportunities/:opportunityId/product-fit/evaluate | Fully | Product fit evaluate |
| GET | /api/v1/opportunities/:opportunityId/product-fit | Fully | Product fit |
| GET | /api/v1/opportunities/:opportunityId/leading-indicators | Fully | Leading indicators |
| GET | /api/v1/opportunities/:opportunityId/quick-actions | Fully | Quick actions |
| POST | /api/v1/opportunities/:opportunityId/quick-actions | Fully | Execute quick action |
| GET | /api/v1/opportunities/:opportunityId/similar-won-deals | Fully | Similar won deals |
| GET | /api/v1/opportunities/:opportunityId/benchmark-comparison | Fully | Benchmark comparison |
| GET | /api/v1/industries/:industryId/benchmarks | Fully | Industry benchmarks |
| GET | /api/v1/accounts/:id/health | Fully | Account health |
| GET | /api/v1/risk-propagation/opportunities/:id | Fully | Risk propagation |
| GET | /api/v1/products | Fully | List products |
| POST | /api/v1/products | Fully | Create product |
| GET | /api/v1/products/:id | Fully | Get product |
| PUT | /api/v1/products/:id | Fully | Update product |
| DELETE | /api/v1/products/:id | Fully | Delete product |
| GET | /api/v1/competitors | Fully | List competitors |
| POST | /api/v1/competitors | Fully | Create competitor |
| PUT | /api/v1/competitors/:id | Fully | Update competitor |
| DELETE | /api/v1/competitors/:id | Fully | Delete competitor |
| POST | /api/v1/competitors/:id/track | Fully | Track competitor |
| GET | /api/v1/opportunities/:opportunityId/competitors | Fully | Opportunity competitors |
| GET | /api/v1/opportunities/:opportunityId/win-loss-reasons | Fully | Win-loss reasons |
| PUT | /api/v1/opportunities/:opportunityId/win-loss-reasons | Fully | Record win-loss |
| POST | /api/v1/opportunities/:opportunityId/win-loss-reasons | Fully | Record win-loss |
| GET | /api/v1/competitive-intelligence/dashboard | Fully | Competitive dashboard |
| GET | /api/v1/analytics/competitive-win-loss | Fully | Competitive win-loss |
| GET | /api/v1/risk/evaluations | Fully | Create/list evaluations |
| GET | /api/v1/risk-analysis/opportunities/:opportunityId/revenue-at-risk | Fully | Revenue at risk |
| GET | /api/v1/risk-analysis/portfolio/:userId/revenue-at-risk | Fully | Portfolio revenue at risk |
| GET | /api/v1/risk-analysis/teams/:teamId/revenue-at-risk | Fully | Team revenue at risk |
| GET | /api/v1/risk-analysis/tenant/revenue-at-risk | Fully | Tenant revenue at risk |
| GET | /api/v1/risk-analysis/tenant/prioritized-opportunities | Fully | Prioritized opportunities |
| GET | /api/v1/risk-analysis/tenant/top-at-risk-reasons | Fully | Top at-risk reasons |
| POST | /api/v1/risk-analysis/opportunities/:opportunityId/early-warnings | Fully | Create early warning |
| GET | /api/v1/risk-analysis/opportunities/:opportunityId/early-warnings | Fully | List early warnings |
| POST | /api/v1/risk-analysis/early-warnings/:warningId/acknowledge | Fully | Acknowledge warning |
| GET | /api/v1/risk-catalog/catalog/:tenantId | Fully | Risk catalog by tenant |
| GET | /api/v1/risk-clustering/clusters | Fully | Risk clusters |
| GET | /api/v1/risk-clustering/association-rules | Fully | Association rules |
| POST | /api/v1/risk-clustering/trigger | Fully | Trigger clustering |
| GET | /api/v1/risk-catalog/risks | Fully | List risks |
| POST | /api/v1/risk-catalog/risks | Fully | Create risk |
| GET | /api/v1/risk-catalog/risks/:riskId | Fully | Get risk |
| PUT | /api/v1/risk-catalog/risks/:riskId | Fully | Update risk |
| DELETE | /api/v1/risk-catalog/risks/:riskId | Fully | Delete risk |
| POST | /api/v1/risk-catalog/risks/:riskId/duplicate | Fully | Duplicate risk |
| PUT | /api/v1/risk-catalog/risks/:riskId/enable | Fully | Enable risk |
| PUT | /api/v1/risk-catalog/risks/:riskId/disable | Fully | Disable risk |
| GET | /api/v1/risk-catalog/risks/:riskId/ponderation | Fully | Get ponderation |
| PUT | /api/v1/risk-catalog/risks/:riskId/ponderation | Fully | Set ponderation |
| POST | /api/v1/quotas | Fully | Create quota |
| GET | /api/v1/quotas/:quotaId | Fully | Get quota |
| PUT | /api/v1/quotas/:quotaId | Fully | Update quota |
| POST | /api/v1/quotas/:quotaId/performance | Fully | Record performance |
| POST | /api/v1/simulations/opportunities/:opportunityId/run | Fully | Run simulation |
| POST | /api/v1/simulations/opportunities/:opportunityId/compare | Fully | Compare simulations |
| GET | /api/v1/simulations/opportunities/:opportunityId | Fully | Get simulation |
| GET | /api/v1/benchmarks/win-rates | Fully | Win rates benchmarks |
| GET | /api/v1/benchmarks/closing-times | Fully | Closing times benchmarks |
| GET | /api/v1/benchmarks/deal-sizes | Fully | Deal sizes benchmarks |
| GET | /api/v1/risk/opportunities/:opportunityId/data-quality | Fully | Data quality |
| GET | /api/v1/risk/opportunities/:opportunityId/trust-level | Fully | Trust level |
| POST | /api/v1/risk/evaluations/:evaluationId/validate | Fully | Validate evaluation |
| POST | /api/v1/risk/evaluations/:evaluationId/explainability | Fully | Explainability |
| POST | /api/v1/explain/prediction | Fully | Explain prediction |
| GET | /api/v1/explain/feature-importance/:modelId | Fully | Feature importance |
| GET | /api/v1/explain/factors/:predictionId | Fully | Explain factors |
| POST | /api/v1/explain/batch | Fully | Batch explain |
| POST | /api/v1/decisions/evaluate | Fully | Evaluate decision |
| POST | /api/v1/decisions/apply-catalog-rules | Fully | Apply catalog rules |
| POST | /api/v1/decisions/methodology | Partial | Methodology decision |
| POST | /api/v1/decisions/execute | Fully | Execute decision |
| GET | /api/v1/decisions/templates | Fully | List rule templates |
| GET | /api/v1/decisions/conflicts | Fully | Detect rule conflicts |
| GET | /api/v1/decisions/rules | Fully | List decision rules |
| POST | /api/v1/decisions/rules | Fully | Create rule |
| GET | /api/v1/decisions/rules/:ruleId | Fully | Get rule |
| PUT | /api/v1/decisions/rules/:ruleId | Fully | Update rule |
| DELETE | /api/v1/decisions/rules/:ruleId | Fully | Delete rule |
| POST | /api/v1/decisions/rules/:ruleId/test | Fully | Test rule |
| GET | /api/v1/sales-methodology | Fully | Sales methodology |
| PUT | /api/v1/sales-methodology | Fully | Update methodology |
| GET | /api/v1/sales-methodology/templates | Fully | Methodology templates |
| GET | /api/v1/tenant-ml-config | Fully | Tenant ML config |
| PUT | /api/v1/tenant-ml-config | Fully | Update tenant ML config |
| POST | /api/v1/reactivation/evaluate | Fully | Reactivation evaluation |
| GET | /api/v1/risk/scoring/:scoringId | Fully | Get scoring |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 5. Risk Catalog / Action Catalog

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/action-catalog/entries | Fully | List entries |
| POST | /api/v1/action-catalog/entries | Fully | Create entry |
| GET | /api/v1/action-catalog/entries/:id | Fully | Get entry |
| PUT | /api/v1/action-catalog/entries/:id | Fully | Update entry |
| DELETE | /api/v1/action-catalog/entries/:id | Fully | Delete entry |
| GET | /api/v1/action-catalog/categories | Fully | List categories |
| POST | /api/v1/action-catalog/categories | Fully | Create category |
| GET | /api/v1/action-catalog/categories/:id | Fully | Get category |
| PUT | /api/v1/action-catalog/categories/:id | Fully | Update category |
| DELETE | /api/v1/action-catalog/categories/:id | Fully | Delete category |
| GET | /api/v1/action-catalog/relationships | Fully | List relationships |
| POST | /api/v1/action-catalog/relationships | Fully | Create relationship |
| GET | /api/v1/action-catalog/relationships/:id | Fully | Get relationship |
| PUT | /api/v1/action-catalog/relationships/:id | Fully | Update relationship |
| DELETE | /api/v1/action-catalog/relationships/:id | Fully | Delete relationship |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 6. Shard Manager

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/shards | Fully | List shards |
| POST | /api/v1/shards | Fully | Create shard |
| GET | /api/v1/shards/:id | Fully | Get shard |
| PUT | /api/v1/shards/:id | Fully | Update shard |
| DELETE | /api/v1/shards/:id | Fully | Delete shard |
| POST | /api/v1/shard-types | Fully | Create shard type |
| GET | /api/v1/shard-types | Fully | List shard types |
| GET | /api/v1/shard-types/:id | Fully | Get shard type |
| PUT | /api/v1/shard-types/:id | Fully | Update shard type |
| DELETE | /api/v1/shard-types/:id | Fully | Delete shard type |
| POST | /api/v1/relationships | Fully | Create relationship |
| GET | /api/v1/shards/:id/relationships | Fully | Get relationships |
| GET | /api/v1/shards/:id/related | Fully | Get related shards |
| GET | /api/v1/shards/:id/relationships/summary | Fully | Relationships summary |
| PUT | /api/v1/relationships/:id | Fully | Update relationship |
| DELETE | /api/v1/relationships/:id | Fully | Delete relationship |
| POST | /api/v1/relationships/traverse | Fully | Traverse relationships |
| GET | /api/v1/relationships/path | Fully | Get path |
| POST | /api/v1/relationships/bulk | Fully | Bulk relationships |
| POST | /api/v1/relationships/query | Fully | Query relationships |
| POST | /api/v1/links | Fully | Create link |
| GET | /api/v1/shards/:id/links | Fully | Get links |
| GET | /api/v1/links/:id | Fully | Get link |
| PUT | /api/v1/links/:id | Fully | Update link |
| DELETE | /api/v1/links/:id | Fully | Delete link |
| POST | /api/v1/links/bulk | Fully | Bulk links |
| POST | /api/v1/acl/check | Fully | ACL check |
| POST | /api/v1/acl/batch-check | Fully | ACL batch check |
| POST | /api/v1/acl/grant | Fully | ACL grant |
| POST | /api/v1/acl/revoke | Fully | ACL revoke |
| PUT | /api/v1/acl/update | Fully | ACL update |
| GET | /api/v1/acl/permissions/:shardId | Fully | ACL permissions |
| GET | /api/v1/acl/stats | Fully | ACL stats |
| GET | /api/v1/admin/shard-types | Fully | List admin shard types |
| GET | /api/v1/admin/shard-types/:id | Fully | Get admin shard type |
| POST | /api/v1/admin/shard-types | Fully | Create admin shard type |
| PUT | /api/v1/admin/shard-types/:id | Fully | Update admin shard type |
| POST | /api/v1/admin/shard-types/:id/validate | Fully | Validate shard type |
| GET | /api/v1/admin/shard-types/:id/stats | Fully | Shard type stats |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 7. Logging

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/logs | Fully | List/query logs |
| POST | /api/v1/logs | Fully | Ingest logs |
| POST | /api/v1/logs/batch | Fully | Batch ingest |
| GET | /api/v1/logs/:id | Fully | Get log |
| GET | /api/v1/logs/my-activity | Fully | My activity |
| GET | /api/v1/search | Fully | Search logs |
| GET | /api/v1/logs/aggregate | Fully | Aggregate |
| GET | /api/v1/logs/stats | Fully | Stats |
| GET | /api/v1/export | Fully | Export |
| POST | /api/v1/export | Fully | Trigger export |
| GET | /api/v1/export/:id | Fully | Export status |
| GET | /api/v1/export/:id/download | Fully | Download export |
| GET | /api/v1/policies | Partial | Retention policies |
| POST | /api/v1/policies | Partial | Create policy |
| GET | /api/v1/policies/:id | Partial | Get policy |
| PUT | /api/v1/policies/:id | Partial | Update policy |
| DELETE | /api/v1/policies/:id | Partial | Delete policy |
| GET | /api/v1/configuration | Partial | Config |
| GET | /api/v1/alerts | Partial | Alerts |
| POST | /api/v1/alerts | Partial | Create alert |
| GET | /api/v1/alerts/:id | Partial | Get alert |
| PUT | /api/v1/alerts/:id | Partial | Update alert |
| DELETE | /api/v1/alerts/:id | Partial | Delete alert |
| POST | /api/v1/alerts/:id/evaluate | Partial | Evaluate alert |
| POST | /api/v1/verification/verify | Partial | Verify chain |
| POST | /api/v1/verification/checkpoint | Partial | Create checkpoint |
| GET | /api/v1/verification/checkpoints | Partial | List checkpoints |
| POST | /api/v1/verification/checkpoint/:id/verify | Partial | Verify checkpoint |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |
| GET | /metrics | Fully | Service-relative; not used as client path |

---

## 8. Integration Processors

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/entity-linking/settings | Fully | Entity linking settings |
| PUT | /api/v1/entity-linking/settings | Fully | Update settings |
| GET | /api/v1/entity-linking/rules | Fully | List rules |
| PUT | /api/v1/entity-linking/rules | Fully | Update rules |
| GET | /api/v1/entity-linking/suggested-links | Fully | Suggested links |
| POST | /api/v1/entity-linking/suggested-links/:id/approve | Fully | Approve link |
| POST | /api/v1/entity-linking/suggested-links/:id/reject | Fully | Reject link |
| POST | /api/v1/entity-linking/suggested-links/approve-all | Fully | Approve all |
| GET | /api/v1/processing/settings | Fully | Processing settings |
| PUT | /api/v1/processing/settings | Fully | Update processing settings |
| GET | /api/v1/admin/monitoring/health | Fully | Health |
| GET | /api/v1/admin/monitoring/queues | Fully | Queues |
| GET | /api/v1/admin/monitoring/dlq | Fully | DLQ |
| GET | /api/v1/admin/monitoring/processors | Fully | Processors |
| GET | /api/v1/admin/monitoring/integrations | Partial | Integrations |
| GET | /api/v1/admin/monitoring/errors | Partial | Errors |
| GET | /api/v1/admin/monitoring/performance | Partial | Performance |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |
| GET | /metrics | Fully | Service-relative; not used as client path |

---

## 9. Integration Manager (Exhaustive)

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/integrations/providers | Fully | List providers |
| GET | /api/v1/integrations/providers/:category/:id | Fully | Get provider |
| GET | /api/v1/integrations | Fully | List integrations |
| POST | /api/v1/integrations | Fully | Create integration |
| GET | /api/v1/integrations/:id | Fully | Get integration |
| PUT | /api/v1/integrations/:id | Fully | Update integration |
| DELETE | /api/v1/integrations/:id | Fully | Delete integration |
| GET | /api/v1/integrations/available | Fully | Available types |
| GET | /api/v1/integrations/oauth-url/:integrationType | Fully | OAuth URL |
| POST | /api/v1/integrations/connect | Fully | Connect OAuth |
| POST | /api/v1/integrations/connect-api-key | Fully | Connect API key |
| POST | /api/v1/integrations/connect-service-account | Fully | Connect service account |
| GET | /api/v1/integrations/:id/sync-config | Fully | Get sync config |
| PUT | /api/v1/integrations/:id/sync-config | Fully | Update sync config |
| POST | /api/v1/integrations/:integrationId/fetch | Fully | Fetch records |
| POST | /api/v1/integrations/:id/sync | Fully | Trigger sync |
| GET | /api/v1/integrations/:id/field-mappings/:entityType | Fully | Get field mappings |
| PUT | /api/v1/integrations/:id/field-mappings/:entityType | Fully | Update field mappings |
| GET | /api/v1/integrations/:id/external-fields/:entityType | Fully | External fields |
| GET | /api/v1/integrations/:id/internal-fields/:entityType | Fully | Internal fields |
| GET | /api/v1/integrations/transform-functions | Fully | Transform functions |
| POST | /api/v1/integrations/:id/field-mappings/:entityType/test | Fully | Test mappings |
| GET | /api/v1/integrations/:id/field-mappings/:entityType/export | Fully | Export mappings |
| POST | /api/v1/integrations/:id/field-mappings/:entityType/import | Fully | Import mappings |
| GET | /api/v1/integrations/:id/sync-history | Fully | Sync history |
| POST | /api/v1/integrations/:id/test | Fully | Test integration |
| GET | /api/v1/integrations/:id/health | Fully | Health check |
| GET | /api/v1/integrations/:id/sync-history/:syncId | Fully | Sync history detail |
| GET | /api/v1/integrations/:id/errors | Fully | Errors |
| GET | /api/v1/integrations/:id/data-quality | Fully | Data quality |
| GET | /api/v1/integrations/:id/performance | Fully | Performance |
| POST | /api/v1/webhooks | Fully | Create webhook |
| GET | /api/v1/webhooks/:id | Fully | Get webhook |
| PUT | /api/v1/webhooks/:id | Fully | Update webhook |
| DELETE | /api/v1/webhooks/:id | Fully | Delete webhook |
| GET | /api/v1/webhooks | Fully | List webhooks |
| POST | /api/v1/sync-tasks | Fully | Create sync task |
| GET | /api/v1/sync-tasks/:id | Fully | Get sync task |
| GET | /api/v1/sync-tasks | Fully | List sync tasks |
| POST | /api/v1/sync-tasks/:id/cancel | Fully | Cancel sync task |
| GET | /api/v1/sync/tasks/:taskId | Fully | Get sync task (alt) |
| POST | /api/v1/sync/trigger | Fully | Trigger sync |
| POST | /api/v1/content/generate | Fully | Generate content |
| POST | /api/v1/content/jobs | Fully | Create content job |
| GET | /api/v1/content/jobs/:id | Fully | Get content job |
| POST | /api/v1/content/jobs/:id/cancel | Fully | Cancel content job |
| GET | /api/v1/content/jobs | Fully | List content jobs |
| POST | /api/v1/content/templates | Fully | Create content template |
| GET | /api/v1/content/templates/:id | Fully | Get content template |
| PUT | /api/v1/content/templates/:id | Fully | Update content template |
| DELETE | /api/v1/content/templates/:id | Fully | Delete content template |
| GET | /api/v1/content/templates | Fully | List content templates |
| POST | /api/v1/templates | Fully | Create template |
| GET | /api/v1/templates/:id | Fully | Get template |
| PUT | /api/v1/templates/:id | Fully | Update template |
| DELETE | /api/v1/templates/:id | Fully | Delete template |
| GET | /api/v1/templates | Fully | List templates |
| POST | /api/v1/templates/:id/render | Fully | Render template |
| GET | /api/v1/templates/:id/versions | Fully | Template versions |
| GET | /api/v1/admin/integrations/catalog | Fully | List catalog |
| GET | /api/v1/admin/integrations/catalog/:id | Fully | Get catalog entry |
| POST | /api/v1/admin/integrations/catalog | Fully | Create catalog entry |
| PUT | /api/v1/admin/integrations/catalog/:id | Fully | Update catalog entry |
| DELETE | /api/v1/admin/integrations/catalog/:id | Fully | Delete catalog entry |
| GET | /api/v1/super-admin/integration-catalog | Fully | Legacy list catalog |
| GET | /api/v1/super-admin/integration-catalog/:integrationId | Fully | Legacy get catalog |
| PUT | /api/v1/super-admin/integration-catalog/:integrationId | Fully | Legacy update catalog |
| DELETE | /api/v1/super-admin/integration-catalog/:integrationId | Fully | Legacy delete catalog |
| POST | /api/v1/super-admin/integration-catalog/:integrationId/deprecate | Fully | Deprecate catalog |
| GET | /api/v1/super-admin/integration-catalog/category/:category | Fully | Catalog by category |
| POST | /api/v1/super-admin/integration-catalog/visibility-rules | Fully | Visibility rules |
| POST | /api/v1/super-admin/integration-catalog/approve | Fully | Approve integration |
| POST | /api/v1/super-admin/integration-catalog/deny | Fully | Deny integration |
| POST | /api/v1/integrations/:integrationId/oauth/start | Fully | OAuth start |
| GET | /api/v1/integrations/oauth/callback | Fully | OAuth callback |
| POST | /api/v1/integrations/:integrationId/connections/api-key | Fully | API key connection |
| POST | /api/v1/integrations/:integrationId/connections/basic-auth | Fully | Basic auth connection |
| POST | /api/v1/integrations/:integrationId/connections/service-account | Fully | Service account connection |
| GET | /api/v1/integrations/:integrationId/connections/:connectionId | Fully | Get connection |
| POST | /api/v1/integrations/:integrationId/connections/test | Fully | Test connection |
| POST | /api/v1/integrations/:integrationId/connections/:connectionId/refresh | Fully | Refresh connection |
| DELETE | /api/v1/integrations/:integrationId/connections/:connectionId | Fully | Delete connection |
| POST | /api/v1/integrations/adapters/get | Fully | Get adapter |
| POST | /api/v1/integrations/adapters/test | Fully | Test adapter |
| GET | /api/v1/integrations/adapters/registry/stats | Fully | Adapter stats |
| POST | /api/v1/integrations/adapters/cache/clear | Fully | Clear adapter cache |
| DELETE | /api/v1/integrations/adapters/cache | Fully | Delete adapter cache |
| POST | /api/v1/integrations/sync/conflicts/detect | Fully | Detect conflicts |
| POST | /api/v1/integrations/sync/conflicts/resolve | Fully | Resolve conflict |
| GET | /api/v1/integrations/sync/conflicts/:conflictId | Fully | Get conflict |
| GET | /api/v1/integrations/sync/conflicts/pending | Fully | Pending conflicts |
| POST | /api/v1/integrations/sync/conflicts/:conflictId/ignore | Fully | Ignore conflict |
| GET | /api/v1/integrations/sync/conflicts/stats | Fully | Conflict stats |
| GET | /api/v1/admin/settings | Fully | Get system settings |
| PUT | /api/v1/admin/settings | Fully | Update system settings |
| GET | /api/v1/admin/settings/rate-limits | Fully | Get rate limits |
| PUT | /api/v1/admin/settings/rate-limits | Fully | Update rate limits |
| GET | /api/v1/admin/settings/capacity | Fully | Get capacity |
| PUT | /api/v1/admin/settings/capacity | Fully | Update capacity |
| GET | /api/v1/admin/settings/feature-flags | Fully | Get feature flags |
| PUT | /api/v1/admin/settings/feature-flags | Fully | Update feature flags |
| PATCH | /api/v1/admin/settings/feature-flags/:flagName | Fully | Toggle feature flag |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 10. Configuration Service

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/system/analytics | Fully | Analytics config |
| PUT | /api/v1/system/analytics | Fully | Update analytics |
| GET | /api/v1/system/api-security | Fully | API security config |
| PUT | /api/v1/system/api-security | Fully | Update API security |
| GET | /api/v1/system/datalake | Fully | Data lake config |
| PUT | /api/v1/system/datalake | Fully | Update data lake |
| GET | /api/v1/system/logging | Fully | Logging config |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 11. ML Service

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/ml/models | Fully | List models |
| POST | /api/v1/ml/models | Fully | Create model |
| GET | /api/v1/ml/models/:id | Fully | Get model |
| PUT | /api/v1/ml/models/:id | Fully | Update model |
| DELETE | /api/v1/ml/models/:id | Fully | Delete model |
| GET | /api/v1/ml/models/health | Fully | Models health |
| GET | /api/v1/ml/endpoints | Partial | List endpoints |
| GET | /api/v1/ml/endpoints/:id | Partial | Get endpoint |
| GET | /api/v1/ml/monitoring/alerts | Stub | Monitoring alerts |
| POST | /api/v1/ml/monitoring/alerts | Stub | Create alert |
| PUT | /api/v1/ml/monitoring/alerts/:id | Stub | Update alert |
| DELETE | /api/v1/ml/monitoring/alerts/:id | Stub | Delete alert |
| GET | /api/v1/ml/features | Fully | List features |
| POST | /api/v1/ml/features | Fully | Create feature |
| GET | /api/v1/ml/features/:id | Fully | Get feature |
| PUT | /api/v1/ml/features/:id | Fully | Update feature |
| DELETE | /api/v1/ml/features/:id | Fully | Delete feature |
| GET | /api/v1/ml/features/schema | Fully | Feature schema |
| GET | /api/v1/ml/features/quality | Stub | Quality rules |
| PUT | /api/v1/ml/features/quality | Stub | Quality rules |
| GET | /api/v1/ml/features/versions | Stub | Versioning |
| GET | /api/v1/ml/features/quality-rules | Stub | Quality rules |
| PUT | /api/v1/ml/features/version-policy | Stub | Version policy |
| POST | /api/v1/ml/forecast/predict | Fully | Internal |
| POST | /api/v1/ml/forecast/period | Fully | Internal |
| POST | /api/v1/ml/risk-scoring/predict | Fully | Internal |
| POST | /api/v1/ml/win-probability/predict | Fully | Internal |
| POST | /api/v1/ml/win-probability/explain | Fully | Internal |
| GET | /api/v1/ml/features/methodology | Fully | Internal |
| GET | /api/v1/ml/features/reactivation | Fully | Internal |
| POST | /api/v1/ml/features/build | Fully | Internal |
| GET | /api/v1/ml/win-probability/:opportunityId/trend | Fully | Internal |
| POST | /api/v1/ml/anomaly/predict | Fully | Internal |
| POST | /api/v1/ml/risk-trajectory/predict | Fully | Internal |
| POST | /api/v1/ml/evaluation | Fully | Internal |
| GET | /api/v1/ml/evaluation/drift/:modelId | Fully | Internal |
| GET | /api/v1/ml/learning/suggestions/:modelId | Fully | Internal |
| POST | /api/v1/ml/model-monitoring/run | Fully | Internal |
| GET | /api/v1/ml/models/:id/card | Fully | Internal |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |
| GET | /metrics | Fully | Service-relative; not used as client path |

---

## 12. Adaptive Learning

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/adaptive-learning/weights/:tenantId | Fully | CAIS weights |
| PUT | /api/v1/adaptive-learning/weights/:tenantId | Fully | Update weights |
| GET | /api/v1/adaptive-learning/model-selection/:tenantId | Fully | Model selection |
| PUT | /api/v1/adaptive-learning/model-selection/:tenantId | Fully | Update model selection |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 13. AI Conversation

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/conversations | Fully | List conversations |
| POST | /api/v1/conversations | Fully | Create conversation |
| GET | /api/v1/conversations/:id | Fully | Get conversation |
| GET | /api/v1/conversations/:conversationId/messages | Fully | List messages |
| POST | /api/v1/conversations/:conversationId/messages | Fully | Send message |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 14. Multi-Modal Service

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/multimodal/jobs | Fully | List jobs |
| POST | /api/v1/multimodal/jobs | Fully | Create job |
| GET | /api/v1/multimodal/jobs/:id | Fully | Get job status |
| POST | /api/v1/multimodal/jobs/:id/cancel | Fully | Cancel job |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 15. Dashboard

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/dashboards | Fully | List dashboards |
| POST | /api/v1/dashboards | Fully | Create dashboard |
| GET | /api/v1/dashboards/:id | Fully | Get dashboard |
| PUT | /api/v1/dashboards/:id | Fully | Update dashboard |
| DELETE | /api/v1/dashboards/:id | Fully | Delete dashboard |
| GET | /api/v1/dashboards/manager/prioritized | Fully | Prioritized dashboards |
| GET | /health | Fully | Liveness |
| GET | /ready | Fully | Readiness |

---

## 16. Secret Management — Client path: `/api/v1/secrets`, `/api/v1/vaults`

Note: Gateway may use pathRewrite so backend receives `/api/secrets`, `/api/vaults` if the service keeps that prefix. Service `/health` and `/ready` are service-relative; not client paths.

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| POST | /api/v1/secrets | Fully | Create secret |
| GET | /api/v1/secrets | Fully | List secrets |
| GET | /api/v1/secrets/:id | Fully | Get secret |
| GET | /api/v1/secrets/:id/value | Fully | Get secret value |
| PUT | /api/v1/secrets/:id | Fully | Update secret |
| PUT | /api/v1/secrets/:id/value | Fully | Update value |
| DELETE | /api/v1/secrets/:id | Fully | Delete secret |
| POST | /api/v1/secrets/:id/restore | Fully | Restore secret |
| DELETE | /api/v1/secrets/:id/permanent | Fully | Permanent delete |
| POST | /api/v1/secrets/:id/rotate | Fully | Rotate secret |
| GET | /api/v1/secrets/:id/versions | Fully | List versions |
| GET | /api/v1/secrets/:id/versions/:version | Fully | Get version |
| POST | /api/v1/secrets/:id/rollback | Fully | Rollback |
| GET | /api/v1/secrets/:id/access | Fully | Get access |
| POST | /api/v1/secrets/:id/access | Fully | Grant access |
| DELETE | /api/v1/secrets/:id/access/:grantId | Fully | Revoke access |
| POST | /api/v1/secrets/resolve | Fully | Resolve secret |
| POST | /api/v1/secrets/resolve/config | Fully | Resolve config |
| POST | /api/v1/secrets/sso | Fully | SSO create |
| GET | /api/v1/secrets/sso/:secretId | Fully | SSO get |
| PUT | /api/v1/secrets/sso/:secretId | Fully | SSO update |
| DELETE | /api/v1/secrets/sso/:secretId | Fully | SSO delete |
| POST | /api/v1/secrets/sso/:secretId/rotate | Fully | SSO rotate |
| GET | /api/v1/secrets/sso/:secretId/expiration | Fully | SSO expiration |
| GET | /api/v1/secrets/audit | Fully | Audit list |
| GET | /api/v1/secrets/audit/:id | Fully | Audit get |
| GET | /api/v1/secrets/audit/compliance/report | Fully | Compliance report |
| POST | /api/v1/secrets/import/env | Fully | Import env |
| POST | /api/v1/secrets/import/json | Fully | Import JSON |
| GET | /api/v1/secrets/export | Fully | Export |
| POST | /api/v1/secrets/migrate | Fully | Migrate |
| GET | /api/v1/vaults | Fully | List vaults |
| POST | /api/v1/vaults | Fully | Create vault |
| GET | /api/v1/vaults/:id | Fully | Get vault |
| PUT | /api/v1/vaults/:id | Fully | Update vault |
| DELETE | /api/v1/vaults/:id | Fully | Delete vault |
| POST | /api/v1/vaults/:id/health | Fully | Vault health |
| POST | /api/v1/vaults/:id/default | Fully | Set default vault |

---

## 17. Notification Manager — Client path: `/api/v1/notifications`, `/api/v1/preferences`, `/api/v1/templates`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | /api/v1/notifications | Fully | List notifications |
| PUT | /api/v1/notifications/:id/read | Fully | Mark read |
| PUT | /api/v1/notifications/read-all | Fully | Mark all read |
| DELETE | /api/v1/notifications/:id | Fully | Delete notification |
| GET | /api/v1/preferences | Fully | Get preferences |
| GET | /api/v1/preferences/:scope/:scopeId | Fully | Get scope preferences |
| PUT | /api/v1/preferences/:scope/:scopeId | Fully | Update preferences |
| DELETE | /api/v1/preferences/:scope/:scopeId | Fully | Delete preferences |
| GET | /api/v1/preferences/list/all | Fully | List all preferences |
| GET | /api/v1/templates | Fully | List templates |
| GET | /api/v1/templates/:id | Fully | Get template |
| POST | /api/v1/templates | Fully | Create template |
| PUT | /api/v1/templates/:id | Fully | Update template |
| DELETE | /api/v1/templates/:id | Fully | Delete template |

---

## 18. Services Not in Gateway (Internal / Missing Gateway Route)

| Service | Method | Path | Status | Notes |
|---------|--------|------|--------|-------|
| reasoning-engine | POST | /reasoning/reason | Fully | /api/v1/reasoning when reasoning_engine.url set |
| reasoning-engine | GET | /reasoning/tasks | Fully | /api/v1/reasoning when configured |
| reasoning-engine | GET | /reasoning/tasks/:id | Fully | /api/v1/reasoning when configured |
| reasoning-engine | POST | /reasoning/tasks/:id/cancel | Fully | /api/v1/reasoning when configured |
| validation-engine | * | /validation/rules | Fully | /api/v1/validation when validation_engine.url set |
| validation-engine | * | /validation/rules/:id | Fully | /api/v1/validation when configured |
| validation-engine | * | /validation/runs | Fully | /api/v1/validation when configured |
| validation-engine | * | /validation/runs/:id | Fully | /api/v1/validation when configured |
| validation-engine | POST | /validation/run | Fully | Execute validation; /api/v1/validation when configured |
| workflow-orchestrator | GET | /hitl/approvals/:id | Fully | /api/v1/hitl when workflow_orchestrator.url set |
| workflow-orchestrator | POST | /hitl/approvals/:id/approve | Fully | /api/v1/hitl when configured |
| workflow-orchestrator | POST | /hitl/approvals/:id/reject | Fully | /api/v1/hitl when configured |
| workflow-orchestrator | GET | /workflows | Fully | /api/v1/workflows?opportunityId= when configured |
| workflow-orchestrator | GET | /workflows/:workflowId | Fully | /api/v1/workflows when configured |
| workflow-orchestrator | POST | /workflows/:workflowId/retry | Fully | /api/v1/workflows when configured |
| forecasting | GET | /forecasts | Fully | /api/v1/forecasts when forecasting.url set |
| forecasting | POST | /forecasts | Fully | /api/v1/forecasts when configured |
| forecasting | GET | /forecasts/:period/scenarios | Fully | /api/v1/forecasts when configured |
| forecasting | GET | /forecasts/:period/risk-adjusted | Fully | /api/v1/forecasts when configured |
| forecasting | GET | /forecasts/:period/ml | Fully | /api/v1/forecasts when configured |
| forecasting | GET | /forecasts/:forecastId | Fully | /api/v1/forecasts when configured |
| forecasting | POST | /forecasts/team | Fully | /api/v1/forecasts when configured |
| forecasting | GET | /forecasts/tenant | Fully | /api/v1/forecasts when configured |
| forecasting | POST | /accuracy/actuals | Fully | /api/v1/accuracy when configured |
| forecasting | GET | /accuracy/metrics | Fully | /api/v1/accuracy when configured |
| web-search | POST | /web-search | Partial | /api/v1/web-search when configured |
| security-scanning | POST | /security/scans | Fully | /api/v1/security when security_scanning.url set |
| security-scanning | GET | /security/scans/:scanId | Fully | /api/v1/security when configured |
| security-scanning | POST | /security/pii/detect | Fully | /api/v1/security when configured |
| security-scanning | POST | /security/pii/redact | Fully | /api/v1/security when configured |
| security-scanning | GET | /security/pii/detections/:detectionId | Fully | /api/v1/security when configured |
| quality-monitoring | GET | /quality/metrics | Fully | /api/v1/quality when quality_monitoring.url set |
| quality-monitoring | POST | /quality/metrics | Fully | /api/v1/quality when configured |
| quality-monitoring | GET | /quality/anomalies | Fully | /api/v1/quality when configured |
| quality-monitoring | POST | /quality/anomalies/detect | Fully | /api/v1/quality when configured |
| pattern-recognition | GET | /patterns | Fully | /api/v1/patterns when pattern_recognition.url set |
| pattern-recognition | POST | /patterns | Fully | /api/v1/patterns when configured |
| pattern-recognition | GET/PUT/DELETE | /patterns/:id | Fully | /api/v1/patterns when configured |
| pattern-recognition | POST | /patterns/scan | Fully | Run scan; /api/v1/patterns when configured |
| pattern-recognition | GET | /patterns/scans | Fully | /api/v1/patterns when configured |
| pattern-recognition | GET | /patterns/scans/:id | Fully | /api/v1/patterns when configured |
| pattern-recognition | GET | /patterns/scans/:id/matches | Fully | /api/v1/patterns when configured |
| integration-sync | GET | /sync/tasks/:taskId | Fully | Merged into integration_manager; /api/v1/sync when configured |
| integration-sync | POST | /sync/trigger | Fully | Merged into integration_manager; /api/v1/sync when configured |
| integration-sync | POST | /sync/conflicts/resolve | Fully | integration_manager: /api/v1/integrations/sync/conflicts/resolve |
| integration-sync | * | /webhooks | Fully | Merged into integration_manager; /api/v1/webhooks when configured |
| integration-sync | * | /webhooks/:webhookId | Fully | Merged into integration_manager; /api/v1/webhooks when configured |
| data-enrichment | GET | /enrichment/jobs/:jobId | Fully | /api/v1/enrichment when data_enrichment.url set |
| data-enrichment | POST | /enrichment/trigger | Fully | /api/v1/enrichment when configured |
| data-enrichment | POST | /enrichment/enrich | Fully | /api/v1/enrichment when configured |
| llm-service | POST | /llm/explain | Fully | /api/v1/llm when llm_service.url set |
| llm-service | POST | /llm/recommendations | Fully | /api/v1/llm when configured |
| llm-service | POST | /llm/scenarios | Fully | /api/v1/llm when configured |
| llm-service | POST | /llm/summary | Fully | /api/v1/llm when configured |
| llm-service | POST | /llm/playbook | Fully | /api/v1/llm when configured |
| llm-service | POST | /llm/reactivation/strategy | Fully | /api/v1/llm when configured |
| learning-service | POST | /feedback | Fully | /api/v1/learning when learning_service.url set |
| learning-service | POST | /outcomes | Fully | /api/v1/learning when configured |
| learning-service | GET | /feedback/summary/:modelId | Fully | /api/v1/learning when configured |
| learning-service | PUT | /feedback/:feedbackId/link-prediction | Fully | /api/v1/learning when configured |
| learning-service | GET | /feedback/trends/:modelId | Fully | /api/v1/learning when configured |
| context-service | GET, POST | /context/contexts, /context/contexts/:id, /context/contexts/path/:path | Fully | /api/v1/contexts when context_service.url set |
| context-service | POST | /context/assemble | Fully | /api/v1/contexts when configured |
| context-service | POST | /context/dependencies/tree | Fully | /api/v1/contexts when configured |
| context-service | POST | /context/call-graphs | Fully | /api/v1/contexts when configured |
| ai-service | POST | /api/v1/ai/completions | Fully | When ai_service.url set; backend may use stripPrefix |
| ai-service | GET | /api/v1/ai/models | Fully | When configured |
| ai-service | GET | /api/v1/ai/models/:id | Fully | When configured |
| ai-service | GET | /api/v1/ai/agents | Fully | When configured |
| ai-service | GET | /api/v1/ai/agents/:id | Fully | When configured |
| ai-service | POST | /api/v1/ai/agents/:id/execute | Fully | When configured |
| embeddings | POST | /api/v1/embeddings | Fully | When embeddings.url set; backend may use stripPrefix |
| embeddings | POST | /api/v1/embeddings/batch | Fully | When configured |
| embeddings | GET | /api/v1/embeddings/:id | Fully | When configured |
| embeddings | POST | /api/v1/embeddings/search | Fully | When configured |
| embeddings | DELETE | /api/v1/embeddings/:id | Fully | When configured |
| embeddings | DELETE | /api/v1/embeddings/project/:projectId | Fully | When configured |
| prompt-service | * | /prompts/analytics | Partial | /api/v1/prompts when configured |
| utility-services | GET | /api/v1/utility/jobs/:jobId | Fully | /api/v1/utility when utility_services.url set |
| utility-services | POST | /api/v1/utility/import | Fully | /api/v1/utility when configured |
| utility-services | POST | /api/v1/utility/export | Fully | /api/v1/utility when configured |
| ai-analytics | GET | /api/v1/ai-analytics/models | Fully | /api/v1/ai-analytics when ai_analytics.url set |
| signal-intelligence | POST | /api/v1/signals/analyze | Fully | /api/v1/signals when signal_intelligence.url set |

---

## Summary Counts

| Status | Count |
|--------|-------|
| Fully | 603 |
| Partial | 29 |
| Stub | 11 |
| Missing | 0 |

---

## References

- [API_RULES.md](./API_RULES.md) — Path convention: client path = gateway path = `/api/v1/...` (Gateway, UI, ENDPOINTS.md)
- [containers/api-gateway/src/routes/index.ts](../../containers/api-gateway/src/routes/index.ts) — Gateway route table
- [documentation/FEATURE_IMPLEMENTATION_STATUS.md](../FEATURE_IMPLEMENTATION_STATUS.md) — Feature status
- [.cursor/commands/endpoints.md](../../.cursor/commands/endpoints.md) — Auth flow audit
