Core Principle

The IDE must provide steps recommendation. 
Must use steps templates to make easy for user to create the plan. Research best practices automatically, Build the plan with all the necessary steps and order.
The IDE must be able to recover and continue working is the IDE has been interrupted crashed. 
User can add additional steps in the plan. IDE must be able to identify what has been already implemented, search best practices guive recommendations for the additional steps.

Plans are contracts. Execution is illegal unless every step is verified, ordered, and validated.

1. Plan as an Executable Contract (Not Text)
1.1 Structured Plan Format (Mandatory)

Plans must be:

Machine-verifiable

Immutable once approved

Step-addressable

Required structure (conceptual):

Global assumptions

Global invariants

Ordered steps with:

Step ID

Preconditions

Actions

Expected artifacts

Postconditions

Rollback instructions

Failure severity (block / retry / ask)

❗ The IDE must refuse execution if a plan step is not fully specified.

2. Plan Locking & Hashing
2.1 Immutable Execution Plan

Before execution:

Hash entire plan

Lock it

Store hash in execution context

Compute Deterministic Execution Envelope:
- Model version hash
- Prompt template hash
- Context snapshot hash
- Toolchain version hash

Store envelope in execution context

During execution:

Every step verifies plan hash

Every step verifies execution envelope

Any mismatch → immediate abort

This prevents silent plan drift or mid-execution reinterpretation.

2.2 Execution Lock-In Point

After all validations pass:
- Change graph validated
- Confidence score validated
- All Level ≥1 agents completed
- All Level 2 gates passed
- Plan hash computed and locked

After lock-in:
- No more assumptions allowed
- No more ambiguity resolution
- No more plan modifications
- Execution proceeds with fixed plan

Lock-in can only be reversed if:
- Critical error detected
- User explicitly requests (with full re-validation)

3. Step-by-Step Execution Guardrails
3.1 Strict Step Sequencing

Execution rules:

Steps must execute in declared order

A step cannot run unless:

All previous steps are marked completed

Preconditions are re-verified

Parallel steps must declare independence explicitly:
- **Read set**: What files/symbols are read
- **Write set**: What files/symbols are written
- **Symbol ownership**: Which symbols are owned by this step
- If not declared → cannot be parallelized

No speculative execution. No "best effort."

3.2 Parallel Step Conflict Resolution

If parallel steps conflict:
- Abort all parallel steps
- Rollback to before parallel execution
- Ask user to resolve
- Never auto-merge conflicts

4. Preconditions & Postconditions Enforcement
4.1 Preconditions (Before Step)

Before executing a step:

Validate:

Files exist

APIs exist

Types compile

Required context loaded

If any precondition fails → stop and ask

4.2 Postconditions (After Step)

After execution:

Validate:

Expected files changed

Expected symbols exist

No unexpected files modified

No invariant violated

A step is not complete unless postconditions pass.

5. Artifact Accounting (Critical)
5.1 Explicit Artifact Ledger

For every step:

Declare:

Files created

Files modified

Symbols added/removed

After execution:

Diff actual artifacts vs declared artifacts

Rules:

Extra changes → failure

Missing changes → failure

This single rule prevents 80% of “The IDE skipped something” bugs.

6. Execution Checkpoints & Rollback
6.1 Mandatory Checkpoints

Before every step:

Snapshot working tree

Snapshot dependency graph

Snapshot execution envelope (model version, prompt template, context, toolchain hashes)

Store checkpoint with plan hash

On failure:

Classify rollback type:
- **Reversible**: Code changes, config (full rollback)
- **Compensatable**: DB migrations with down scripts (compensatory rollback)
- **Irreversible**: External APIs, file deletions (no rollback - must refuse unless user explicitly accepted)

Auto rollback to last checkpoint (if reversible/compensatable)

Re-verify invariants

Never "fix forward" silently.

6.2 Rollback Classification

Each step must declare rollback type:
- Reversible operations: Can be fully rolled back
- Compensatable operations: Require down scripts/migration reversal
- Irreversible operations: Cannot be rolled back (must refuse unless user explicitly accepts)

Planning must refuse irreversible steps by default.

7. Multi-Level Validation Gates

Each step passes through multiple mandatory gates (executed in order):

