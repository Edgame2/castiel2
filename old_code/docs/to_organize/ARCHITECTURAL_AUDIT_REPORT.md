# Architectural Audit Report: Castiel System
**Date:** 2025-01-28  
**Auditor:** Senior Software Architect & AI Systems Engineer  
**Scope:** Full system audit with focus on Risk Analysis and AI Chat features

---

## Executive Summary

### Overall Assessment: **MOSTLY** ✅

**Does the project make sense overall?** **MOSTLY**

The Castiel platform demonstrates a well-structured architecture with clear separation of concerns, comprehensive AI integration, and thoughtful security measures. The system is **capable of delivering high-quality outputs** with proper safeguards, but several architectural concerns and missing components prevent it from being production-ready without addressing critical gaps.

### Key Strengths

1. **Clear Architecture Separation**
   - Well-defined monorepo structure (apps/api, apps/web, packages/)
   - Proper service layer separation (repositories, services, controllers)
   - Good use of TypeScript for type safety

2. **Comprehensive AI Integration**
   - Multi-layered AI system with grounding, citations, and hallucination detection
   - Proper prompt injection prevention
   - Context assembly with RAG capabilities
   - Tool/function calling with permission checks

3. **Risk Analysis Design**
   - Hybrid approach: rule-based (deterministic) + AI (probabilistic) + historical patterns
   - Clear separation between deterministic and probabilistic steps
   - Confidence scoring and explainability tracking

4. **Security Foundations**
   - Input sanitization utilities
   - Tenant isolation via partition keys
   - Authentication and authorization middleware
   - Prompt injection prevention

### Key Risks

1. **CRITICAL: Missing Assumption Tracking**
   - Risk Analysis does not explicitly track assumptions or data quality issues
   - No mechanism to flag when AI outputs are based on incomplete or stale data
   - Confidence scores exist but assumptions are not surfaced to users

2. **CRITICAL: Incomplete Audit Trail**
   - Risk evaluations are cached and stored, but full traceability is limited
   - AI Chat responses lack comprehensive audit logging
   - No clear lineage from input data → AI processing → output

3. **HIGH: AI Response Parsing Fragility**
   - Risk Analysis AI detection relies on JSON parsing with fallback to regex
   - No validation that parsed risks match catalog definitions
   - Silent failures when AI returns unexpected formats

4. **HIGH: Context Assembly Edge Cases**
   - No explicit handling when context is empty or insufficient
   - Token limits may truncate critical context without warning
   - Project context assembly may miss related shards silently

5. **MEDIUM: Tool Permission System Incomplete**
   - Tool executor has permission checking framework but implementation is partial
   - Some tools available to all users without proper authorization
   - No audit trail for tool executions

6. **MEDIUM: Data Validation Gaps**
   - Input validation exists but not consistently applied across all entry points
   - Risk Analysis accepts opportunity data without validating required fields
   - No validation that numerical data (probability, value) is within reasonable ranges

---

## Architecture Assessment

### What Works Well

1. **Service Layer Architecture**
   - Clear separation: Controllers → Services → Repositories
   - Dependency injection pattern allows for testability
   - Services are well-scoped (RiskEvaluationService, InsightService, etc.)

2. **Data Layer**
   - Cosmos DB with proper partition key strategy (tenantId)
   - Redis caching for performance
   - Vector search integration for RAG

3. **AI Integration Architecture**
   - UnifiedAIClient abstraction allows multiple providers
   - Model selection service for cost/performance optimization
   - Prompt resolver with hierarchy (system → tenant → project → user)

4. **Error Handling**
   - Monitoring integration throughout
   - Graceful degradation (e.g., grounding service optional)
   - Exception tracking with context

### What Is Fragile or Unclear

1. **Service Initialization Complexity**
   - `apps/api/src/routes/index.ts` has 2000+ lines of initialization logic
   - Many optional services with try-catch blocks that silently fail
   - Unclear what happens when optional services (grounding, vector search) are unavailable

2. **Configuration Management**
   - Environment variables scattered across multiple files
   - No centralized configuration validation
   - Missing configuration can cause silent failures

3. **Testing Coverage**
   - Integration tests exist but coverage gaps in critical paths
   - No tests for AI response parsing edge cases
   - Missing tests for context assembly with insufficient data

4. **Data Flow Clarity**
   - Risk Analysis pipeline has multiple entry points (rules, AI, historical, semantic)
   - Unclear how conflicts between detection methods are resolved
   - No explicit data quality gates before AI processing

---

## Risk Analysis Feature Review

### Design Quality Score: **7/10**

### Architecture Strengths

