# Phase 2 Questions: What's Already Implemented vs. What Needs Decisions

## Summary: 50% of Phase 2 infrastructure already exists!

Based on semantic search of the codebase, here's what's already implemented:

### ✅ ALREADY IMPLEMENTED

**1. Integration System (Mostly Complete)**
- **File**: `docs/features/integrations/` (comprehensive documentation)
- **Scope**: Full integration framework with adapters for:
  - Salesforce (OAuth, SOQL, entities: Account, Contact, Opportunity, Lead)
  - Google News, Notion, Teams, Zoom, Gong, Google Drive, OneDrive, etc.
- **Components**: 
  - Base adapter framework (`base-adapter.ts`)
  - Integration repository and services
  - Conversion schema engine with 30+ transformations
  - Sync task scheduler (interval, cron)
  - OAuth flow and credential management
- **Status**: Phase 1-2 complete (adapters exist, schema engine complete)

**2. Soft Delete & Data Retention (Complete)**
- **Files**: `shard.repository.ts`, `document.controller.ts`
- **Behavior**: 
  - Soft delete sets `status: DELETED`, `deletedAt`, `ttl: 90 days`
  - Soft-deleted shards excluded from queries but accessible by ID
  - Hard delete option available
  - Restore within 30-day window for documents
  - Cascade delete for document chunks
  - Audit log created on deletion
- **Status**: ✅ Fully implemented

**3. Audit & Logging (Complete)**
- **Files**: `audit-log.service.ts`, `document.controller.ts`
- **Capabilities**:
  - Audit trail for all shard operations (create, update, delete, restore)
  - Soft delete tracking with `deletedBy` and `deletedAt`
  - Retention policies: 7-day TTL for audit entries
  - Purge old logs via `purgeOldLogs(tenantId, beforeDate)`
  - Event tracking (InsightGenerated, InsightDeleted, etc.)
- **Status**: ✅ Fully implemented

**4. Enrichment & NLP (Complete)**
- **Files**: `enrichment.service.ts`, `enrichment.types.ts`
- **Processors Implemented**:
  - Entity extraction (persons, organizations, locations, dates, etc.)
  - Classification (category, subcategories, tags)
  - Summarization (short/medium/long with key points)
  - Sentiment analysis (positive/negative/neutral/mixed with aspect analysis)
  - Key phrases extraction
- **Confidence Scoring**: Confidence per entity, classification, aspect
- **Status**: ✅ Fully implemented and integrated with AI insights

**5. Shard Linking & Relationships (Complete)**
- **Files**: `shard-linking.service.ts`, `shard-linking.types.ts`
- **Relationships**: 17 relationship types (REFERENCE_DOCUMENT, BLOCKS, DEPENDS_ON, etc.)
- **Features**:
  - Bidirectional link support
  - Link strength (0-1 scoring)
  - Bulk link creation
  - Link validation and impact analysis
  - AI-suggested relationships
  - Link filtering and pagination
  - Access tracking and metrics
- **Status**: ✅ Fully implemented

**6. Monitoring & Observability (Complete)**
- **Files**: `MONITORING.md` (comprehensive guide)
- **Metrics Tracked**:
  - Performance: latency (P50, P95, P99), throughput, error rate
  - Cost: per-tenant costs, model usage, monthly projections
  - Quality: hallucination risk, confidence scores, grounding scores
  - Resource: Cosmos DB RU, cache hit rates, API queue depth
- **Status**: ✅ Fully implemented

---

## ❌ STILL NEED DECISIONS FROM YOU

Based on the implementation discovery, here are the **critical Phase 2 questions that require your input**:

### **Question 3: Priority Integrations for Phase 2A**

The integration framework exists. Which should Phase 2A focus on first?

- **A)** Salesforce only (CRM: Account, Contact, Opportunity)
- **B)** Salesforce + Slack/Teams (CRM + Messaging)
- **C)** Salesforce + Google Drive + Teams (full scope)
- **D)** Custom priority (please specify)

---

### **Question 4: Data Freshness SLAs**

What are acceptable freshness windows?

- **A)** CRM: <15 min, Messaging: <5 min, Drive: 1 hour
- **B)** CRM: <1 hour, Messaging: <30 min, Drive: 4 hours
- **C)** CRM: Daily batch (nightly), Messaging: end-of-day, Drive: weekly
- **D)** Custom per integration (please specify)

---

### **Question 5: Entity Linking Strategy**

When normalizing Salesforce Account → c_company:

- **A)** Always create separate entity shards (c_company separate from Account record)
- **B)** Inline in Account's structuredData (no separate shard)
- **C)** Configurable per integration (flexibility)
- **D)** Other approach (please specify)

---

### **Question 6: Enrichment Confidence Gating**

For auto-attachment of relationships via enrichment:

- **A)** Strict: Only links with confidence > 0.8
- **B)** Moderate: Links with confidence > 0.6
- **C)** Lenient: Links with confidence > 0.5
- **D)** Custom threshold (specify your preference)

---

### **Question 7: KPI Catalog for Phase 2**

Which KPIs should Phase 2 compute?

- **A)** CRM only: deal value, win rate, sales cycle duration, close probability
- **B)** Cross-platform: CRM metrics + document age/sharing + team velocity
- **C)** Basic: just expected revenue and close probability
- **D)** Custom list (please specify)

---

### **Question 8: Bidirectional Sync Scope**

Which shards support write-back to external systems?

- **A)** CRM fields only (stage, amount, close date can be updated in Salesforce)
- **B)** Read-only (inbound only, no write-back to external systems)
- **C)** Document metadata (Drive/SharePoint folder structure updates only)
- **D)** Full bidirectional (any field can sync both directions)

---

### **Question 9: Redaction & Governance**

Which content types require redaction initially?

- **A)** PII only (email addresses, phone numbers)
- **B)** PII + Email bodies + Message content
- **C)** PII + Email bodies + Messages + Financial data
- **D)** Custom redaction rules (specify which fields)

---

### **Question 10: Project Auto-Attachment Rules**

How aggressively should shards auto-attach to projects?

- **A)** Conservative: Only exact matches (entity+actor overlap)
- **B)** Balanced: Entity overlap OR time window (30d) match
- **C)** Aggressive: Multiple signals (entity, actor, time, tags)
- **D)** Manual only (no auto-attachment, users must add explicitly)

---

## What I'm Ready to Do

Once you answer these 8 questions, I can immediately:

1. ✅ Lock down new shard type definitions (c_folder, c_file, c_sp_site, c_channel)
2. ✅ Design the ingestion → normalization → enrichment flow with your specific choices
3. ✅ Create the project resolver API endpoints
4. ✅ Configure embedding templates per shard type
5. ✅ Update phase-2.md with locked decisions and specific implementation tasks

---

## Time to Answer

**Which questions should I ask first?**

- **A)** All 8 at once (full survey)
- **B)** One by one (slow but thorough)
- **C)** By category (integrations first, then enrichment, then governance)
- **D)** Start with highest-impact (Q3, Q4, Q5)
