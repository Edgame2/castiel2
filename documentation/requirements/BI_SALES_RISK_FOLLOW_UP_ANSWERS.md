# BI Sales Risk Analysis – Follow-Up Answers

**Date:** January 2026  
**Status:** Comprehensive Answers to Follow-Up Questions  
**Version:** 1.0

---

## Answer Legend

- ✅ **I CAN ANSWER** - Based on project documentation
- ⚠️ **YOUR INPUT NEEDED** - Critical decision required
- 📋 **RECOMMENDED** - Strong recommendation based on analysis
- 💡 **ASSUMED** - Default assumption if you don't provide input

---

## 1. Implementation Scope ⚠️ YOUR INPUT NEEDED

**Question:** Which scope do you want?

### 📋 MY STRONG RECOMMENDATION: **Option A - Full 12-Month Plan**

**Reasoning:**
1. **Your requirements demand it:**
   - Industry-specific models (Phase 1-2)
   - Competitive intelligence (Phase 2)
   - Executive dashboards (Phase 3)
   - Financial services compliance (Phase 4)
   - Deep learning/RL/causal inference (Phase 3)

2. **ROI justifies it:**
   - 343% ROI requires full implementation
   - $45M annual benefit from $13.1M investment
   - Early phases alone won't deliver this ROI

3. **Dependencies require it:**
   - Compliance depends on audit trails (Phase 4)
   - Benchmarking needs sufficient data (Phase 3)
   - Industry models need full ML infrastructure (Phase 1-2)

4. **Incremental delivery mitigates risk:**
   ```
   Month 3:  Core ML Release (validate approach)
   Month 6:  Advanced Analytics (expand capabilities)
   Month 9:  Executive Intelligence (deliver insights)
   Month 12: Enterprise Compliance (achieve certification)
   ```

**If budget/time constrained:**
- **Option C (Phases 1-2)** is minimum viable to meet your core requirements
- **Option B (Phase 1 only)** lacks competitive intelligence and prescriptive analytics you requested

**⚠️ YOUR DECISION:** Option C

---

## 2. Opportunity & Account Schema ⚠️ YOUR INPUT NEEDED

### ✅ What I Know from Documentation

**Container Structure:**
- **Container:** `shards`
- **Partition Key:** `tenantId`
- **Opportunity Query:** `SELECT * FROM shards WHERE shardTypeId = 'c_opportunity'`
- **Account Query:** `SELECT * FROM shards WHERE shardTypeId = 'c_account'` (likely)

**Field Names Referenced in Documentation:**
```typescript
// From CAIS_ARCHITECTURE.md and FEATURE_ENGINEERING.md
interface OpportunitySignals {
  // Confirmed fields referenced in docs:
  amount: number;           // Deal value
  probability: number;      // Win probability (0-100)
  stage: string;            // Sales stage
  closeDate: Date;          // Target close date
  type: string;             // new_business, renewal, etc.
  
  // Referenced but location unclear:
  lastActivityDate?: Date;  // May be derived
  competitorIds?: string[]; // May be in structuredData or relationships
  
  // Industry - likely at account level:
  industry?: string;        // At opportunity or account?
  
  // Likely fields:
  accountId: string;
  ownerId: string;
  createdAt: Date;
  status?: string;          // won/lost/open
}
```

### ⚠️ CRITICAL - I Need You to Provide:

**1. Exact field names in `structuredData`:**
use default salesforce fields name.
check documentation for additional information.
```typescript
// Please fill in actual field names:
interface OpportunityShard {
  id: string;
  tenantId: string;
  shardTypeId: 'c_opportunity';
  structuredData: {
    // Deal value (e.g., "amount", "value", "dealSize"):
    _______________: number;
    
    // Stage (e.g., "stage", "salesStage", "stageName"):
    _______________: string;
    
    // Close date (e.g., "closeDate", "expectedCloseDate", "targetDate"):
    _______________: Date | string;
    
    // Probability (e.g., "probability", "winProbability", "confidence"):
    _______________: number;
    
    // Status/outcome (e.g., "status", "outcome", "result"):
    // Values: won/lost/open or closed_won/closed_lost/open?
    _______________: string;
    
    // Industry (if at opportunity level):
    _______________?: string;  // or "not present"
    
    // Account reference:
    _______________: string;
    
    // Owner reference:
    _______________: string;
    
    // Competitors (if in structuredData):
    _______________?: string[] | string;  // or "relationship/separate"
    
    // Last activity date (if stored):
    _______________?: Date | string;  // or "derived from activities"
    
    // Any other important fields:
    // _______________: _______________
  };
  createdAt: Date;  // or createdDate?
  updatedAt: Date;
  // ... other shard fields
}
```