1. **Hybrid Detection Approach** ✅
   - Rule-based (deterministic) runs first
   - AI-powered (probabilistic) clearly separated
   - Historical pattern matching as additional signal
   - Semantic discovery for context expansion

2. **Confidence Scoring** ✅
   - Each detected risk has confidence (0-1)
   - Confidence contributes to risk score calculation
   - Explainability strings track why risk was detected

3. **Risk Catalog System** ✅
   - Centralized risk definitions
   - Industry-specific catalogs
   - Detection rules defined per risk

### Major Issues

1. **CRITICAL: No Assumption Tracking**
   ```typescript
   // Current: Confidence exists but assumptions are not tracked
   confidence: Math.min(Math.max(riskData.confidence || 0.5, 0), 1)
   
   // Missing: What assumptions were made?
   // - Was data complete?
   // - Were related shards available?
   // - Was AI model available?
   // - What data quality issues exist?
   ```

2. **CRITICAL: AI Response Parsing Fragility**
   ```typescript
   // apps/api/src/services/risk-evaluation.service.ts:634-653
   // Tries JSON.parse, then regex extraction, then natural language parsing
   // No validation that extracted risks match catalog
   // Silent failures if parsing fails
   ```

3. **HIGH: Missing Data Quality Gates**
   - No validation that opportunity data is complete before AI analysis
   - No check for stale data (e.g., lastActivityAt > 90 days old)
   - No flagging when required related shards are missing

4. **HIGH: Incomplete Explainability**
   - Explainability strings are concatenated but not structured
   - No clear distinction between rule-based vs AI explanations
   - No tracking of which data sources contributed to detection

5. **MEDIUM: Risk Score Calculation Opaqueness**
   - Global score and category scores calculated but formula not documented
   - No visibility into how ponderation weights are applied
   - No audit trail of score calculation steps

### Missing Components

1. **Assumption Tracking System**
   - Need: Track data completeness, staleness, missing relationships
   - Need: Flag when AI outputs are based on incomplete context
   - Need: Surface assumptions to users in UI

2. **Data Quality Validation**
   - Need: Pre-flight checks before risk evaluation
   - Need: Data completeness scoring
   - Need: Staleness detection and warnings

3. **Risk Detection Validation**
   - Need: Validate AI-detected risks against catalog before adding
   - Need: Confidence calibration based on data quality
   - Need: Conflict resolution when multiple detection methods disagree

4. **Audit Trail Enhancement**
   - Need: Full traceability: input data → detection method → output
   - Need: Log all assumptions made during evaluation
   - Need: Track which AI model was used and its version

### Concrete Improvement Recommendations

1. **Add Assumption Tracking**
   ```typescript
   interface RiskEvaluationAssumptions {
     dataCompleteness: number; // 0-1
     dataStaleness: number; // days since last update
     missingRelatedShards: string[]; // Expected but not found
     aiModelAvailable: boolean;
     aiModelVersion?: string;
     contextTokenCount: number;
     contextTruncated: boolean;
   }
   
   interface RiskEvaluation {
     // ... existing fields
     assumptions: RiskEvaluationAssumptions;
   }
   ```

2. **Add Data Quality Pre-Flight Checks**
   ```typescript
   async validateOpportunityDataQuality(
     opportunity: Shard,
     relatedShards: Shard[]
   ): Promise<DataQualityReport> {
     const issues: DataQualityIssue[] = [];
     
     // Check required fields
     if (!opportunity.structuredData.value) {
       issues.push({ type: 'missing_field', field: 'value', severity: 'high' });
     }
     
     // Check staleness
     const daysSinceUpdate = calculateDaysSince(opportunity.updatedAt);
     if (daysSinceUpdate > 30) {
       issues.push({ type: 'stale_data', days: daysSinceUpdate, severity: 'medium' });
     }
     
     // Check missing relationships
     const expectedShards = ['c_account', 'c_contact'];
     const missing = expectedShards.filter(type => 
       !relatedShards.some(s => s.shardTypeId === type)
     );
     
     return { issues, qualityScore: calculateScore(issues) };
   }
   ```

3. **Improve AI Response Validation**
   ```typescript
   private validateDetectedRisk(
     riskData: any,
     catalog: RiskCatalog[]
   ): ValidationResult {
     // Validate riskId exists in catalog
     const riskDef = catalog.find(c => c.riskId === riskData.riskId);
     if (!riskDef) {
       return { valid: false, error: `Risk ID ${riskData.riskId} not in catalog` };
     }
     
     // Validate confidence is reasonable
     if (riskData.confidence < 0 || riskData.confidence > 1) {
       return { valid: false, error: 'Confidence must be 0-1' };
     }
     
     // Validate explanation exists
     if (!riskData.explanation || riskData.explanation.length < 10) {
       return { valid: false, error: 'Explanation too short or missing' };
     }
     
     return { valid: true };
   }
   ```

