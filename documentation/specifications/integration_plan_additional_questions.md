# Additional Questions for Integration Data Flow Plan

## Questions Based on Answer Review

After reviewing the answers in `INTEGRATION_QUESTIONS_ANSWERS_PART1.md` and `INTEGRATION_QUESTIONS_ANSWERS_PART2.md`, the following questions remain or need clarification:

### 1. Consumer Deployment Architecture

**Question**: The answers specify dedicated consumer instances for heavy processing (Document, Meeting). Should these be:
- **Options:**
  - A) Separate container apps/services (integration-processors-light, integration-processors-heavy)
  - B) Same container app with different consumer types based on environment variable (CONSUMER_TYPE)
  - C) Kubernetes deployments with different resource allocations

**Context**: Answers mention "dedicated container instances" but don't specify if this is separate services or same service with different configs.

### 2. ML Field Calculation for Existing Opportunities

**Question**: When MLFieldAggregationConsumer calculates relationship counts for existing opportunities (not newly created), should it:
- **Options:**
  - A) Always publish `integration.opportunity.ml_fields_updated` (triggers risk recalculation)
  - B) Only publish if counts changed significantly (e.g., > 10% change)
  - C) Never publish (only for new opportunities)

**Context**: Answers specify behavior for new opportunities, but not for periodic recalculation of existing ones.

### 3. Entity Linking Service Location

**Question**: Should EntityLinkingService be:
- **Options:**
  - A) Part of integration-sync service (shared by all processors)
  - B) Separate service (entity-linking) for better isolation
  - C) Part of each processor (DocumentProcessor, EmailProcessor, etc.)

**Context**: Answers specify the service interface but not where it should live.

### 4. Suggested Links Storage

**Question**: Where should suggested links (60-80% confidence) be stored?
- **Options:**
  - A) Cosmos DB container `suggested_links` (separate from shard relationships)
  - B) As shard relationships with status="suggested" (same container as auto-links)
  - C) In shard metadata (structuredData.suggestedLinks)

**Context**: Answers mention storing suggested links but don't specify the storage mechanism.

### 5. Document Processing for Large Files

**Question**: For documents >= 5MB, the answer specifies async processing. Should the initial partial shard:
- **Options:**
  - A) Be immediately visible to users (with processingStatus="pending")
  - B) Not be created until processing completes (user sees nothing until done)
  - C) Be created but hidden from UI until processing completes

**Context**: Answers specify async processing but don't clarify user experience.

### 6. Entity Linking Debouncing Implementation

**Question**: The debouncing (5-second window) should use:
- **Options:**
  - A) Redis with TTL (simple, but requires Redis)
  - B) In-memory Map per consumer instance (simpler, but not distributed)
  - C) RabbitMQ delayed messages (native, but more complex)

**Context**: Answers mention Redis but don't specify if it's required or if alternatives are acceptable.

### 7. Shard Type Creation Process

**Question**: Should shard types be created:
- **Options:**
  - A) Via shard-manager API on service startup (ensureShardType pattern)
  - B) Via migration script/terraform (infrastructure as code)
  - C) Via admin API endpoint (manual creation)

**Context**: Answers say "create all upfront" but don't specify the mechanism.

### 8. Field Mapper Transform Functions

**Question**: Should custom transform functions be:
- **Options:**
  - A) Registered at service startup (static registration)
  - B) Loaded from integration config (per-integration transforms)
  - C) Both: Built-in at startup, custom from config

**Context**: Answers mention plugin system but don't specify registration mechanism.

### 9. Opportunity Event Debouncing Scope

**Question**: Should debouncing group events:
- **Options:**
  - A) Per opportunity (multiple links to same opportunity within 5s → one event)
  - B) Per tenant (all opportunity events within 5s → one batch event)
  - C) Per integration (all opportunities from same integration within 5s → one batch event)

**Context**: Answers mention 5-second window but don't specify grouping scope.

### 10. Azure Infrastructure Setup Timing

**Question**: Should Azure Blob Storage and Cognitive Services be:
- **Options:**
  - A) Set up manually before Phase 1 starts
  - B) Created via Terraform/Infrastructure as Code in Phase 1
  - C) Assumed to exist, created separately by DevOps

**Context**: Answers say "set up in Phase 1" but don't specify if this is code or manual setup.

---

## Priority Questions

**High Priority** (affect implementation approach):
- Question 1: Consumer deployment architecture
- Question 3: Entity linking service location
- Question 7: Shard type creation process

**Medium Priority** (affect implementation details):
- Question 2: ML field calculation for existing opportunities
- Question 4: Suggested links storage
- Question 6: Debouncing implementation

**Low Priority** (affect UX/optimization):
- Question 5: Document processing UX
- Question 8: Transform function registration
- Question 9: Debouncing scope
- Question 10: Azure infrastructure setup
