---
name: Update Implementation Plan with All Refinements
overview: Update UPDATED_PLAN_STEPS.md to incorporate all refinements from Plan Execution.md answers, add three critical missing sections as new steps, enhance existing steps with detailed requirements, and add UI requirement for Shadcn Default Components.
todos: []
---

# Update Implementation Plan with All Refinements

## Overview

Update [UPDATED_PLAN_STEPS.md](UPDATED_PLAN_STEPS.md) to incorporate all refinements and critical additions from the Plan Execution.md specifications and user feedback.

## UI Requirement (MANDATORY)

**UI must always use default Shadcn Default Components** - All UI components must use Shadcn UI default components, not custom implementations. This applies to all renderer components.

## Changes Required

### A. Missing Capabilities That MUST Be Added (New Steps)

These are hard gaps. Without them, correctness cannot be guaranteed.

#### Step 178: Implement `StepCoverageVerifier` - Verify requirement-to-step mapping (CRITICAL)

- **Location**: `src/core/planning/StepCoverageVerifier.ts`
- **Dependencies**: step-36 (PlanGenerator), step-86 (IntentInterpreter)
- **Key Requirements**:
- **Requirement ↔ step ↔ artifact mapping**: Verify every requirement → ≥1 plan step, every plan step → ≥1 artifact or validation
- **Detection of**:
 - Orphan requirements (requirements with no steps)
 - Orphan steps (steps with no requirements)
 - Unreachable steps
 - Circular dependencies
- **Validation checks**:
 - All user requirements mapped to steps
 - All steps have clear purpose (artifact or validation)
 - No circular dependencies
 - No unreachable steps
- **Critical Rule**: Fail if coverage is incomplete
- **Why**: This is the primary defense against missing steps

#### Step 179: Implement `ExecutionCompletionValidator` - Define completion criteria (CRITICAL)

- **Location**: `src/core/execution/ExecutionCompletionValidator.ts`
- **Dependencies**: step-45 (ExecutionEngine), step-42 (ValidationService)
- **Key Requirements**:
- **Completion requires ALL**:
 - Steps executed
 - Invariants valid
 - Tests passed
 - Artifacts match declarations
 - No unresolved warnings
 - Final state matches plan goals
 - All validation gates passed
- **Critical Rule**: Compilation success ≠ completion
- **After execution validation**:
 - Rebuild dependency graph
 - Re-run invariants
 - Re-run tests
 - Compare final state vs plan goals
 - Validate all artifacts
 - Check for unexpected changes
- **If any mismatch**: Execution considered failed, even if code compiles

#### Step 180: Implement `UnexpectedChangeDetector` - Forbid silent success (CRITICAL)

- **Location**: `src/core/execution/UnexpectedChangeDetector.ts`
- **Dependencies**: step-89 (ChangeGraphBuilder), step-45 (ExecutionEngine)
- **Key Requirements**:
- **Detect**:
 - Undeclared files (new files not in artifact ledger)
 - Extra diffs (beyond declared artifacts)
 - Unplanned symbol changes
 - Side effects outside declared artifacts
 - Unplanned behavior
- **Hard Rule**: Stop execution immediately on detection
- **On detection**:
 - Stop execution immediately
 - Log unexpected change
 - Rollback to last checkpoint
 - Report to user: what was unexpected, why it's a problem, what should have happened
 - Ask user for resolution
- **Never silently accept unexpected changes**

### B. Required Updates to Existing Steps (Corrections & Strengthening)

These steps exist but are insufficient as written.

#### 4. Execution Recovery & State Persistence (Step 16 / ExecutionCheckpointSystem)

**Needs update**:

- **WAL-style append-only persistence**: Never overwrite, always append (WAL-style)
- **Verify on recovery**:
- Plan hash
- Execution envelope hash
- Agent versions
- **Hard rule**: Hash mismatch → refuse execution
- **Recovery state must include**: Current step ID, plan hash, execution envelope, checkpoint ID, agent completion status, agent versions, validation results, invariant state, artifact ledger

#### 5. Agent Timeout Handling (Step 15 / Agent System)

**Needs update**:

- **Timeout classification** (must classify reason):
- Model stall
- Deadlock
- Resource exhaustion
- External dependency failure
- **Different causes → different recovery paths**
- **Retry rules**:
- Retry only if: Agent is stateless, no side effects, inputs unchanged
- Timeout ≠ retry unless failure is provably non-semantic
- Level 2 agents → no retry (fail fast)
- **Default timeouts**:
- Level 0: No timeout (informational)
- Level 1: Configurable per agent (30s-5min)
- Level 2: Strict timeout (10s-1min)

#### 6. Non-Goals Enforcement (Step 156)

**Needs update**:

- **Artifact-level enforcement** (not intent-only)
- **Example**: "Do not modify auth" blocks even formatting changes to auth files
- **Enforcement**: Check at artifact level during execution, not just intent during planning
- **Validation**: Every non-goal must be checked against actual artifacts, not just declared intent