**2. Account schema (if industry is here):**
use salesforce default fields name.
```typescript
interface AccountShard {
  id: string;
  tenantId: string;
  shardTypeId: 'c_account';  // correct type ID?
  structuredData: {
    // Industry field (if at account level):
    _______________?: string;
    
    // Account name:
    _______________: string;
    
    // Any other relevant fields:
    // _______________: _______________
  };
}
```

**3. Sample JSON (optional but very helpful):**

Please provide one real example (redact PII):
```json
{
  "id": "opp_xxx",
  "tenantId": "tenant_xxx",
  "shardTypeId": "c_opportunity",
  "structuredData": {
    // ... actual structure here
  },
  "createdAt": "2025-01-01T00:00:00Z"
}
```

**4. Schema changes:**

✅ **You confirmed:** "Yes fields can be added"

**💡 Fields I recommend adding if missing:**

```typescript
interface RecommendedFields {
  // If not present, we should add:
  industryId?: string;        // For model routing
  lastActivityDate?: Date;    // For early warning indicators
  competitorIds?: string[];   // For competitive intelligence
  stageDates?: Record<string, Date>;  // For velocity calculations
}
```

**⚠️ YOUR RESPONSE:** _______________________

---

## 3. Industry Source ⚠️ YOUR INPUT NEEDED

### 📋 MY RECOMMENDATION: Hierarchical Approach

**Recommended Hierarchy:**
```
1. opportunity.structuredData.industryId (if set)
     ↓ fallback to
2. account.structuredData.industryId (if set)
     ↓ fallback to
3. tenant.defaultIndustryId (if set)
     ↓ fallback to
4. "general" (use global model)
```

**Implementation:**
```typescript
async function getIndustryId(
  opportunity: OpportunityShard,
  tenantId: string
): Promise<string | undefined> {
  // 1. Check opportunity level
  if (opportunity.structuredData.industryId) {
    return opportunity.structuredData.industryId;
  }
  
  // 2. Check account level
  const account = await getAccount(
    opportunity.structuredData.accountId,
    tenantId
  );
  if (account?.structuredData.industryId) {
    return account.structuredData.industryId;
  }
  
  // 3. Check tenant default
  const tenant = await getTenant(tenantId);
  if (tenant.settings?.defaultIndustryId) {
    return tenant.settings.defaultIndustryId;
  }
  
  // 4. No industry = use global model
  return undefined;
}
```

**Why This Approach:**
- ✅ Maximum flexibility (opportunity can override account)
- ✅ Account-level industry covers 90% of cases
- ✅ Tenant default for single-industry orgs
- ✅ Graceful fallback to global model

### ⚠️ YOUR DECISION:

**1. Where is industry stored today?**
- [ ] Opportunity only (field name: _______________)
- [ ] Account only (field name: _______________)
- [ ] Both (opportunity overrides account)
- [ ] Tenant/org default only
- [ X] Not stored; must be added

**2. Do you want the hierarchical fallback?**
- [X ] Yes, use hierarchy (recommended)
- [ ] No, single source only: _______________

**⚠️ YOUR RESPONSE:** _______________________

---

## 4. Graph / Relationship Data ⚠️ YOUR INPUT NEEDED

### ✅ What I Know from Documentation

**From CAIS_ARCHITECTURE.md:**
- `ShardRelationshipService.getRelatedShards()` exists
- Related shards include accounts, contacts, activities
- Relationship tracking is production-ready