**Pre-Execution Gates (Before Step Execution):**
- **Specification Completeness Gate**: 100% spec completeness for public surfaces (inputs, outputs, error semantics, side-effects, persistence boundaries, sync/async behavior)
- **Design Quality Gate** (Level 2 - Critical): Cohesion, coupling, layer violations, architectural drift, pattern alignment
- **Cross-Agent Consistency Gate** (Level 2 - Critical): All agents must be consistent (planning vs execution, test vs contract, type vs runtime)
- **Semantic Change Classification Gate**: Changes classified as behavior-preserving/extending/modifying/breaking (behavior-modifying/breaking require explicit approval)

**Per-Step Execution Gates:**
- **Syntactic Gate**: Code parses
- **Type Gate**: Type-check passes
- **Invariant Gate**: No invariant violations (invariants must be proven/tested, not just satisfied)
  - Critical invariants must be: cheap, deterministic, side-effect free
  - If invariant is expensive, it does not belong in runtime enforcement
  - Invariant violations must include: which invariant, when it was introduced, which step caused it
- **Semantic Gate**: No semantic rule violations
- **Test Intent Gate** (Level 2 - Critical): Tests fail before fix, pass after fix, assert intended behavior (not implementation details)
  - Invalid tests invalidate the entire plan
  - Tests must declare intent explicitly: what behavior, what invariant, what failure means
- **Intent Gate**: Behavior matches plan intent
- **Non-Goals Gate**: No violation of declared non-goals
  - Non-goals must be explicitly enumerated
  - Checked at artifact level, not just intent level
  - Example: "Do not modify auth" must block even a formatting-only auth change

**Post-Execution Gates (After Step Execution):**
- **Artifact Validation Gate**: Actual artifacts match declared artifacts
- **Semantic Classification Validation**: Actual semantic change matches planned classification
  - If actual change doesn't match planned classification → block finalization
  - Reclassification must trigger: full plan re-validation, risk re-evaluation, user re-approval (if risk increases)
  - Never silently downgrade "non-breaking" → "breaking"

If any gate fails → step fails. Level 2 gates block planning approval. Level 1 gates block execution advancement.

8. Change Size & Scope Enforcement
8.1 Step-Scoped Change Limits

Each step declares:

Max files

Max lines

Allowed modules

If exceeded:

Abort

Split step

Ask user

Prevents accidental refactors.

9. Execution Telemetry & Traceability
9.1 Step Execution Log

For every step log:

Step ID

Inputs

Outputs

Decisions

Validation results

Logs are:

Structured

Queryable

Immutable

10. Plan Modification During Execution

10.1 Modification Rules

Plans are immutable once execution starts, EXCEPT:
- New steps can be added (after current execution point)
- New steps must: come after current execution point, not modify previous assumptions, pass full planning + validation

**Hard Rule**: Any modification invalidates all future steps until re-validated.

10.2 Modification Process

If user modifies plan during execution:
- Pause execution
- Invalidate all future steps
- Re-validate new/modified steps
- Ask user to confirm
- If confirmed: re-validate entire plan, recompute plan hash, continue from current step
- If not confirmed: abort execution

10.3 User-Added Steps

User can add additional steps in the plan. IDE must:
- Identify what has been already implemented
- Search best practices
- Give recommendations for the additional steps
- Validate new steps pass all gates
- Integrate new steps into plan structure

11. Cross-Step Consistency Validation

After full execution:

Rebuild dependency graph

Re-run invariants

Re-run tests

Compare final state vs plan goals

If mismatch:

Execution considered failed, even if code compiles.

12. Refusal Rules (Non-Negotiable)

The IDE must refuse execution if:

Any step is ambiguous

Preconditions are unmet

Artifacts don't match plan

Validation gates fail

External changes detected

Specification completeness < 100% for public surfaces

Design quality score < threshold

Cross-agent consistency violations detected

Semantic change classification invalid

Test intent verification fails

Invariant violations detected

Non-goals violated

Refusal must follow Human Escalation Protocol:
- **What is blocked**: Clear description
- **Why it's blocked**: Reasoning
- **What evidence exists**: Supporting data
- **Exact decision choices**: Structured choices with consequences (not just yes/no)
- **Consequences of each choice**: What happens for each option
- **Explicit acknowledgment required**: Not just clicking through

