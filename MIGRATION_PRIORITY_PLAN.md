# Service Migration Priority Plan

**Purpose:** Prioritized list of services to migrate from `old_code/` to `containers/` based on dependencies and business value.

**Last Updated:** 2026-01-23

---

## Migration Status Overview

- ✅ **Migrated:** 38 services
- ⚠️ **Remaining:** ~208 services
- 📊 **Progress:** ~15% complete

---

## Priority Tiers

### Tier 1: Foundation Services ✅ COMPLETE
**Status:** All foundation services are migrated

These services are required for other services to function:

- ✅ auth
- ✅ user-management
- ✅ logging
- ✅ secret-management
- ✅ api-gateway
- ✅ shared (utilities)

---

### Tier 2: Data & Core Services
**Priority:** HIGH - Migrate next
**Dependencies:** Tier 1 only

#### 2.1 Already Migrated ✅
- ✅ shard-manager
- ✅ document-manager
- ✅ cache-service
- ✅ embeddings
- ✅ search-service

#### 2.2 Need Migration (Priority Order)

1. **enrichment** ⚠️ HIGH PRIORITY
   - **Why:** Core data processing service, used by many AI services
   - **Dependencies:** shard-manager, embeddings
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/enrichment.service.ts`
   - **Estimated Effort:** 2-3 days

2. **vectorization** ⚠️ HIGH PRIORITY
   - **Why:** Required for embeddings and search
   - **Dependencies:** embeddings, ai-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/vectorization.service.ts`
   - **Estimated Effort:** 2 days

3. **shard-embedding** ⚠️ HIGH PRIORITY
   - **Why:** Links shards to embeddings
   - **Dependencies:** shard-manager, embeddings
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/shard-embedding.service.ts`
   - **Estimated Effort:** 1-2 days

4. **shard-relationship** ⚠️ MEDIUM PRIORITY
   - **Why:** Graph relationships between shards
   - **Dependencies:** shard-manager
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/shard-relationship.service.ts`
   - **Estimated Effort:** 2 days

5. **shard-linking** ⚠️ MEDIUM PRIORITY
   - **Why:** Links shards together
   - **Dependencies:** shard-manager
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/shard-linking.service.ts`
   - **Estimated Effort:** 1 day

6. **acl** ⚠️ MEDIUM PRIORITY
   - **Why:** Access control for shards
   - **Dependencies:** shard-manager, user-management
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/acl.service.ts`
   - **Estimated Effort:** 2 days

7. **acl-cache** ⚠️ LOW PRIORITY
   - **Why:** Caching layer for ACL
   - **Dependencies:** acl, cache-service
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/acl-cache.service.ts`
   - **Estimated Effort:** 1 day

---

### Tier 3: AI & Intelligence Services
**Priority:** HIGH - Core product features
**Dependencies:** Tier 1, Tier 2

#### 3.1 Already Migrated ✅
- ✅ ai-service
- ✅ ai-insights
- ✅ adaptive-learning
- ✅ context-service
- ✅ ml-service
- ✅ multi-modal-service
- ✅ reasoning-engine
- ✅ prompt-service

#### 3.2 Need Migration (Priority Order)

1. **conversation** ⚠️ CRITICAL
   - **Why:** Core AI conversation functionality
   - **Dependencies:** ai-service, context-service, ai-insights
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/conversation.service.ts` (5,292 lines)
   - **Estimated Effort:** 5-7 days
   - **Note:** Large service, consider splitting into sub-services

2. **ai-context-assembly** ⚠️ CRITICAL
   - **Why:** Assembles context for AI requests
   - **Dependencies:** context-service, shard-manager
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/ai-context-assembly.service.ts` (1,074 lines)
   - **Estimated Effort:** 3-4 days

3. **grounding** ⚠️ HIGH PRIORITY
   - **Why:** Verifies AI outputs and generates citations
   - **Dependencies:** ai-service, context-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/grounding.service.ts`
   - **Estimated Effort:** 2-3 days

4. **intent-analyzer** ⚠️ HIGH PRIORITY
   - **Why:** Analyzes user intent for AI requests
   - **Dependencies:** ai-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/intent-analyzer.service.ts`
   - **Estimated Effort:** 2 days

5. **context-template** ⚠️ MEDIUM PRIORITY
   - **Why:** Template management for context assembly
   - **Dependencies:** template-service, context-service
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/context-template.service.ts`
   - **Estimated Effort:** 1-2 days

6. **context-cache** ⚠️ MEDIUM PRIORITY
   - **Why:** Caching for context assembly
   - **Dependencies:** context-service, cache-service
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/context-cache.service.ts`
   - **Estimated Effort:** 1 day

7. **context-quality** ⚠️ MEDIUM PRIORITY
   - **Why:** Quality assessment for context
   - **Dependencies:** context-service, ai-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/context-quality.service.ts`
   - **Estimated Effort:** 2 days

