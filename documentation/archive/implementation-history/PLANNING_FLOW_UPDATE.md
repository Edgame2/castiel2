# Planning Flow Update: Anticipating Ambiguity & Problems at Planning Phase

## Key Principle

**"The ambiguity, problems must be anticipated at the planning phase."**

All ambiguity detection, problem identification, risk assessment, and impact analysis must happen **DURING planning**, not after execution begins.

## Updated Flow Architecture

### OLD Flow (Problematic)
```
User Request (string) 
  → PlanGenerator 
    → Generate Plan 
      → Execute Plan 
        → Discover Problems ❌ (TOO LATE!)
```

### NEW Flow (Correct)
```
User Request (string)
  ↓
IntentInterpreter (Step 86)
  → Structured Intent Spec (JSON Schema)
  ↓
RequirementDisambiguationAgent (Step 87)
  → Detect Ambiguities
  → Ask Clarifying Questions (if critical ambiguity)
  → Resolve Non-Critical Ambiguities (using conventions)
  ↓
IntentSpecValidator (Step 88)
  → Validate Intent
  → Detect Constraint Conflicts
  → Refuse if Conflicts (prefer no code over wrong code)
  ↓
PlanGenerator (Step 36) + ChangeGraphBuilder (Step 89)
  → Generate Plan
  → Generate Change Graph DURING Planning ✅
  → Track Symbols (Step 90)
  → Analyze Impact (Step 91)
  → Check Change Size (Step 92)
  ↓
ImpactAnalyzer (Step 91)
  → Dependency Impact Analysis
  → Backward Compatibility Analysis
  → Multi-layer Analysis (API, types, symbols, contracts, tests)
  ↓
RiskClassifier (Step 154)
  → Classify Risk Per Change
  → Rule-based + User Overrides
  → Risk Factors: API changes, security, data schema, test coverage, novel patterns
  ↓
ConfidenceScorer (Step 153)
  → Score Confidence Per Change
  → Factors: tests, type safety, rule violations, novelty
  ↓
RefusalSystem (Step 121)
  → Check Refusal Conditions
  → Incomplete Requirements? → REFUSE
  → Conflicting Constraints? → REFUSE
  → Unknown Runtime? → REFUSE
  → Multiple Architectures? → REFUSE
  → Low Confidence? → REFUSE or ASK
  ↓
[IF ALL CHECKS PASS]
  ↓
Execution (Step 45)
  → AST Patch Generation (Step 93-96)
  → Contract-First Generation (Step 97-100)
  → Compile Gate & Auto-Fix (Step 112-116)
  → Diff-Aware Repair (Step 125-128)
  ↓
Post-Execution Validation
  → Compare Actual Changes vs Planned Changes (Step 89)
  → If Drift Detected → Block Finalization → Investigate → Regenerate or Refuse
```

## Critical Components Added to Planning Phase

### 1. Pre-Planning: Intent & Ambiguity Resolution

**Step 86: IntentInterpreter**
- Converts raw user request to structured intent spec (JSON Schema)
- Output: `StructuredIntentSpec` with goal, non-goals, scope, constraints, language/framework/versions

**Step 87: RequirementDisambiguationAgent**
- **Hybrid detection**: Rule-based first (deterministic), LLM second (semantic)
- **Critical ambiguity triggers clarification**: Architecture, security, persistence, public APIs, backward compatibility, data loss risk
- **Non-critical ambiguity auto-resolved**: Naming, logging format, internal structure (using project conventions)
- **Learning**: Conservative, project-specific only, never generalizes across projects

**Step 88: IntentSpecValidator**
- Validates structured intent
- Detects constraint conflicts
- **Refusal by default** if conflicts (explicit user constraints win → project constraints → auto-resolve only if safe/reversible/low-risk)
- **Always persists** intent specs (audit, reproducibility, debugging, regression analysis)

### 2. During Planning: Change Graph & Impact Analysis

**Step 89: ChangeGraphBuilder** (CRITICAL - DURING PLANNING)
- **Generates change graph TWICE**:
  1. Initial graph during planning (expected changes)
  2. Final graph after execution (actual changes)
  3. Diff them to detect drift
- **Explicit tracking**:
  - Files to modify
  - Symbols: Added, Modified, Deleted
  - Dependencies
  - Tests required
- **Impact analysis**:
  - Dependency impact
  - Backward compatibility (multi-layer: API surface, types, symbols, contracts, tests)
  - Risk classification
  - Change size limits (hierarchical: global → per-file → per-change-type)
- **Post-execution validation**: If actual ≠ planned → block finalization → investigate → regenerate or refuse

**Step 90: SymbolTracker**
- Tracks all symbols per change
- Integrates with change graph

**Step 91: ImpactAnalyzer**
- Multi-layer backward compatibility analysis
- Dependency impact analysis
- Risk classification

**Step 92: ChangeSizeLimiter**
- Hierarchical limits (global, per-file, per-change-type)
- Auto-split if exceeds limit
- Refuse if split not possible and user refuses

### 3. During Planning: Risk & Confidence Assessment