User input is appended to plan, rehashed, execution restarts from checkpoint.

13. Self-Check: "Plan Coverage Validation"

Before execution begins, The IDE must answer:

Is every plan step executable?

Is every user requirement mapped to ≥1 step?

Does any step modify undeclared scope?

Are rollback paths defined?

Is every public function fully specified (inputs, outputs, errors, side-effects)?

Are non-goals explicitly declared?

Are invariants defined for public APIs?

Are semantic changes classified?

Are all agents consistent?

Is design quality acceptable?

If any answer is no → refuse.

14. Shadow Execution (Optional but Powerful)

Before real execution:

Simulate changes

Dry-run validation

Predict diffs

Only execute if simulation passes.

15. Human-in-the-Loop Without Loss of Autonomy

When asking the user (following Human Escalation Protocol):

Present:

Current step

What's blocked (clear description)

Why it's blocked (reasoning)

What evidence exists (supporting data)

Exact decision choices (structured, not just yes/no)

Consequences of each choice (what happens)

User input:

Is appended to plan

Rehashed

Execution restarts from checkpoint

Support "remember this choice" with confirmation

Timeout handling: timeout and refuse (safety first, user can retry)

16. Agent Criticality Levels & Execution Guarantees

15.1 Agent Criticality Classification

Agents are classified by criticality:
- **Level 0 (Informational)**: Non-blocking, can report late
- **Level 1 (Advisory)**: Blocks execution advancement, must complete before execution
- **Level 2 (Critical)**: Blocks planning approval, must complete before planning

15.2 Execution Guarantees

Async agents with Level ≥1 must complete before execution lock-in.

15.3 Timeout Handling

Default timeouts:
- Level 0: No timeout (informational)
- Level 1: Configurable per agent (30s-5min)
- Level 2: Strict timeout (10s-1min)

If Level ≥1 agent exceeds timeout:
- Classify timeout reason:
  - Resource exhaustion
  - Deadlock
  - Model stall
  - External dependency failure
- Different causes → different recovery paths
- Fail agent, block pipeline
- Do not proceed with execution

**Critical Rule**: Timeout ≠ retry unless failure is provably non-semantic

Retries allowed only if:
- Agent is stateless
- No side effects occurred
- Inputs are unchanged
- Otherwise → fail fast

Agent failures by level:
- Level 0: Log and continue
- Level 1: Block execution, ask user
- Level 2: Refuse planning, explain why

17. Recovery from Interruption/Crash

16.1 Execution State Persistence

Execution state must be persisted using append-only WAL-style snapshots (never overwritten):
- Current step ID
- Plan hash
- Execution envelope (model version, prompt template, context, toolchain hashes, tool versions, rule versions, configuration hashes)
- Checkpoint ID
- Agent completion status
- Agent versions
- Validation results
- Invariant state
- Artifact ledger

16.2 Recovery Process

On restart:
- Load persisted execution state
- Verify plan hash (if mismatch → refuse execution - cannot resume under mutated plan)
- Verify execution envelope hash (if mismatch → flag non-determinism, refuse)
- Verify agent versions (if mismatch → refuse - agents may have changed)
- Resume from last checkpoint
- Re-verify preconditions
- Continue execution

**Critical Rule**: If recovered state hash ≠ current plan hash → refuse execution

If recovery impossible:
- Rollback to last successful checkpoint
- Re-validate plan
- Ask user for resolution

18. Learning During Execution

17.1 Learning Quarantine