**Likely Available:**
```typescript
// Probably work today:
const relatedContacts = await shardRelationshipService.getRelatedShards(
  opportunityId,
  'c_contact'
);

const relatedActivities = await shardRelationshipService.getRelatedShards(
  opportunityId,
  ['c_email', 'c_call', 'c_meeting']
);
```

### ⚠️ CRITICAL - Please Confirm What's Available:

**Check each:**

- [ ] ✅ **Opportunity → Account** 
  - Via: `opportunity.structuredData.accountId` ✓ or relationship?
  
- [ ] ✅ **Opportunity → Contacts**
  - Via: `getRelatedShards(oppId, 'c_contact')` or other?
  - Available? YES / NO
  
- [ ] ✅ **Contact Roles** (decision maker, influencer, executive sponsor)
  - Where stored: _______________
  - Available? YES / NO
  
- [ ] ✅ **Opportunity → Activities** (emails, calls, meetings)
  - Via: `getRelatedShards(oppId, ['c_email', 'c_call', 'c_meeting'])`?
  - Available? YES / NO
  
- [ ] ✅ **Contact → Contact** (reporting structure)
  - Available? YES / NO
  - Where: _______________
  
- [ ] ✅ **Query Capabilities:**
  - "All opportunities for an account" - Available? YES / NO
  - "All contacts for an opportunity" - Available? YES / NO
  - "All activities for an opportunity" - Available? YES / NO


Create the shard types structuredData schema as needed but doumenet them.

### 📋 MY RECOMMENDATION: Phased Approach

**If some relationships are missing:**

**Phase 1 (Implement with available data):**
- Use opportunity → account (always available via accountId)
- Use whatever contact relationships exist
- Implement basic account health (without full propagation)
- Document limitations

**Phase 2 (Add missing relationships):**
- Add contact roles
- Add contact-contact reporting
- Implement full risk propagation
- Implement network analysis

**Benefits:**
- ✅ Deliver value immediately with available data
- ✅ No blocking on schema changes
- ✅ Incremental enhancement as data becomes available

### ⚠️ YOUR DECISION:

**If relationships are incomplete:**
- [ ] Phase 1: Basic implementation with available data (recommended)
- [ ] Phase 2: Wait for all relationships before implementing propagation
- [X ] Add missing relationships before Phase 1

**Which relationships are you willing to add if missing?**
- [X ] Contact roles (decision maker, influencer, sponsor)
- [ X] Contact-to-contact reporting structure
- [ ] Other: _______________

**⚠️ YOUR RESPONSE:** _______________________

---

## 5. Leading Indicators – Data Availability ⚠️ YOUR INPUT NEEDED

### 📋 MY RECOMMENDATION: Phased Approach

**Phase 1 (Basic Indicators - High Confidence):**

Based on documentation, these are likely available:

```typescript
interface Phase1LeadingIndicators {
  // Very likely available:
  daysSinceLastActivity: number;      // From opportunity.lastActivityDate or activities
  stageStagnationDays: number;        // From stage + stageUpdatedAt/stageDates
  
  // Probably available:
  activityCount30Days: number;        // Count related activities in last 30 days
  stakeholderCount: number;           // Count related contacts
}
```

**Data Sources for Phase 1:**
```typescript
// Days since last activity:
const lastActivity = opportunity.structuredData.lastActivityDate 
  || await getLastActivityDate(opportunityId);  // From activity shards
const daysSince = daysBetween(now, lastActivity);

// Stage stagnation:
const stageDate = opportunity.structuredData.stageUpdatedAt 
  || opportunity.structuredData.stageDates?.[currentStage];
const daysInStage = daysBetween(now, stageDate);

// Activity count:
const activities = await getRelatedShards(oppId, ['c_email', 'c_call', 'c_meeting']);
const last30Days = activities.filter(a => 
  daysBetween(now, a.createdAt) <= 30
);

// Stakeholder count:
const contacts = await getRelatedShards(oppId, 'c_contact');
const stakeholderCount = contacts.length;
```

**Phase 2 (Enhanced Indicators - Need Confirmation):**