4. **Add Structured Explainability**
   ```typescript
   interface RiskExplainability {
     detectionMethod: 'rule' | 'ai' | 'historical' | 'semantic';
     confidence: number;
     evidence: {
       sourceShards: string[];
       matchedRules?: string[];
       aiReasoning?: string;
       historicalPatterns?: string[];
     };
     assumptions: string[];
   }
   ```

---

## AI Chat Feature Review

### Design Quality Score: **8/10**

### Architecture Strengths

1. **Comprehensive Grounding System** ✅
   - GroundingService verifies claims against context
   - Citation generation with source references
   - Hallucination detection with severity levels
   - Grounding score calculation (0-1)

2. **Context Assembly** ✅
   - Project-aware context gathering
   - RAG with vector search
   - Token management and truncation
   - Conversation history management

3. **Prompt Injection Prevention** ✅
   - `sanitizeUserInput()` removes injection patterns
   - Applied consistently across entry points
   - Length limits to prevent token exhaustion

4. **Tool/Function Calling** ✅
   - AIToolExecutorService with permission checks
   - Extensible tool system
   - Error handling for tool failures

### Hallucination & Safety Risks

1. **MEDIUM: Grounding Service Optional**
   - GroundingService initialization can fail silently
   - When unavailable, responses have groundingScore: 0 but no warning
   - Users may not realize responses are unverified

2. **MEDIUM: Context Truncation Without Warning**
   - Token limits may truncate context silently
   - No indication to user that context was incomplete
   - May lead to hallucinations from missing context

3. **LOW: Hallucination Detection Limitations**
   - GroundingService detects hallucinations but may miss subtle ones
   - No validation that citations actually support claims
   - Entity hallucination detection exists but may not catch all cases

### Integration Issues

1. **MEDIUM: Risk Analysis Integration Unclear**
   - AI Chat can access Risk Analysis outputs via context
   - But no explicit integration point documented
   - Unclear if Chat can trigger risk evaluations

2. **LOW: Tool Permission System Incomplete**
   - Permission checking framework exists but not fully implemented
   - Some tools available without proper authorization
   - No audit trail for tool executions

3. **LOW: Conversation Context Limits**
   - Conversation history token management exists
   - But no clear strategy for very long conversations
   - May lose important context over time

### Concrete Improvement Recommendations

1. **Make Grounding Mandatory or Explicit**
   ```typescript
   // Option 1: Fail fast if grounding unavailable
   if (!this.groundingService) {
     throw new Error('Grounding service required for AI Chat');
   }
   
   // Option 2: Explicit warning in response
   if (!this.groundingService) {
     response.warnings.push({
       type: 'ungrounded_response',
       message: 'Response could not be verified against sources',
       severity: 'high'
     });
   }
   ```

2. **Add Context Quality Indicators**
   ```typescript
   interface ContextQuality {
     totalTokens: number;
     truncated: boolean;
     sourceCount: number;
     averageRelevance: number;
     missingExpectedSources: string[];
   }
   
   // Include in response
   response.metadata = {
     contextQuality,
     groundingScore,
     warnings: contextQuality.truncated ? ['Context was truncated'] : []
   };
   ```

3. **Improve Citation Validation**
   ```typescript
   // In GroundingService, validate citations actually support claims
   private async validateCitation(
     claim: string,
     citation: Citation,
     context: AssembledContext
   ): Promise<boolean> {
     const source = context.related.find(s => s.id === citation.sourceId);
     if (!source) return false;
     
     // Use semantic similarity to verify claim is actually in source
     const similarity = await this.calculateSimilarity(claim, source.content);
     return similarity > 0.7; // Threshold for valid citation
   }
   ```

4. **Add Explicit Risk Analysis Integration**
   ```typescript
   // In InsightService, add risk analysis tool
   this.toolExecutor.registerTool({
     name: 'get_risk_analysis',
     description: 'Get risk analysis for an opportunity',
     execute: async (args, context) => {
       const { opportunityId } = args;
       const evaluation = await this.riskEvaluationService.evaluateOpportunity(
         opportunityId,
         context.tenantId,
         context.userId
       );
       return evaluation;
     },
     requiresPermission: 'risk:read'
   });
   ```

---

## AI Integration Findings

### Prompting Issues

1. **GOOD: Prompt Hierarchy** ✅
   - System → Tenant → Project → User hierarchy
   - PromptResolverService handles resolution
   - A/B testing support