New learning during execution:
- Stored as candidate (not applied)
- Queued for post-execution validation (don't interrupt execution flow)
- Applied only in "shadow mode" (tested but not used for decisions)
- Requires N successful confirmations before promotion (configurable per learning type)
- Explicit promotion to active learning

**Critical Rules**: Learning must never:
- Change agent behavior mid-execution
- Affect retry logic
- Affect validation thresholds

17.2 Learning Promotion

Learning promotion must be:
- Versioned (track learning version)
- Reversible (can unlearn/rollback)
- Audited (full audit trail)

17.3 Learning Boundaries

Forbidden learning:
- User overrides of safety refusals
- Emergency bypasses
- Known incorrect outcomes

Allowed learning:
- Successful executions
- Passing tests
- Explicit user confirmations

19. Deterministic Execution Validation

19.1 Execution Envelope Tracking

Track execution envelope for every step:
- Model version hash
- Prompt template hash
- Context snapshot hash
- Toolchain version hash
- Tool versions
- Rule versions
- Configuration hashes

**Critical**: Without tool versions, rule versions, and config hashes, determinism is illusory.

19.2 Non-Determinism Detection

Compare actual vs planned execution envelope.

If same envelope → different output:
- Flag as non-determinism bug
- Log for investigation
- Refuse execution (if in deterministic mode)

If envelope changes mid-execution:
- Abort immediately (safety) - envelope changes indicate non-determinism

Same envelope → same output is required for deterministic mode.

20. Step Coverage Verification (CRITICAL)

20.1 Coverage Requirements

Before execution begins, verify:

Every requirement → ≥1 plan step

Every plan step → ≥1 artifact or validation

No orphan steps (steps with no requirements)

No orphan requirements (requirements with no steps)

20.2 Coverage Validation

Coverage validation must check:
- All user requirements mapped to steps
- All steps have clear purpose (artifact or validation)
- No circular dependencies
- No unreachable steps

**Critical Rule**: Fail if coverage is incomplete.

21. Execution Completion Definition

21.1 Completion Criteria

Execution is complete only if:

All steps executed

All postconditions satisfied

All invariants hold

No warnings unresolved

Final state matches plan goals

All validation gates passed

All artifacts match declared artifacts

**Critical Rule**: Compilation success alone is not completion.

21.2 Completion Validation

After execution:
- Rebuild dependency graph
- Re-run invariants
- Re-run tests
- Compare final state vs plan goals
- Validate all artifacts
- Check for unexpected changes

If any mismatch:
- Execution considered failed, even if code compiles

22. Silent Success Is Forbidden

22.1 Unexpected Change Detection

If something unexpected happens during execution:
- New file created (not declared)
- Extra diff (beyond declared artifacts)
- Unplanned behavior
- Unexpected symbol changes
- Unplanned side effects

**Critical Rule**: Execution must stop, not "continue successfully".

22.2 Unexpected Change Handling

On detecting unexpected change:
- Stop execution immediately
- Log unexpected change
- Rollback to last checkpoint
- Report to user:
  - What was unexpected
  - Why it's a problem
  - What should have happened
- Ask user for resolution

Never silently accept unexpected changes.

19. Step Coverage Verification (CRITICAL)

19.1 Coverage Requirements

Before execution begins, verify:

Every requirement → ≥1 plan step

Every plan step → ≥1 artifact or validation

No orphan steps (steps with no requirements)

No orphan requirements (requirements with no steps)

19.2 Coverage Validation

Coverage validation must check:
- All user requirements mapped to steps
- All steps have clear purpose (artifact or validation)
- No circular dependencies
- No unreachable steps

**Critical Rule**: Fail if coverage is incomplete.

20. Execution Completion Definition

20.1 Completion Criteria

Execution is complete only if:

All steps executed

All postconditions satisfied

All invariants hold

No warnings unresolved

Final state matches plan goals

All validation gates passed

All artifacts match declared artifacts

**Critical Rule**: Compilation success alone is not completion.

20.2 Completion Validation

After execution:
- Rebuild dependency graph
- Re-run invariants
- Re-run tests
- Compare final state vs plan goals
- Validate all artifacts
- Check for unexpected changes

If any mismatch:
- Execution considered failed, even if code compiles

21. Silent Success Is Forbidden

21.1 Unexpected Change Detection

If something unexpected happens during execution:
- New file created (not declared)
- Extra diff (beyond declared artifacts)
- Unplanned behavior
- Unexpected symbol changes
- Unplanned side effects

**Critical Rule**: Execution must stop, not "continue successfully".

21.2 Unexpected Change Handling

On detecting unexpected change:
- Stop execution immediately
- Log unexpected change
- Rollback to last checkpoint
- Report to user:
  - What was unexpected
  - Why it's a problem
  - What should have happened
- Ask user for resolution

Never silently accept unexpected changes.