```typescript
interface Phase2LeadingIndicators extends Phase1LeadingIndicators {
  emailResponseRate: number;          // Needs: email sender/recipient tracking
  meetingCancellationRate: number;    // Needs: calendar cancellation status
  activityTypeDiversity: number;      // Needs: activity type classification
  executiveSponsorEngagement: number; // Needs: contact roles + activity filtering
}
```

### ⚠️ CRITICAL - Please Confirm Availability:

**Phase 1 Data (basic indicators):**

- [X ] **Days since last activity**
  - Source: [ ] opportunity.lastActivityDate field OR [ ] derived from activity shards
  - Available? YES / NO
  if not available create it.
  
- [ X] **Activity count (last 30 days)**
  - Source: Count of related shards with shardTypeId in ['c_email', 'c_call', 'c_meeting']
  - Available? YES / NO
  if not available create it.
- [ X] **Stage stagnation (days in stage)**
  - Source: [ ] opportunity.stageUpdatedAt OR [ ] opportunity.stageDates OR [ ] derived
  - Available? YES / NO
  if not available create it.
- [ X] **Stakeholder count**
  - Source: Count of related shards with shardTypeId = 'c_contact'
  - Available? YES / NO
  if not available create it.

**Phase 2 Data (enhanced indicators):**

- [ ] **Email data**
  - Shard type: c_email(e.g., 'c_email')
  - Has sender/recipient? YES / NO
  - Has timestamps? YES / NO
  - Has read receipts? YES / NO
  if not available create it.
  
- [ ] **Calendar data**
  - Shard type: c_event (e.g., 'c_meeting', 'c_calendar_event')
  - Has cancellation status? YES / NO
  - Has attendee status? YES / NO
  if not available create it.
  
- [ ] **Activity type classification**
  - Activity types stored in shardTypeId? YES / NO
  - Types available: activity_type
  if not available create it.
  
- [ ] **Executive sponsor / decision maker**
  - Contact roles available? YES / NO
  - Where: role
  if not available create it.

### 📋 MY RECOMMENDATION:

**Start with Phase 1 indicators:**
- Implement with available data
- Deploy early warning system with 4 basic indicators
- Add Phase 2 indicators incrementally as data becomes available

**Alternative (if Phase 1 data is limited):**
- Start with stage stagnation only (most critical)
- Add others as they become available

### ⚠️ YOUR DECISION:

- [X ] Phase 1 only for MVP (implement with available basic indicators) ← RECOMMENDED
- [ ] Wait until all Phase 2 sources are available
- [ ] Custom selection: _______________

**Which Phase 1 indicators are available today?**
- [ ] Days since last activity
- [ ] Activity count (last 30 days)
- [ ] Stage stagnation (days in stage)
- [ ] Stakeholder count

**⚠️ YOUR RESPONSE:** all must be available, if not available create it.

---

## 6. Data Lake & Data Collector ⚠️ YOUR INPUT NEEDED

### ✅ What I Know

**You confirmed:** "Data collector must store the data in Azure Storage data lake, want to leverage that data for risk snapshot."

### 📋 MY RECOMMENDATION: Hybrid Architecture

**Architecture:**
```
Risk Evaluation
    ↓ publishes event
risk.evaluated event
    ↓ consumed by
┌────────────────────────────────┐
│ Data Collector (writes to      │──→ Azure Data Lake (Source of Truth)
│ Data Lake)                      │    Path: /risk_evaluations/year=YYYY/month=MM/
│                                 │    Format: Parquet
└────────────────────────────────┘
    ↓ also consumed by
┌────────────────────────────────┐
│ Risk Snapshot Service          │──→ Cosmos DB (Materialized View)
│ (writes to Cosmos)              │    Container: risk_snapshots
│                                 │    Fast queries for ML
└────────────────────────────────┘
```

**Benefits:**
- ✅ Data Lake = source of truth, long-term storage, analytics
- ✅ Cosmos DB = fast queries (<100ms), low-latency for LSTM
- ✅ Event-driven = automatic updates
- ✅ Backfill = one-time job to populate from Data Lake

### ⚠️ CRITICAL - Please Confirm:

**1. Does Data Collector service exist today?**
- [ ] YES - Service/module name: _______________
- [X ] NO - We need to add it