#### 7. Invariant Validation (Step 163)

**Needs update**:

- **Invariants must be**:
- Deterministic
- Cheap
- Side-effect free
- **If invariant is expensive**: It does not belong in runtime enforcement
- **Add violation tracking**:
- Which invariant
- Which step caused it
- When introduced
- **Runtime checks**: Only critical paths (balance safety and performance)
- **Violation handling**: Fail fast for critical invariants, log and continue for non-critical (with user notification)

#### 8. Semantic Change Classification (Step 166)

**Needs update**:

- **If reclassification occurs**:
- Full re-validation
- Risk re-evaluation
- User re-approval if risk increases
- **Hard rule**: Never silently downgrade severity (e.g., "non-breaking" → "breaking")
- **Validation**: Compare actual behavior vs planned behavior after execution
- **If actual change doesn't match classification**: Block finalization

#### 9. Test Intent Verification (Step 168)

**Needs correction**:

- **Upgrade agent**: Level 1 → Level 2 (Critical)
- **Invalid tests invalidate the entire plan** (not just advisory)
- **Add requirement**: Tests must explicitly declare:
- Intended behavior
- Invariant being tested
- Meaning of failure
- **Detection methods**: Static analysis, runtime analysis, LLM-based analysis

#### 10. Learning Quarantine (Step 170)

**Needs update**:

- **Learning promotion must be**:
- Versioned (track learning version)
- Reversible (can unlearn/rollback)
- Audited (full audit trail)
- **Hard rule**: Learning must NEVER:
- Affect execution mid-run
- Affect retries
- Affect validation thresholds
- **Queue learning**: For post-execution validation (don't interrupt execution flow)
- **Shadow mode**: Test learning without using for decisions

#### 11. Deterministic Execution Envelope (Step 176)

**Needs update**:

- **Include hashes for**:
- Tool versions
- Rule versions
- Configuration hashes
- Model version hash
- Prompt template hash
- Context snapshot hash
- Toolchain version hash
- **Reason**: Without these, determinism is fictional
- **Envelope changes mid-execution**: Abort immediately (safety)

#### 12. Parallel Execution (Step 89 / ChangeGraphBuilder)

**Needs update**:

- **Require explicit declaration**:
- Read set (what files/symbols are read)
- Write set (what files/symbols are written)
- Symbol ownership (which symbols are owned by this step)
- **Rule**: No declaration → no parallelization
- **Conflict resolution**: If parallel steps conflict, abort all, rollback, ask user (never auto-merge)

#### 13. Plan Modification During Execution (Step 10 / Plan Modification)

**Needs update**:

- **Any modification**:
- Invalidates all future steps
- Requires full re-validation
- **Hard rule**: Any modification invalidates all future steps until re-validated
- **Modification process**: Pause execution, invalidate future steps, re-validate new/modified steps, ask user to confirm

### C. Planning Flow Updates (Structural)

**Must insert in correct order**:

1. **Step Coverage Verification (Step 178)** → Before execution begins

- Verify requirement-to-step mapping
- Detect orphan requirements/steps
- Check for circular dependencies

2. **Unexpected Change Detection (Step 180)** → During execution

- Monitor for undeclared files
- Detect extra diffs
- Check for unplanned symbol changes
- Stop execution immediately on detection

3. **Execution Completion Validation (Step 179)** → After execution completes

- Validate all completion criteria
- Rebuild dependency graph
- Re-run invariants and tests
- Compare final state vs plan goals

**Without this ordering, enforcement is inconsistent.**

### D. Priority Corrections

**Must move to Phase 1 (Critical Foundations)** - These are correctness primitives, not enhancements:

- **Step 178** – Step Coverage Verification (CRITICAL)
- **Step 179** – Execution Completion Validator (CRITICAL)
- **Step 180** – Unexpected Change Detector (CRITICAL)

These must be implemented in Phase 1, not Phase 2 or Phase 3.

## Files to Modify

1. [UPDATED_PLAN_STEPS.md](UPDATED_PLAN_STEPS.md)

- Add UI requirement section: All UI components must use Shadcn Default Components
- Enhance existing steps: 16, 15, 156, 163, 166, 168, 170, 176, 89, 10 (with all detailed refinements)
- Add new critical steps: 178, 179, 180 (with full requirements)
- Update planning flow section (insert steps in correct order: Coverage → Execution → Completion)
- Update implementation priority section (move 178, 179, 180 to Phase 1)

## Implementation Notes

- **UI Requirement**: All UI components must use Shadcn Default Components (MANDATORY)
- All refinements are based on Plan Execution.md specifications and user feedback
- Three critical sections (178, 179, 180) are correctness primitives, not enhancements
- Existing steps need enhancement with detailed requirements, not replacement
- Maintain backward compatibility with existing step numbering
- Steps 178, 179, 180 are CRITICAL and must be in Phase 1
- Planning flow must include steps in correct order: Coverage → Execution → Completion
- Test Intent Agent (Step 168) must be corrected to Level 2 (Critical), not Level 1