2. **MEDIUM: Prompt Injection Prevention** ✅
   - `sanitizeUserInput()` removes common patterns
   - But may not catch all sophisticated attacks
   - No validation that sanitization actually worked

3. **LOW: Prompt Template Management**
   - Templates exist but not all prompts use templates
   - Some hardcoded prompts in services
   - No versioning for prompt changes

### Tool Usage Issues

1. **MEDIUM: Permission Checking Incomplete**
   - Framework exists but not all tools check permissions
   - No audit trail for permission denials
   - Tools may expose sensitive data without proper checks

2. **LOW: Tool Error Handling**
   - Tool failures return errors but don't always surface to user
   - No retry logic for transient failures
   - No circuit breaker for failing tools

### Context Management Issues

1. **MEDIUM: Context Assembly Edge Cases**
   - No handling when context is completely empty
   - Token truncation may remove critical information
   - No fallback when vector search returns no results

2. **LOW: Context Caching**
   - Context assembly is cached but cache invalidation unclear
   - May serve stale context after data updates
   - No cache warming strategy

---

## Security & Data Concerns

### Critical Risks

1. **Data Leakage Across Tenants**
   - **Status:** ✅ **PROTECTED**
   - Partition keys (tenantId) ensure isolation
   - All queries filtered by tenantId
   - No evidence of cross-tenant data access

2. **Prompt Injection**
   - **Status:** ✅ **PROTECTED** (with caveats)
   - `sanitizeUserInput()` removes common patterns
   - Applied consistently across entry points
   - **Caveat:** May not catch all sophisticated attacks

3. **Sensitive Data in AI Context**
   - **Status:** ⚠️ **PARTIAL**
   - No explicit filtering of sensitive fields before AI processing
   - User data, account data included in context without masking
   - No PII detection or redaction

### Medium Risks

1. **Tool Permission Escalation**
   - **Status:** ⚠️ **PARTIAL**
   - Permission checking framework exists but incomplete
   - Some tools may be accessible without proper authorization
   - No audit trail for tool executions

2. **AI Model Selection Security**
   - **Status:** ✅ **SAFE**
   - Model selection based on capability/cost, not security
   - No evidence of security vulnerabilities in selection

3. **Context Data Exposure**
   - **Status:** ⚠️ **PARTIAL**
   - Context includes full shard data without field-level filtering
   - No ACL checking before including shards in context
   - May expose data user doesn't have permission to see

### Low Risks

1. **Rate Limiting**
   - **Status:** ✅ **IMPLEMENTED**
   - Rate limiting middleware exists
   - Redis-based rate limiting

2. **Error Message Information Leakage**
   - **Status:** ✅ **SAFE**
   - Error messages don't expose sensitive data
   - Stack traces not exposed to users

3. **Audit Logging**
   - **Status:** ⚠️ **PARTIAL**
   - Monitoring events tracked but not comprehensive audit log
   - No immutable audit trail
   - No compliance-ready audit logging

---

## Actionable Recommendations

### High-Impact Fixes (Must-Do)

1. **Add Assumption Tracking to Risk Analysis**
   - Track data completeness, staleness, missing relationships
   - Surface assumptions in UI
   - Flag when AI outputs are based on incomplete data
   - **Effort:** 2-3 days
   - **Impact:** Critical for trust and explainability

2. **Improve AI Response Validation**
   - Validate AI-detected risks against catalog
   - Reject invalid risks instead of silently failing
   - Add structured error handling for parsing failures
   - **Effort:** 1-2 days
   - **Impact:** Prevents incorrect risk detections

3. **Add Data Quality Pre-Flight Checks**
   - Validate opportunity data before risk evaluation
   - Check for stale data and missing relationships
   - Return quality score with evaluation
   - **Effort:** 2-3 days
   - **Impact:** Prevents garbage-in-garbage-out

4. **Make Grounding Explicit or Mandatory**
   - Either require grounding service or add explicit warnings
   - Surface grounding scores to users
   - Warn when responses are unverified
   - **Effort:** 1 day
   - **Impact:** Prevents users from trusting unverified responses

5. **Add Context Quality Indicators**
   - Track context completeness and truncation
   - Surface quality metrics to users
   - Warn when context is insufficient
   - **Effort:** 1-2 days
   - **Impact:** Prevents hallucinations from missing context

### Medium-Term Improvements

1. **Complete Tool Permission System**
   - Implement full permission checking for all tools
   - Add audit trail for tool executions
   - Add permission denial logging
   - **Effort:** 3-5 days

2. **Add PII Detection and Redaction**
   - Detect PII in context before AI processing
   - Redact sensitive fields automatically
   - Log when redaction occurs
   - **Effort:** 2-3 days