**If YES:**
- Data Lake path pattern: _______________
- Format: [ ] Parquet [ ] JSON [ ] Other: _______________
- Subscribes to events? YES / NO
- Which events: 

**If NO:**
- [ X] Include Data Collector implementation in plan (recommended)
- [ ] We will add it separately

**2. Data Lake reading capability:**
- [ ] Exists - API/service name: _______________
- [X ] Needs to be added - Include in plan

**3. Backfill job:**
- [X ] Include batch job to backfill Cosmos from Data Lake (recommended)
- [ ] We will handle backfill separately

### 💡 DEFAULT ASSUMPTION (if you don't answer):

I will assume:
1. Data Collector needs to be implemented
2. Will subscribe to `risk.evaluated` event
3. Will write to Data Lake: `/risk_evaluations/year={YYYY}/month={MM}/day={DD}/`
4. Format: Parquet (efficient, columnar)
5. Backfill job included in implementation plan

**⚠️ YOUR RESPONSE:** yes looks good

---

## 7. UI App and Dashboard Host ✅ I CAN ANSWER

### ✅ Based on Documentation Analysis

**From project structure:**
- `containers/ui` - Next.js app (currently minimal)
- `containers/dashboard` - Backend service (Fastify) for dashboard CRUD

### 📋 MY RECOMMENDATIONS:

**1. All BI pages in `containers/ui` (extend existing)** ✅

**Reasoning:**
- Already a Next.js app
- Consistent UX
- Shared authentication
- Simpler deployment (one frontend app)

**New pages to add:**
```
containers/ui/src/app/
  ├── risk/
  │   ├── page.tsx                 # Risk overview
  │   ├── opportunities/[id]/      # Opportunity risk detail
  │   └── early-warning/           # Early warning dashboard
  ├── competitive/
  │   ├── page.tsx                 # Competitive intelligence
  │   └── [competitorId]/          # Competitor detail
  ├── executive/
  │   ├── page.tsx                 # Executive dashboard
  │   └── board/                   # Board dashboard
  └── remediation/
      └── [workflowId]/            # Remediation workflow
```

**2. Dashboard backend: Extend `dashboard` + `dashboard-analytics`** ✅

**Reasoning:**
- Established patterns
- Widget system already exists
- Dashboard CRUD already implemented

**New services to add to dashboard-analytics:**
```typescript
// packages/dashboard-analytics/src/services/
  ├── executive-analytics.service.ts     # NEW
  ├── competitive-analytics.service.ts   # NEW
  ├── risk-analytics.service.ts          # Enhance
  └── portfolio-analytics.service.ts     # NEW
```

**3. Auth/tenant:** ✅

**From documentation:**
- Multi-tenant architecture confirmed
- `tenantId` is partition key throughout
- JWT authentication exists
- API gateway handles auth

**Assumption:** `containers/ui` gets `X-Tenant-ID` from API gateway (standard pattern)

**💡 DEFAULT FOR IMPLEMENTATION:**
- Primary scope: `tenantId` (confirmed throughout documentation)
- `organizationId` may exist but `tenantId` is what's used for data scoping

### ⚠️ OPTIONAL - Confirm if different:

**If UI/auth works differently:**
- [ ] UI app name is different: _______________
- [ ] Auth works differently: _______________
- [ ] Both `tenantId` and `organizationId` are used; primary for BI: _______________

**⚠️ YOUR RESPONSE (optional):** use only tenantId. Change any reference to organizationId.
The all system must only use tenantId

---

## 8. Portfolio and Drill-Down ✅ I CAN ANSWER

### 📋 MY RECOMMENDATIONS:

**1. Portfolio Definition: Tenant first, segments later** ✅

**Phase 1 (MVP):**
```typescript
interface Portfolio {
  type: 'tenant';
  tenantId: string;
  // Portfolio = all opportunities for the tenant
}

// Simple aggregation:
const portfolioMetrics = await getPortfolioMetrics(tenantId);
```