8. **conversation-summarization** ⚠️ LOW PRIORITY
   - **Why:** Summarizes conversations
   - **Dependencies:** conversation, ai-service
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/conversation-summarization.service.ts`
   - **Estimated Effort:** 1-2 days

9. **conversation-context-retrieval** ⚠️ LOW PRIORITY
   - **Why:** Retrieves context for conversations
   - **Dependencies:** conversation, context-service
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/conversation-context-retrieval.service.ts`
   - **Estimated Effort:** 1 day

10. **citation-validation** ⚠️ LOW PRIORITY
    - **Why:** Validates citations in AI responses
    - **Dependencies:** grounding, context-service
    - **Complexity:** Low
    - **Files:** `old_code/apps/api/src/services/citation-validation.service.ts`
    - **Estimated Effort:** 1 day

---

### Tier 4: Adaptive Learning Services
**Priority:** MEDIUM - Advanced features
**Dependencies:** Tier 1, Tier 3

#### 4.1 Already Migrated ✅
- ✅ adaptive-learning (main module)

#### 4.2 Need Migration (These are sub-services of adaptive-learning)

**Note:** These services are part of the adaptive-learning module. They should be migrated as part of expanding the adaptive-learning container, not as separate services.

1. **adaptive-weight-learning** → Part of adaptive-learning
2. **adaptive-model-selection** → Part of adaptive-learning
3. **signal-weighting** → Part of adaptive-learning
4. **adaptive-feature-engineering** → Part of adaptive-learning
5. **outcome-collector** → Part of adaptive-learning
6. **performance-tracker** → Part of adaptive-learning
7. **adaptive-learning-validation** → Part of adaptive-learning
8. **adaptive-learning-rollout** → Part of adaptive-learning
9. **meta-learning** → Part of adaptive-learning
10. **active-learning** → Part of adaptive-learning
11. **feedback-quality** → Part of adaptive-learning
12. **episodic-memory** → Part of adaptive-learning
13. **counterfactual** → Part of adaptive-learning
14. **causal-inference** → Part of adaptive-learning
15. **multimodal-intelligence** → Part of adaptive-learning
16. **prescriptive-analytics** → Part of adaptive-learning
17. **reinforcement-learning** → Part of adaptive-learning
18. **graph-neural-network** → Part of adaptive-learning
19. **neuro-symbolic** → Part of adaptive-learning
20. **conflict-resolution-learning** → Part of adaptive-learning
21. **hierarchical-memory** → Part of adaptive-learning
22. **adversarial-testing** → Part of adaptive-learning

**Action:** Review adaptive-learning container and ensure all these services are included or create sub-modules.

---

### Tier 5: Integration & Content Services
**Priority:** MEDIUM
**Dependencies:** Tier 1, Tier 2

#### 5.1 Already Migrated ✅
- ✅ integration-manager
- ✅ content-generation
- ✅ template-service

#### 5.2 Need Migration

1. **integration-catalog** ⚠️ MEDIUM PRIORITY
   - **Why:** Catalog of available integrations
   - **Dependencies:** integration-manager
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/integration-catalog.service.ts`
   - **Estimated Effort:** 1-2 days

2. **integration-connection** ⚠️ MEDIUM PRIORITY
   - **Why:** Manages integration connections
   - **Dependencies:** integration-manager, secret-management
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/integration-connection.service.ts`
   - **Estimated Effort:** 2 days

3. **adapter-manager** ⚠️ MEDIUM PRIORITY
   - **Why:** Manages integration adapters
   - **Dependencies:** integration-manager
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/adapter-manager.service.ts`
   - **Estimated Effort:** 2-3 days

4. **bidirectional-sync** ⚠️ LOW PRIORITY
   - **Why:** Bidirectional sync for integrations
   - **Dependencies:** integration-manager
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/bidirectional-sync.service.ts`
   - **Estimated Effort:** 3-4 days

5. **sync-task** ⚠️ LOW PRIORITY
   - **Why:** Sync task management
   - **Dependencies:** integration-manager
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/sync-task.service.ts`
   - **Estimated Effort:** 2 days

---

### Tier 6: Risk & Analytics Services
**Priority:** MEDIUM - Business features
**Dependencies:** Tier 1, Tier 3

#### 6.1 Already Migrated ✅
- ✅ analytics-service
- ✅ compliance-service
- ✅ security-service

#### 6.2 Need Migration

1. **risk-evaluation** ⚠️ HIGH PRIORITY
   - **Why:** Core risk evaluation functionality (2,508 lines)
   - **Dependencies:** ai-insights, ml-service
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/risk-evaluation.service.ts`
   - **Estimated Effort:** 5-7 days
   - **Note:** Very large service, consider splitting