3. **Enhance Audit Trail**
   - Add comprehensive audit logging
   - Track all AI interactions with full context
   - Make audit logs immutable
   - **Effort:** 3-5 days

4. **Improve Context Assembly Edge Cases**
   - Handle empty context gracefully
   - Add fallback strategies when vector search fails
   - Warn users when context is insufficient
   - **Effort:** 2-3 days

5. **Add Citation Validation**
   - Verify citations actually support claims
   - Use semantic similarity to validate
   - Reject invalid citations
   - **Effort:** 2-3 days

### Optional Enhancements

1. **Prompt Template Versioning**
   - Version all prompts
   - Track prompt changes over time
   - A/B test prompt improvements
   - **Effort:** 2-3 days

2. **Risk Score Calculation Transparency**
   - Document score calculation formulas
   - Add explainability for score components
   - Show score breakdown in UI
   - **Effort:** 1-2 days

3. **Context Cache Warming**
   - Pre-warm context cache for common queries
   - Invalidate cache on data updates
   - Add cache hit/miss metrics
   - **Effort:** 2-3 days

---

## Final Verdict

### Is the System Production-Ready?

**Status:** ⚠️ **MOSTLY, with Critical Fixes Required**

The system has a solid architectural foundation and is **capable of delivering high-quality outputs**, but requires addressing the critical gaps identified above before production deployment.

### What Would Break First Under Scale or Real Users?

1. **AI Response Parsing Failures**
   - When AI returns unexpected formats, parsing fails silently
   - Risk Analysis may miss risks or return incorrect data
   - **Impact:** High - incorrect risk assessments

2. **Context Assembly Under Load**
   - Vector search may become slow with large datasets
   - Token truncation may remove critical context
   - **Impact:** Medium - degraded AI responses

3. **Missing Data Quality Checks**
   - Incomplete or stale data leads to incorrect risk evaluations
   - No warnings to users about data quality issues
   - **Impact:** High - users make decisions on bad data

4. **Grounding Service Failures**
   - When grounding unavailable, responses are unverified
   - Users may not realize responses are unreliable
   - **Impact:** Medium - trust issues

### Confidence Level in Risk Analysis and AI Chat Outputs

**Risk Analysis:** **7/10**
- Rule-based detection: **9/10** (deterministic, reliable)
- AI-powered detection: **6/10** (fragile parsing, no assumption tracking)
- Historical patterns: **7/10** (good but depends on data quality)
- **Overall:** Good foundation but needs assumption tracking and validation

**AI Chat:** **8/10**
- Grounding system: **8/10** (comprehensive but optional)
- Context assembly: **7/10** (good but edge cases not handled)
- Hallucination detection: **7/10** (exists but may miss subtle cases)
- **Overall:** Strong system but needs explicit quality indicators

### Final Recommendation

**Proceed with production deployment after addressing:**
1. ✅ Assumption tracking in Risk Analysis
2. ✅ AI response validation
3. ✅ Data quality pre-flight checks
4. ✅ Grounding service explicit warnings
5. ✅ Context quality indicators

**These fixes are critical for:**
- User trust and explainability
- Preventing incorrect decisions
- Compliance and auditability
- System reliability

---

## Appendix: Code Examples of Issues

### Issue 1: Missing Assumption Tracking
**Location:** `apps/api/src/services/risk-evaluation.service.ts:510-725`

```typescript
// Current: No assumption tracking
private async detectRisksByAI(...): Promise<DetectedRisk[]> {
  // ... builds context
  const response = await this.insightService.generate(...);
  // ... parses response
  // ❌ No tracking of:
  // - Was data complete?
  // - Were related shards available?
  // - Was AI model available?
  // - What assumptions were made?
}
```

### Issue 2: Fragile AI Response Parsing
**Location:** `apps/api/src/services/risk-evaluation.service.ts:633-714`

```typescript
// Current: Multiple fallback parsers, no validation
try {
  parsedContent = JSON.parse(insightResponse.content);
} catch {
  const jsonMatch = insightResponse.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  // ... more fallbacks
  // ❌ No validation that parsed risks match catalog
  // ❌ Silent failures if all parsing fails
}
```

### Issue 3: Optional Grounding Service
**Location:** `apps/api/src/routes/index.ts:1485-1501`

```typescript
// Current: Grounding service optional, fails silently
try {
  groundingService = new GroundingService(llmAdapter);
} catch (err) {
  server.log.warn({ err }, '⚠️ Grounding Service initialization failed');
  // ❌ Continues without grounding, no warning to users
}
```

---

**End of Report**