**Phase 2 (Future enhancement):**
```typescript
interface Portfolio {
  id: string;
  name: string;
  tenantId: string;
  type: 'tenant' | 'segment';
  filter?: {
    accountSize?: string[];      // e.g., ['enterprise', 'mid-market']
    industry?: string[];
    owner?: string[];
    region?: string[];
  };
}

// Examples:
// - "Enterprise Accounts" = filter by accountSize
// - "Q1 Pipeline" = filter by closeDate
// - "East Region" = filter by region
```

**Why Phase 1 first:**
- ✅ Simpler implementation
- ✅ Validates drill-down UX
- ✅ 90% of users need tenant-level view
- ✅ Can add segments in Phase 2 without breaking existing

**2. Activity = List of shards** ✅

**Implementation:**
```typescript
// Drill-down to activities
async function getOpportunityActivities(
  opportunityId: string,
  tenantId: string
): Promise<Activity[]> {
  
  // Get related activity shards
  const activityShards = await shardRelationshipService.getRelatedShards(
    opportunityId,
    ['c_email', 'c_call', 'c_meeting', 'c_note', 'c_task']
  );
  
  // Transform to activity list format
  return activityShards.map(shard => ({
    id: shard.id,
    type: mapShardTypeToActivityType(shard.shardTypeId),
    subject: shard.structuredData.subject || shard.structuredData.title,
    date: shard.createdAt,
    participants: shard.structuredData.participants || [],
    summary: shard.structuredData.summary || truncate(shard.content, 200),
    sentiment: shard.sentiment,
    riskIndicators: extractRiskIndicators(shard)
  }));
}
```

**Drill-Down Flow:**
```
Portfolio Dashboard
    ↓ (click account)
Account Detail
    ↓ (click opportunity)
Opportunity Detail
    ↓ (click activities tab)
Activity List
    ↓ (click activity)
Activity Detail (shard content)
```

### 💡 DEFAULT FOR IMPLEMENTATION:

1. **Portfolio:** Tenant-level only in Phase 1
2. **Activity:** List of shards via `getRelatedShards()`

**⚠️ CONFIRM if you want different:** _______________________

---

## 9. Data Collector and Usage Tracking (Audit) ⚠️ YOUR INPUT NEEDED

### 📋 MY RECOMMENDATION: Three-Tier Audit System

**Architecture:**
```
┌─────────────────────────────────────────────────────┐
│ Tier 1: Logging Service (Audit Log)                 │
│ - Purpose: Regulatory compliance, security          │
│ - Scope: All risk assessments, predictions          │
│ - Storage: Immutable Blob Storage (7 year retention)│
│ - Access: Compliance team, auditors only            │
└─────────────────────────────────────────────────────┘
         ↑ (consumes events)
         │
┌─────────────────────────────────────────────────────┐
│ Tier 2: Data Collector (Big Data Analysis)          │
│ - Purpose: Analytics, ML training                   │
│ - Scope: All ingested data, status changes          │
│ - Storage: Azure Data Lake (Parquet, 3 year)        │
│ - Access: Data scientists, analysts                 │
└─────────────────────────────────────────────────────┘
         ↑ (consumes events)
         │
┌─────────────────────────────────────────────────────┐
│ Tier 3: Usage Tracking (Billing)                    │
│ - Purpose: Cost allocation, billing                 │
│ - Scope: ML inference, embeddings, API calls        │
│ - Storage: Cosmos DB (aggregated, 2 year)           │
│ - Access: Finance team, product managers            │
└─────────────────────────────────────────────────────┘
         ↑ (consumes events)
         │
    [Event Bus]
         ↑ (publishes events)
         │
┌─────────────────────────────────────────────────────┐
│ Risk Analytics & ML Service                         │
│ - Publishes: risk.evaluated, ml.prediction.completed│
└─────────────────────────────────────────────────────┘
```

**Event-Based Approach:**
```typescript
// Services publish events
await eventBus.publish('risk.evaluated', {
  tenantId,
  opportunityId,
  riskScore,
  categoryScores,
  modelId,
  modelVersion,
  timestamp: new Date()
});

// Multiple consumers subscribe
loggingService.subscribe('risk.evaluated', logToAuditLog);
dataCollector.subscribe('risk.evaluated', writeToDataLake);
usageTracking.subscribe('risk.evaluated', trackUsage);
```