2. **risk-catalog** ⚠️ MEDIUM PRIORITY
   - **Why:** Risk catalog management
   - **Dependencies:** risk-evaluation
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/risk-catalog.service.ts`
   - **Estimated Effort:** 2-3 days

3. **revenue-at-risk** ⚠️ MEDIUM PRIORITY
   - **Why:** Revenue calculations
   - **Dependencies:** risk-evaluation, analytics-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/revenue-at-risk.service.ts`
   - **Estimated Effort:** 2-3 days

4. **quota** ⚠️ MEDIUM PRIORITY
   - **Why:** Quota management
   - **Dependencies:** analytics-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/quota.service.ts`
   - **Estimated Effort:** 2 days

5. **early-warning** ⚠️ MEDIUM PRIORITY
   - **Why:** Early warning system
   - **Dependencies:** risk-evaluation, analytics-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/early-warning.service.ts`
   - **Estimated Effort:** 2 days

6. **benchmarking** ⚠️ LOW PRIORITY
   - **Why:** Benchmarking functionality
   - **Dependencies:** analytics-service
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/benchmarking.service.ts`
   - **Estimated Effort:** 2 days

7. **simulation** ⚠️ LOW PRIORITY
   - **Why:** Risk simulation
   - **Dependencies:** risk-evaluation
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/simulation.service.ts`
   - **Estimated Effort:** 3-4 days

---

### Tier 7: Specialized Services
**Priority:** LOW - Nice to have
**Dependencies:** Various

#### 7.1 Already Migrated ✅
- ✅ notification-manager
- ✅ dashboard
- ✅ bug-detection
- ✅ code-generation
- ✅ pattern-recognition
- ✅ performance-optimization
- ✅ pipeline-manager
- ✅ validation-engine

#### 7.2 Need Migration

1. **admin-dashboard** ⚠️ MEDIUM PRIORITY
   - **Why:** Admin dashboard functionality
   - **Dependencies:** dashboard, user-management
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/admin-dashboard.service.ts`
   - **Estimated Effort:** 2-3 days

2. **email** ⚠️ LOW PRIORITY
   - **Why:** Email service (may be handled by notification-manager)
   - **Dependencies:** notification-manager
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/email/`
   - **Estimated Effort:** 1-2 days
   - **Note:** Check if functionality is already in notification-manager

3. **webhook-management** ⚠️ LOW PRIORITY
   - **Why:** Webhook management
   - **Dependencies:** integration-manager
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/webhook-management.service.ts`
   - **Estimated Effort:** 1-2 days

4. **import-export** ⚠️ LOW PRIORITY
   - **Why:** Import/export functionality
   - **Dependencies:** Various
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/import-export.service.ts`
   - **Estimated Effort:** 2-3 days

---

## Migration Strategy by Tier

### Immediate Next Steps (Week 1-2)

1. **enrichment** (Tier 2) - 2-3 days
2. **vectorization** (Tier 2) - 2 days
3. **shard-embedding** (Tier 2) - 1-2 days

### Short Term (Week 3-6)

4. **conversation** (Tier 3) - 5-7 days
5. **ai-context-assembly** (Tier 3) - 3-4 days
6. **grounding** (Tier 3) - 2-3 days
7. **intent-analyzer** (Tier 3) - 2 days

### Medium Term (Week 7-12)

8. **risk-evaluation** (Tier 6) - 5-7 days
9. **shard-relationship** (Tier 2) - 2 days
10. **acl** (Tier 2) - 2 days
11. **integration-catalog** (Tier 5) - 1-2 days
12. **integration-connection** (Tier 5) - 2 days

### Long Term (Week 13+)

- Remaining Tier 3 services
- Remaining Tier 5 services
- Remaining Tier 6 services
- Tier 7 specialized services

---

## Migration Checklist Template

For each service, use this checklist:

- [ ] Pre-migration analysis complete
- [ ] Dependencies identified and available
- [ ] Module structure created (use `./scripts/migrate-service.sh`)
- [ ] Service code migrated and transformed
- [ ] Routes migrated with tenant enforcement
- [ ] Database queries include tenantId
- [ ] Configuration files created
- [ ] OpenAPI spec created
- [ ] Tests written and passing
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Deployed to staging
- [ ] Integration tests passing
- [ ] Production deployment

---

## Notes

1. **Large Services:** Services like `conversation` (5,292 lines) and `risk-evaluation` (2,508 lines) should be reviewed for potential splitting into smaller services.

2. **Adaptive Learning:** Many adaptive learning services are listed separately but should be part of the adaptive-learning container. Review the adaptive-learning container structure.

3. **Email Service:** Check if email functionality is already handled by notification-manager before migrating separately.

4. **Testing:** Each migrated service should have:
   - Unit tests (80%+ coverage)
   - Integration tests
   - Tenant isolation tests
   - Error handling tests

5. **Documentation:** Each service must have:
   - README.md
   - CHANGELOG.md
   - openapi.yaml
   - architecture.md (if complex)

---

_Last Updated: 2026-01-23_