**Step 154: RiskClassifier**
- Rule-based core + user overrides
- Risk factors: public API changes, security boundaries, data schema changes, test coverage delta, novel patterns
- **Happens DURING planning**, not after

**Step 153: ConfidenceScorer**
- Scores confidence per change
- Factors: tests passed, type safety, rule violations, novelty
- Low confidence → ask user or refuse
- **Happens DURING planning**, not after

### 4. Pre-Execution: Final Refusal Check

**Step 121: RefusalSystem**
- Checks all refusal conditions BEFORE execution
- Conditions:
  - Incomplete requirements → REFUSE
  - Conflicting constraints → REFUSE
  - Unknown runtime environment → REFUSE
  - Multiple valid architectures → REFUSE
  - Low confidence (below threshold) → REFUSE or ASK
- Explains refusal precisely
- Offers resolution paths

## Integration Points

### PlanGenerator Enhancement

The `PlanGenerator` (Step 36) must be enhanced to:

1. **Receive Structured Intent** (not raw string)
   - Input: `StructuredIntentSpec` from IntentInterpreter
   - Not: `PlanningRequest.userRequest: string`

2. **Generate Change Graph DURING Planning**
   - Call `ChangeGraphBuilder` as part of plan generation
   - Include change graph in plan metadata
   - Validate change graph before returning plan

3. **Include Risk & Confidence in Plan**
   - Call `RiskClassifier` during planning
   - Call `ConfidenceScorer` during planning
   - Include risk and confidence scores in plan metadata

4. **Check Refusal Conditions**
   - Call `RefusalSystem` before returning plan
   - Refuse if conditions not met

### PlanningRequest Update

The `PlanningRequest` interface must be updated:

```typescript
// OLD (WRONG)
export interface PlanningRequest {
  userRequest: string;  // ❌ Raw string
  context?: any;
  strategy?: 'single' | 'iterative' | 'hierarchical';
  aspects?: ('architecture' | 'implementation' | 'coding' | 'testing')[];
}

// NEW (CORRECT)
export interface PlanningRequest {
  intentSpec: StructuredIntentSpec;  // ✅ Structured intent
  context?: any;
  strategy?: 'single' | 'iterative' | 'hierarchical';
  aspects?: ('architecture' | 'implementation' | 'coding' | 'testing')[];
  changeGraph?: ChangeGraph;  // ✅ Generated during planning
  riskAssessment?: RiskAssessment;  // ✅ Generated during planning
  confidenceScore?: number;  // ✅ Generated during planning
}
```

### Execution Flow Update

The execution flow must check:

1. **Before Execution Starts**:
   - Plan has valid change graph ✅
   - Plan has risk assessment ✅
   - Plan has confidence score ✅
   - No refusal conditions met ✅

2. **During Execution**:
   - Track actual changes
   - Compare with planned change graph

3. **After Execution**:
   - Generate final change graph
   - Compare actual vs planned
   - If drift detected → block finalization → investigate → regenerate or refuse

## Benefits of This Approach

1. **Early Problem Detection**: Problems identified during planning, not after execution
2. **Reduced Waste**: Don't execute plans that will fail
3. **Better Planning**: Plans include change graphs, risk assessment, confidence scores
4. **Audit Trail**: All decisions documented during planning phase
5. **User Trust**: System refuses when uncertain, explains why, offers solutions
6. **Quality Guarantee**: No broken code reaches user (compile gate, auto-fix, refusal)

## Implementation Priority

### Phase 1: Critical (Weeks 1-4)
- Steps 86-88: Intent & Ambiguity Resolution (BEFORE planning)
- Step 89: Change Graph Builder (DURING planning)
- Steps 90-92: Symbol Tracking & Impact Analysis (DURING planning)
- Steps 153-154: Risk & Confidence (DURING planning)
- Step 121: Refusal System (BEFORE execution)

### Phase 2: Execution Quality (Weeks 5-8)
- Steps 93-96: AST Patch Generation
- Steps 97-100: Contract-First Generation
- Steps 112-116: Compile Gate & Auto-Fix
- Steps 125-128: Diff-Aware Repair

### Phase 3: Advanced Features (Weeks 9-12)
- Steps 101-111: Semantic Rules & Compiler-Backed Index
- Steps 117-120: Deterministic Generation
- Steps 129-132: Bug Memory
- Steps 137-140: Structured Outputs
- Steps 145-148: Code Explanations

## Summary

The key change is that **planning is no longer just generating steps**. Planning now includes:

1. **Intent interpretation** (structured spec)
2. **Ambiguity resolution** (critical only)
3. **Change graph generation** (expected changes)
4. **Impact analysis** (dependencies, compatibility)
5. **Risk assessment** (per change)
6. **Confidence scoring** (per change)
7. **Refusal checks** (before execution)

All of this happens **DURING planning**, ensuring that when execution begins, we already know:
- What will change
- What the risks are
- What the confidence level is
- Whether we should proceed

This transforms planning from a "best guess" into a "validated, risk-assessed, confidence-scored plan" that can be safely executed.