### ⚠️ CRITICAL - Please Confirm:

**1. Do these services exist today?**
- [ ] Logging Service exists - Name: _______________
- [ ] Data Collector exists - Name: _______________
- [ ] Usage Tracking exists - Name: _______________
- [ ] None exist - Include in plan

**2. For ML audit, which approach?**
- [ ] **Publish events** (recommended) - `risk.evaluated`, `ml.prediction.completed`
- [ ] **Call API directly** - Less flexible, tight coupling
- [ ] **Both** - Publish events + direct API for critical path

### 📋 MY RECOMMENDATION: Publish Events

**Reasoning:**
- ✅ Loose coupling
- ✅ Multiple consumers (logging, data collector, usage)
- ✅ Async (no latency impact)
- ✅ Reliable (Service Bus guarantees)
- ✅ Easy to add new consumers

**Event Schema:**
```typescript
// risk.evaluated event
{
  eventType: 'risk.evaluated',
  tenantId: string,
  opportunityId: string,
  userId: string,
  riskScore: number,
  categoryScores: Record<string, number>,
  detectedRisks: Risk[],
  modelId?: string,
  modelVersion?: string,
  inferenceTimeMs: number,
  timestamp: Date
}

// ml.prediction.completed event
{
  eventType: 'ml.prediction.completed',
  tenantId: string,
  entityId: string,
  entityType: 'opportunity' | 'account',
  predictionType: 'risk' | 'win_probability' | 'forecast',
  prediction: any,
  modelId: string,
  modelVersion: string,
  features: FeatureVector,
  inferenceTimeMs: number,
  timestamp: Date
}
```

### 💡 DEFAULT ASSUMPTION (if you don't answer):

I will assume:
1. Services don't exist yet - need to implement
2. Event-based approach for ML audit
3. All three tiers required for compliance

**⚠️ YOUR RESPONSE:** _______________________

---

## 10. Queuing – RabbitMQ Only ✅ ANSWERED

**Your answer:** For queuing, the **entire system must rely on RabbitMQ**. No Azure Service Bus or other message brokers. All event pub/sub and job/batch queuing use RabbitMQ only (existing `coder_events` exchange and any new queues/exchanges as needed).

---

## Summary & Defaults

### ⚠️ CRITICAL INPUTS STILL NEEDED (Blocks Implementation Plan):

1. **Scope (Question 1):** A/B/C or custom?
2. **Opportunity Schema (Question 2):** Actual field names
3. **Industry Source (Question 3):** Where stored, want hierarchy?
4. **Graph Data (Question 4):** What's available today?
5. **Leading Indicators (Question 5):** Which data sources exist?

### 💡 DEFAULTS I'LL USE (if you don't provide input):

**For Question 6 (Data Lake):**
- ✅ Data Collector doesn't exist - will implement
- ✅ Format: Parquet
- ✅ Path: `/risk_evaluations/year={YYYY}/month={MM}/day={DD}/`
- ✅ Include backfill job

**For Question 7 (UI/Dashboard):**
- ✅ Extend `containers/ui` for all BI pages
- ✅ Extend `dashboard` + `dashboard-analytics` for backend
- ✅ `tenantId` is primary scope

**For Question 8 (Portfolio):**
- ✅ Tenant-level portfolios only (Phase 1)
- ✅ User-defined segments in Phase 2
- ✅ Activities = list of shards

**For Question 9 (Audit):**
- ✅ Implement all three tiers (logging, data collector, usage)
- ✅ Event-based approach
- ✅ Events: `risk.evaluated`, `ml.prediction.completed`

### 🎯 Next Steps

**Once you provide the 5 critical inputs, I can:**
1. Generate complete implementation plan
2. Create database schemas
3. Define API specifications
4. Break down into detailed tasks
5. Provide timeline with dependencies

**Priority: Questions 1-5 are CRITICAL for implementation plan.**

Please provide answers to questions 1-5, and I'll generate the complete implementation plan immediately!

---

**Document Version:** 1.0  
**Date:** January 2026  
**Status:** Awaiting Critical Inputs
