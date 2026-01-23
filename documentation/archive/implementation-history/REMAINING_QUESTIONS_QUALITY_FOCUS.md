# Remaining Questions: Quality, Autonomy & Consistency Focus

## Document Purpose

This document contains all remaining questions that must be answered to ensure **quality, autonomy, and consistency** in the IDE implementation. The focus is on **anticipation and planning** - identifying and resolving all ambiguities, architectural decisions, and implementation details **before** coding begins.

**Core Principles**:
- **Quality First**: Every decision must prioritize correctness over speed
- **Autonomy**: System must be able to operate independently with high confidence
- **Consistency**: All code must follow project conventions and patterns
- **Anticipation**: Problems must be identified and resolved during planning, not execution

---

## Table of Contents

1. [Architecture & System Design](#1-architecture--system-design)
2. [Planning Confidence & Ambiguity System](#2-planning-confidence--ambiguity-system)
3. [Specification Completeness Gate](#3-specification-completeness-gate)
4. [Design Quality Gate](#4-design-quality-gate)
5. [Invariant System](#5-invariant-system)
6. [Semantic Change Classification](#6-semantic-change-classification)
7. [Agent Architecture & Criticality](#7-agent-architecture--criticality)
8. [Cross-Agent Consistency](#8-cross-agent-consistency)
9. [Pipeline & Rollback Semantics](#9-pipeline--rollback-semantics)
10. [Test Intent Verification](#10-test-intent-verification)
11. [Learning Quarantine System](#11-learning-quarantine-system)
12. [Human Escalation Protocol](#12-human-escalation-protocol)
13. [Deterministic Execution Envelope](#13-deterministic-execution-envelope)
14. [UI Components & User Experience](#14-ui-components--user-experience)
15. [Database & Persistence](#15-database--persistence)
16. [API Endpoints & IPC Communication](#16-api-endpoints--ipc-communication)
17. [Security & Privacy](#17-security--privacy)
18. [Error Handling & Recovery](#18-error-handling--recovery)
19. [Type System & Type Safety](#19-type-system--type-safety)
20. [Learning System & Bias Control](#20-learning-system--bias-control)
21. [Absolute Prohibitions](#21-absolute-prohibitions)
22. [Best Practices & Research](#22-best-practices--research)
23. [Ambiguities Requiring Resolution](#23-ambiguities-requiring-resolution)
24. [Recommendations & Decisions](#24-recommendations--decisions)

---

## 1. Architecture & System Design

### 1.1 Multi-Agent Architecture

**Q1.1.1**: How should agents communicate with each other?
- [ ] Direct method calls (synchronous, simple)
- [ ] Event bus (asynchronous, decoupled)
- [ ] Message queue (persistent, reliable)
- [ ] Hybrid (sync for critical path, async for parallel work)
- [ ] **Recommendation**: Event bus for decoupling, with synchronous critical path for quality guarantees

**Q1.1.2**: Should agents have their own state or be stateless?
- [ ] Stateless (pure functions, easier to test)
- [ ] Stateful (can learn and adapt)
- [ ] Hybrid (stateless core, stateful learning layer)
- [ ] **Recommendation**: Stateless core for determinism, stateful learning layer for improvement

**Q1.1.3**: How should agent failures cascade?
- [ ] Fail-fast (stop entire pipeline on any agent failure)
- [ ] Graceful degradation (continue with reduced functionality)
- [ ] Retry with backoff (automatic recovery)
- [ ] User intervention required
- [ ] **Recommendation**: Fail-fast for quality-critical agents, graceful degradation for non-critical

**Q1.1.4**: Should agents be versioned independently?
- [ ] Yes, each agent has its own version
- [ ] No, all agents versioned together
- [ ] Major agents versioned, minor agents follow
- [ ] **Recommendation**: Major agents independently versioned, minor agents follow system version

**Q1.1.5**: How should agent execution be monitored?
- [ ] Real-time metrics (performance, success rate)
- [ ] Audit logs (what each agent did)
- [ ] Health checks (agent availability)
- [ ] All of the above
- [ ] **Recommendation**: All of the above, with structured logging for audit trail

### 1.2 Pipeline Architecture

**Q1.2.1**: Should the pipeline support branching (parallel paths)?
- [ ] Yes, full branching support
- [ ] No, linear pipeline only
- [ ] Limited branching (only independent steps)
- [ ] **Recommendation**: Limited branching for independent steps, linear for dependent steps

**Q1.2.2**: How should pipeline state be persisted?
- [ ] In-memory only (fast, but lost on crash)
- [ ] Disk checkpoint (recoverable)
- [ ] Database (queryable, auditable)
- [ ] **Recommendation**: Disk checkpoint for recovery, database for audit trail

**Q1.2.3**: Should pipeline support rollback to any checkpoint?
- [ ] Yes, full rollback support
- [ ] No, only forward progress
- [ ] Limited rollback (only to last N checkpoints)
- [ ] **Recommendation**: Full rollback support for quality and safety

**Q1.2.4**: How should pipeline handle external changes during execution?
- [ ] Detect and stop (safety first)
- [ ] Merge automatically (if safe)
- [ ] Ask user (interactive)
- [ ] **Recommendation**: Detect and stop, ask user for resolution (never auto-merge conflicting semantics)

**Q1.2.5**: When should execution "lock-in" occur (no more assumptions allowed)?
- [ ] Before first code change
- [ ] After plan approval
- [ ] After change graph validation
- [ ] **Recommendation**: After change graph validation and before first code change - this is the "lock-in point" where all assumptions must be resolved

**Q1.2.6**: How should execution lock-in be enforced?
- [ ] Compile-time checks (TypeScript)
- [ ] Runtime validation
- [ ] Both (defense in depth)
- [ ] **Recommendation**: Both - compile-time for development, runtime for safety guarantees

### 1.3 Component Dependencies

**Q1.3.1**: Should components be loosely coupled or tightly integrated?
- [ ] Loosely coupled (easier to test, replace)
- [ ] Tightly integrated (better performance, simpler)
- [ ] Hybrid (core tightly integrated, extensions loosely coupled)
- [ ] **Recommendation**: Hybrid - core quality components tightly integrated, optional features loosely coupled

**Q1.3.2**: How should components share data?
- [ ] Shared state object (simple, but risky)
- [ ] Event-driven (decoupled, but complex)
- [ ] Dependency injection (testable, but verbose)
- [ ] **Recommendation**: Event-driven for decoupling, dependency injection for testability

**Q1.3.3**: Should components support hot-reloading?
- [ ] Yes, for development
- [ ] No, restart required
- [ ] Configurable (dev vs production)
- [ ] **Recommendation**: Configurable - yes for development, no for production (safety)

---

## 2. Planning Confidence & Ambiguity System

### 2.1 Planning Confidence Score

**Q2.1.1**: How should Planning Confidence Score be computed?
- [ ] Simple average of factors
- [ ] Weighted sum (critical factors weighted higher)
- [ ] Machine learning model
- [ ] **Recommendation**: Weighted sum with explicit weights - transparency over black boxes

**Q2.1.2**: What factors should contribute to confidence score?
- [ ] Ambiguity count and severity
- [ ] Rule violations (resolved vs unresolved)
- [ ] Contract completeness
- [ ] Dependency certainty (API existence, types)
- [ ] Test coverage expectations
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive confidence measurement

**Q2.1.3**: What are the confidence thresholds?
- [ ] Below 50% → refuse
- [ ] 50-70% → ask clarifying questions
- [ ] Above 70% → proceed autonomously
- [ ] Configurable thresholds
- [ ] **Recommendation**: Configurable thresholds with safe defaults (e.g., <60% refuse, 60-80% ask, >80% proceed)

**Q2.1.4**: Should confidence score be mandatory and logged?
- [ ] Yes, always computed and logged
- [ ] No, optional
- [ ] Configurable
- [ ] **Recommendation**: Yes, always - mandatory for audit trail and learning

**Q2.1.5**: How should confidence score be displayed to users?
- [ ] Percentage only
- [ ] Percentage + breakdown by factor
- [ ] Visual indicator (color-coded)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - transparency builds trust

### 2.2 Ambiguity Classification

**Q2.2.1**: How should ambiguities be classified?
- [ ] Class A: Must ask user (critical ambiguity)
- [ ] Class B: Resolve via project conventions (log resolution)
- [ ] Class C: System limitation → explain and refuse
- [ ] All classes with automatic routing
- [ ] **Recommendation**: All classes with automatic routing - avoids over-asking while preserving safety

**Q2.2.2**: What defines "recoverable ambiguity" (Class B)?
- [ ] Ambiguity that can be resolved using project conventions
- [ ] Ambiguity that has clear default based on project patterns
- [ ] Ambiguity that doesn't affect critical decisions
- [ ] **Recommendation**: Ambiguity that can be resolved using project conventions with logged resolution

**Q2.2.3**: What defines "irreducible ambiguity" (Class A)?
- [ ] Ambiguity affecting architecture, security, persistence, public APIs
- [ ] Ambiguity with no project convention to resolve
- [ ] Ambiguity with multiple valid interpretations
- [ ] **Recommendation**: Ambiguity affecting critical decisions (architecture, security, persistence, public APIs, backward compatibility, data loss risk)

**Q2.2.4**: What defines "false ambiguity" (Class C)?
- [ ] System lacks knowledge but project conventions exist
- [ ] System limitation (missing context, outdated index)
- [ ] **Recommendation**: System limitation → explain limitation, refuse, offer to update context/index

**Q2.2.5**: Should ambiguity classification happen during planning?
- [ ] Yes, mandatory during planning phase
- [ ] No, can happen later
- [ ] **Recommendation**: Yes, mandatory during planning - all ambiguities must be classified before execution

**Q2.2.6**: How should ambiguity resolutions be logged?
- [ ] Log all resolutions (Class A, B, C)
- [ ] Log only Class A (user decisions)
- [ ] Log only Class B (convention-based)
- [ ] **Recommendation**: Log all resolutions - full audit trail for learning and debugging

---

## 3. Specification Completeness Gate

### 3.1 Specification Completeness Requirements

**Q3.1.1**: What must be specified for every public function?
- [ ] Inputs (parameters, types, constraints)
- [ ] Outputs (return type, possible values)
- [ ] Error semantics (what errors can occur, when)
- [ ] Side-effects (what state is modified, what I/O occurs)
- [ ] All of the above (mandatory)
- [ ] **Recommendation**: All of the above - every public function must have complete specification

**Q3.1.2**: What must be specified for state mutations?
- [ ] Explicit state mutations (what state changes)
- [ ] Persistence boundaries (what is persisted, when)
- [ ] Sync/async behavior (is operation synchronous or asynchronous)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - all state mutations must be explicit

**Q3.1.3**: When should specification completeness be checked?
- [ ] During planning (before plan approval)
- [ ] During code generation
- [ ] During validation
- [ ] All of the above
- [ ] **Recommendation**: During planning (before plan approval) - catch incompleteness early

**Q3.1.4**: What is the completeness threshold?
- [ ] 100% for public surfaces (mandatory)
- [ ] Configurable threshold
- [ ] Different thresholds for public vs internal
- [ ] **Recommendation**: 100% for public surfaces - if spec completeness < 100% for public surfaces → refuse

**Q3.1.5**: How should incomplete specifications be handled?
- [ ] Refuse planning
- [ ] Ask user to complete specification
- [ ] Infer from context (risky)
- [ ] **Recommendation**: Refuse planning - prevents "implicit behavior" from leaking into generated code

**Q3.1.6**: Should internal functions also require complete specifications?
- [ ] Yes, all functions
- [ ] No, only public functions
- [ ] Configurable per project
- [ ] **Recommendation**: Configurable per project - public functions mandatory, internal functions recommended

**Q3.1.7**: How should specification completeness be validated?
- [ ] Static analysis (check code for spec annotations)
- [ ] LLM-based validation (check if spec is complete)
- [ ] Both
- [ ] **Recommendation**: Both - static analysis for structure, LLM for semantic completeness

### 3.2 Non-Goals Declaration

**Q3.2.1**: Should every plan include a Non-Goals section?
- [ ] Yes, mandatory for all plans
- [ ] No, optional
- [ ] Only for large changes
- [ ] **Recommendation**: Yes, mandatory - reduces hallucinated scope creep

**Q3.2.2**: What should non-goals include?
- [ ] What this change does NOT do
- [ ] What this change does NOT refactor
- [ ] What this change does NOT optimize
- [ ] What this change does NOT modify
- [ ] All of the above
- [ ] **Recommendation**: All of the above - explicit non-goals prevent scope creep

**Q3.2.3**: How should non-goals be enforced?
- [ ] Validation during planning
- [ ] Validation during execution
- [ ] Both
- [ ] **Recommendation**: Both - validate during planning, enforce during execution

**Q3.2.4**: What happens if execution violates non-goals?
- [ ] Stop execution
- [ ] Warn but continue
- [ ] Ask user
- [ ] **Recommendation**: Stop execution - non-goals are explicit boundaries

---

## 4. Design Quality Gate

### 4.1 Design Quality Evaluation

**Q4.1.1**: Should design quality be evaluated separately from correctness?
- [ ] Yes, design quality ≠ correctness
- [ ] No, correctness includes design
- [ ] **Recommendation**: Yes - code can be technically correct but structurally bad

**Q4.1.2**: What design quality metrics should be evaluated?
- [ ] Cohesion (single responsibility)
- [ ] Coupling (dependency direction)
- [ ] Layer violations (architectural boundaries)
- [ ] Architectural drift (deviation from intended architecture)
- [ ] Over-engineering vs under-engineering
- [ ] Alignment with existing patterns
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive design quality evaluation

**Q4.1.3**: When should design quality be evaluated?
- [ ] Between planning and execution (mandatory gate)
- [ ] During planning
- [ ] After execution
- [ ] **Recommendation**: Between planning and execution - mandatory gate before code generation

**Q4.1.4**: What should the Design Quality Agent output?
- [ ] Pass / Fail
- [ ] Structured critique (what's wrong, why)
- [ ] Suggested refactors (non-executed, for user review)
- [ ] Design quality score (0-100)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive feedback for improvement

**Q4.1.5**: What is the design quality threshold?
- [ ] Fixed threshold (e.g., 70%)
- [ ] Configurable per project
- [ ] Different thresholds for different metrics
- [ ] **Recommendation**: Configurable per project with safe defaults - different projects have different quality standards

**Q4.1.6**: What happens if design quality score < threshold?
- [ ] Refuse code generation (even if types/tests pass)
- [ ] Warn but allow
- [ ] Ask user
- [ ] **Recommendation**: Refuse code generation - design quality is non-negotiable for maintainability

**Q4.1.7**: Should design quality agent be Level 2 (Critical)?
- [ ] Yes, blocks planning approval
- [ ] No, Level 1 (Advisory)
- [ ] **Recommendation**: Yes, Level 2 - design quality is critical for long-term maintainability

### 4.2 Design Pattern Alignment

**Q4.2.1**: How should existing patterns be detected?
- [ ] AST analysis (structural patterns)
- [ ] Code analysis (behavioral patterns)
- [ ] Project convention extraction
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive pattern detection

**Q4.2.2**: How should pattern alignment be measured?
- [ ] Exact match (same pattern)
- [ ] Similarity score (how similar to existing patterns)
- [ ] Deviation score (how much it deviates)
- [ ] **Recommendation**: Similarity score - allows for pattern evolution while maintaining consistency

**Q4.2.3**: What happens if generated code doesn't align with existing patterns?
- [ ] Refuse generation
- [ ] Suggest pattern-aligned alternative
- [ ] Ask user if deviation is intentional
- [ ] **Recommendation**: Suggest pattern-aligned alternative first, refuse if no good alternative exists

---

## 5. Invariant System

### 5.1 Invariant Definition

**Q5.1.1**: What are invariants?
- [ ] Conditions that must always hold true
- [ ] Properties that must be maintained
- [ ] Constraints that must never be violated
- [ ] All of the above
- [ ] **Recommendation**: All of the above - invariants are fundamental correctness properties

**Q5.1.2**: What types of invariants should be supported?
- [ ] State invariants ("this state must never be null")
- [ ] Behavioral invariants ("this function must be idempotent")
- [ ] Architectural invariants ("this service must be side-effect free")
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive invariant coverage

**Q5.1.3**: How should invariants be declared?
- [ ] Code annotations (TypeScript decorators, JSDoc)
- [ ] Separate specification file
- [ ] Inline comments
- [ ] All of the above
- [ ] **Recommendation**: Code annotations + separate specification file - annotations for code-level, spec file for system-level

**Q5.1.4**: Should invariants be mandatory for generated code?
- [ ] Yes, all generated code must have invariants
- [ ] No, optional
- [ ] Only for public APIs
- [ ] **Recommendation**: Only for public APIs - internal code can have inferred invariants

### 5.2 Invariant Validation

**Q5.2.1**: When should invariants be checked?
- [ ] Plan validation (before execution)
- [ ] During execution (runtime checks)
- [ ] In tests (test-time checks)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive validation at all stages

**Q5.2.2**: Where should runtime invariant checks occur?
- [ ] Everywhere (comprehensive)
- [ ] Only critical paths (performance)
- [ ] Only public API boundaries
- [ ] **Recommendation**: Only critical paths - balance between safety and performance

**Q5.2.3**: How should invariant violations be handled?
- [ ] Fail fast (stop execution)
- [ ] Log and continue (for non-critical)
- [ ] Rollback to last valid state
- [ ] **Recommendation**: Fail fast for critical invariants, log and continue for non-critical (with user notification)

**Q5.2.4**: Should generated code prove invariants?
- [ ] Yes, code must prove invariants hold
- [ ] No, just satisfy types
- [ ] Test invariants (test that they hold)
- [ ] **Recommendation**: Test invariants - generated code must prove (or test) invariants, not just satisfy types

**Q5.2.5**: How should invariant proofs be structured?
- [ ] Formal proofs (mathematical)
- [ ] Test-based proofs (property tests)
- [ ] Static analysis proofs
- [ ] All of the above (where applicable)
- [ ] **Recommendation**: Test-based proofs for most cases, formal proofs for critical systems - practical over theoretical

### 5.3 Common Invariants

**Q5.3.1**: What are common invariants that should be checked?
- [ ] "This function must not mutate global state"
- [ ] "This operation must be idempotent"
- [ ] "This service must be side-effect free"
- [ ] "This function must not throw exceptions"
- [ ] All of the above + project-specific
- [ ] **Recommendation**: All of the above + project-specific - common invariants + custom invariants

**Q5.3.2**: Should invariants be learned from existing code?
- [ ] Yes, extract invariants from existing code
- [ ] No, only user-declared
- [ ] Hybrid (learn, but require user confirmation)
- [ ] **Recommendation**: Hybrid - learn from existing code, but require user confirmation before enforcing

---

## 6. Semantic Change Classification

### 6.1 Semantic Change Types

**Q6.1.1**: How should code changes be classified semantically?
- [ ] Behavior-preserving (refactoring, no behavior change)
- [ ] Behavior-extending (new functionality, backward compatible)
- [ ] Behavior-modifying (changes existing behavior, may break compatibility)
- [ ] Behavior-breaking (changes behavior, breaks compatibility)
- [ ] All classifications (mandatory)
- [ ] **Recommendation**: All classifications - mandatory semantic classification for every change

**Q6.1.2**: How should semantic classification be determined?
- [ ] Static analysis (code diff analysis)
- [ ] Type analysis (type changes indicate semantic changes)
- [ ] Test analysis (test changes indicate behavior changes)
- [ ] LLM-based analysis (semantic understanding)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - multi-method classification for accuracy

**Q6.1.3**: When should semantic classification happen?
- [ ] During planning (as part of change graph)
- [ ] Before execution
- [ ] After execution (validation)
- [ ] All of the above
- [ ] **Recommendation**: During planning - classify changes as part of change graph generation

### 6.2 Semantic Change Requirements

**Q6.2.1**: What is required for behavior-modifying changes?
- [ ] Explicit user approval
- [ ] Migration plan (how to migrate existing code)
- [ ] Version bump (semantic versioning)
- [ ] All of the above (mandatory)
- [ ] **Recommendation**: All of the above - behavior-modifying changes require explicit approval and migration planning

**Q6.2.2**: What is required for behavior-breaking changes?
- [ ] Explicit user approval
- [ ] Migration plan
- [ ] Version bump (major version)
- [ ] Backward compatibility analysis
- [ ] All of the above (mandatory)
- [ ] **Recommendation**: All of the above - behavior-breaking changes require comprehensive planning

**Q6.2.3**: Can behavior-preserving changes proceed autonomously?
- [ ] Yes, if confidence is high
- [ ] No, always require approval
- [ ] Configurable
- [ ] **Recommendation**: Yes, if confidence is high - behavior-preserving changes are safer

**Q6.2.4**: How should semantic changes be validated after execution?
- [ ] Compare actual behavior vs planned behavior
- [ ] Run regression tests
- [ ] Check type compatibility
- [ ] All of the above
- [ ] **Recommendation**: All of the above - validate that actual changes match semantic classification

**Q6.2.5**: What happens if actual change doesn't match classification?
- [ ] Block finalization
- [ ] Reclassify and re-validate
- [ ] Ask user
- [ ] **Recommendation**: Block finalization - semantic classification must be accurate

---

## 7. Agent Architecture & Criticality

### 7.1 Agent Criticality Levels

**Q7.1.1**: How should agents be classified by criticality?
- [ ] Level 0: Informational (non-blocking)
- [ ] Level 1: Advisory (blocks execution advancement)
- [ ] Level 2: Critical (blocks planning approval)
- [ ] All levels with explicit enforcement
- [ ] **Recommendation**: All levels with explicit enforcement - clear semantics for each level

**Q3.1.2**: What happens if an async agent (Level ≥1) reports late?
- [ ] Wait for completion (blocks execution)
- [ ] Proceed with warning
- [ ] Refuse execution
- [ ] **Recommendation**: Wait for completion if Level ≥1 - async agents with Level ≥1 must complete before execution lock-in

**Q3.1.3**: How should agent criticality be assigned?
- [ ] Fixed per agent type
- [ ] Configurable per project
- [ ] Dynamic based on context
- [ ] **Recommendation**: Fixed per agent type with project overrides - consistency with flexibility

**Q3.1.4**: Should agent criticality be versioned?
- [ ] Yes, with agent version
- [ ] No, fixed
- [ ] **Recommendation**: Yes, with agent version - criticality may change as agents improve

**Q3.1.5**: How should agent failures be handled by criticality level?
- [ ] Level 0: Log and continue
- [ ] Level 1: Block execution, ask user
- [ ] Level 2: Refuse planning, explain why
- [ ] **Recommendation**: Level-specific handling - Level 0 log, Level 1 block execution, Level 2 refuse planning

### 3.2 Agent Execution Guarantees

**Q3.2.1**: What guarantees must agents provide?
- [ ] Completion within timeout
- [ ] Deterministic output (same input = same output)
- [ ] Machine-readable output (structured)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - agents must be reliable and predictable

**Q3.2.2**: How should agent timeouts be configured?
- [ ] Fixed timeout per agent
- [ ] Configurable per agent type
- [ ] Dynamic based on operation complexity
- [ ] **Recommendation**: Configurable per agent type with dynamic adjustment - balance between safety and performance

**Q3.2.3**: What happens if agent exceeds timeout?
- [ ] Fail agent, continue pipeline
- [ ] Fail agent, block pipeline
- [ ] Retry with longer timeout
- [ ] **Recommendation**: Fail agent, block pipeline if Level ≥1 - timeouts indicate problems

---

## 8. Cross-Agent Consistency

### 8.1 Consistency Validation

**Q8.1.1**: Why is cross-agent consistency needed?
- [ ] Agents may individually pass but contradict each other
- [ ] Planning assumptions may not match execution actions
- [ ] Test expectations may not match contract definitions
- [ ] Type constraints may not match runtime validation rules
- [ ] All of the above
- [ ] **Recommendation**: All of the above - agents must be consistent with each other

**Q8.1.2**: What should be checked for consistency?
- [ ] Planning agent assumptions vs execution agent actions
- [ ] Test expectations vs contract definitions
- [ ] Type constraints vs runtime validation rules
- [ ] Design quality vs code generation
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive consistency checking

**Q8.1.3**: When should consistency be validated?
- [ ] After all agents complete (before execution lock-in)
- [ ] During planning
- [ ] During execution
- [ ] All of the above
- [ ] **Recommendation**: After all agents complete, before execution lock-in - catch contradictions early

**Q8.1.4**: What happens if contradictions are detected?
- [ ] Refuse planning (mandatory)
- [ ] Warn but allow
- [ ] Ask user to resolve
- [ ] **Recommendation**: Refuse planning - any contradiction → planning refused

**Q8.1.5**: Should Cross-Agent Consistency Validator be Level 2 (Critical)?
- [ ] Yes, blocks planning approval
- [ ] No, Level 1 (Advisory)
- [ ] **Recommendation**: Yes, Level 2 - consistency is critical for correctness

**Q8.1.6**: How should consistency violations be reported?
- [ ] List all contradictions
- [ ] Explain why each is a contradiction
- [ ] Suggest resolutions
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive reporting for debugging

---

## 9. Pipeline & Rollback Semantics

### 4.1 Rollback Classification

**Q4.1.1**: How should rollback operations be classified?
- [ ] Reversible (code, config)
- [ ] Compensatable (DB migrations with down scripts)
- [ ] Irreversible (external APIs, file deletions)
- [ ] All classes with explicit handling
- [ ] **Recommendation**: All classes with explicit handling - different rollback strategies for different operations

**Q9.1.2**: What should happen for irreversible operations?
- [ ] Refuse unless user explicitly accepts
- [ ] Warn but allow
- [ ] Always allow
- [ ] **Recommendation**: Refuse unless user explicitly accepts - planning must refuse irreversible steps by default

**Q9.1.3**: How should compensatable operations be handled?
- [ ] Generate down scripts automatically
- [ ] Require user-provided down scripts
- [ ] Refuse if no down script
- [ ] **Recommendation**: Generate down scripts automatically, require user approval - safety with automation

**Q9.1.4**: Should rollback scope be validated before execution?
- [ ] Yes, validate all operations are reversible/compensatable
- [ ] No, validate during rollback
- [ ] **Recommendation**: Yes, validate before execution - know rollback capability upfront

**Q9.1.5**: How should learning data rollback work?
- [ ] Never rollback learning data (it's knowledge)
- [ ] Rollback if learning was incorrect
- [ ] Mark learning as "invalidated" instead of deleting
- [ ] **Recommendation**: Mark learning as "invalidated" instead of deleting - preserve history, prevent reuse

### 9.2 Execution Lock-In Point

**Q9.2.1**: When is the execution lock-in point?
- [ ] After plan approval
- [ ] After change graph validation
- [ ] After confidence score validation
- [ ] After all Level ≥1 agents complete
- [ ] All of the above
- [ ] **Recommendation**: All of the above - lock-in only after all validations pass

**Q9.2.2**: What happens after lock-in?
- [ ] No more assumptions allowed
- [ ] No more ambiguity resolution
- [ ] No more plan modifications
- [ ] All of the above
- [ ] **Recommendation**: All of the above - lock-in means execution proceeds with fixed plan

**Q9.2.3**: Can lock-in be reversed?
- [ ] No, once locked-in, must execute or refuse
- [ ] Yes, if user explicitly requests
- [ ] Yes, if critical error detected
- [ ] **Recommendation**: Yes, if critical error detected or user explicitly requests - safety over rigidity

---

## 10. Test Intent Verification

### 10.1 Test Intent Requirements

**Q10.1.1**: Why is test intent verification needed?
- [ ] Tests may not actually test intended behavior
- [ ] Tests may be tautological ("expect(true).toBe(true)")
- [ ] Tests may test implementation details, not behavior
- [ ] Tests may not fail before fix (invalid tests)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - test quality is as important as test existence

**Q10.1.2**: What should Test Intent Agent verify?
- [ ] Tests fail before fix (test actually catches the bug)
- [ ] Tests pass after fix (test validates the fix)
- [ ] Tests assert intended behavior, not implementation details
- [ ] No tautological tests
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive test intent verification

**Q10.1.3**: When should test intent be verified?
- [ ] During test generation
- [ ] Before test execution
- [ ] After test execution
- [ ] All of the above
- [ ] **Recommendation**: During test generation and before execution - catch invalid tests early

**Q10.1.4**: What happens if tests don't fail before fix?
- [ ] Invalidate the plan (tests are invalid)
- [ ] Regenerate tests
- [ ] Ask user
- [ ] **Recommendation**: Invalidate the plan - tests that don't fail before fix invalidate the plan

**Q10.1.5**: Should Test Intent Agent be Level 1 (Advisory)?
- [ ] Yes, blocks execution advancement
- [ ] No, Level 0 (Informational)
- [ ] **Recommendation**: Yes, Level 1 - invalid tests should block execution

**Q10.1.6**: How should tautological tests be detected?
- [ ] Static analysis (check test logic)
- [ ] Runtime analysis (check if test always passes)
- [ ] LLM-based analysis (semantic understanding)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - multiple detection methods for accuracy

**Q10.1.7**: How should implementation detail tests be handled?
- [ ] Refuse (tests should test behavior, not implementation)
- [ ] Warn but allow
- [ ] Convert to behavior tests
- [ ] **Recommendation**: Convert to behavior tests - preserve test intent while fixing test focus

---

## 11. Learning Quarantine System

### 11.1 Quarantine Requirements

**Q11.1.1**: Why is learning quarantine needed?
- [ ] Prevents slow poisoning of the system
- [ ] Allows validation before applying learning
- [ ] Enables rollback of bad learning
- [ ] All of the above
- [ ] **Recommendation**: All of the above - quarantine prevents learning from degrading system quality

**Q11.1.2**: How should new learning be staged?
- [ ] Stored as candidate (not applied)
- [ ] Applied only in "shadow mode" (tested but not used)
- [ ] Requires N successful confirmations before promotion
- [ ] Explicit promotion to active learning
- [ ] All of the above
- [ ] **Recommendation**: All of the above - staged learning with validation

**Q11.1.3**: What is "shadow mode"?
- [ ] Learning is tested but not used for decisions
- [ ] Learning is used but results are compared with baseline
- [ ] Learning is logged but not applied
- [ ] **Recommendation**: Learning is tested but not used for decisions - validate learning before applying

**Q11.1.4**: How many successful confirmations are required?
- [ ] Fixed number (e.g., 3 confirmations)
- [ ] Configurable per learning type
- [ ] Based on learning confidence
- [ ] **Recommendation**: Configurable per learning type - different learning requires different validation

**Q11.1.5**: Who can promote learning from quarantine?
- [ ] System automatically (after N confirmations)
- [ ] User explicitly
- [ ] Both (auto with user override)
- [ ] **Recommendation**: Both - auto-promote after validation, but user can override

**Q11.1.6**: How should quarantined learning be stored?
- [ ] Separate from active learning
- [ ] Tagged as "quarantined"
- [ ] Versioned independently
- [ ] All of the above
- [ ] **Recommendation**: All of the above - clear separation and versioning

**Q11.1.7**: Can quarantined learning be rejected?
- [ ] Yes, user can reject
- [ ] Yes, system can reject (if validation fails)
- [ ] Both
- [ ] **Recommendation**: Both - user and system can reject bad learning

---

## 12. Human Escalation Protocol

### 12.1 Escalation Requirements

**Q12.1.1**: Why is explicit escalation protocol needed?
- [ ] "Ask user" is ambiguous
- [ ] User needs clear information to make decisions
- [ ] Prevents ambiguous user approvals
- [ ] All of the above
- [ ] **Recommendation**: All of the above - explicit protocol ensures quality decisions

**Q12.1.2**: What must be provided when blocking?
- [ ] What is blocked (clear description)
- [ ] Why it's blocked (reasoning)
- [ ] What evidence exists (supporting data)
- [ ] Exact decision choices (what user can choose)
- [ ] Consequences of each choice (what happens)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive information for decision-making

**Q12.1.3**: How should decision choices be presented?
- [ ] Simple yes/no
- [ ] Multiple options with descriptions
- [ ] Structured choices with consequences
- [ ] **Recommendation**: Structured choices with consequences - user needs to understand implications

**Q12.1.4**: Should user acknowledgment be explicit?
- [ ] Yes, require explicit acknowledgment (not just clicking through)
- [ ] No, implicit acknowledgment is fine
- [ ] **Recommendation**: Yes, explicit acknowledgment - prevents accidental approvals

**Q12.1.5**: How should escalation be logged?
- [ ] Log what was blocked
- [ ] Log why it was blocked
- [ ] Log user decision
- [ ] Log consequences of decision
- [ ] All of the above
- [ ] **Recommendation**: All of the above - full audit trail of escalations

**Q12.1.6**: Should escalation support "remember this choice"?
- [ ] Yes, for similar situations
- [ ] No, each escalation is unique
- [ ] Yes, but with confirmation
- [ ] **Recommendation**: Yes, but with confirmation - convenience with safety

**Q12.1.7**: How should escalation timeouts be handled?
- [ ] Wait indefinitely (user must decide)
- [ ] Timeout and refuse (safety first)
- [ ] Timeout and use safe default
- [ ] **Recommendation**: Timeout and refuse - safety first, user can retry

---

## 13. Deterministic Execution Envelope

### 13.1 Determinism Guarantees

**Q13.1.1**: Why is hash-level determinism needed?
- [ ] "Deterministic" is vague without hashes
- [ ] Need to detect non-determinism
- [ ] Need to reproduce exact outputs
- [ ] All of the above
- [ ] **Recommendation**: All of the above - hash-level guarantees enable reproducibility

**Q13.1.2**: What should be included in the execution envelope?
- [ ] Model version hash
- [ ] Prompt template hash
- [ ] Context snapshot hash
- [ ] Toolchain version hash
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive envelope for reproducibility

**Q13.1.3**: How should the envelope be computed?
- [ ] Hash of all components
- [ ] Combined hash (hash of hashes)
- [ ] Structured hash (component-wise)
- [ ] **Recommendation**: Structured hash - component-wise hashing enables partial matching

**Q13.1.4**: When should the envelope be logged?
- [ ] Before execution (planned envelope)
- [ ] After execution (actual envelope)
- [ ] Both
- [ ] **Recommendation**: Both - compare planned vs actual for non-determinism detection

**Q13.1.5**: What is the determinism rule?
- [ ] Same envelope → same output
- [ ] Different envelope → different output (expected)
- [ ] Same envelope → different output = non-determinism (flag)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - clear determinism guarantees

**Q13.1.6**: How should non-determinism be detected?
- [ ] Compare output hashes for same envelope
- [ ] Compare change graphs for same envelope
- [ ] Compare AST diffs for same envelope
- [ ] All of the above
- [ ] **Recommendation**: All of the above - multiple detection methods

**Q13.1.7**: What happens if non-determinism is detected?
- [ ] Flag as bug (non-determinism is a bug)
- [ ] Log for investigation
- [ ] Refuse execution (if in deterministic mode)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - non-determinism must be detected and handled

**Q13.1.8**: Should envelope be included in audit logs?
- [ ] Yes, always
- [ ] No, too verbose
- [ ] Yes, but compressed
- [ ] **Recommendation**: Yes, always - envelope is essential for reproducibility and debugging

---

## 14. UI Components & User Experience

### 2.1 Plan Visualization

**Q2.1.1**: What visualization library should be used?
- [ ] D3.js (powerful, but complex)
- [ ] React Flow (React-native, simpler)
- [ ] Cytoscape.js (graph-focused)
- [ ] Custom SVG (full control)
- [ ] **Recommendation**: React Flow for React integration, with custom extensions for plan-specific features

**Q2.1.2**: How should plan steps be displayed?
- [ ] Tree view (hierarchical)
- [ ] Graph view (dependency relationships)
- [ ] Timeline view (execution order)
- [ ] All views (user can switch)
- [ ] **Recommendation**: All views with default based on plan type (hierarchical for hierarchical plans, graph for complex dependencies)

**Q2.1.3**: Should users be able to edit plans in the visualization?
- [ ] Yes, full editing (add/remove/modify steps)
- [ ] No, view-only
- [ ] Limited editing (modify descriptions only)
- [ ] **Recommendation**: Full editing capability for user control and autonomy

**Q2.1.3a**: What happens when user edits a plan?
- [ ] Invalidate prior plan confidence
- [ ] Trigger full re-planning
- [ ] Re-run ambiguity detection
- [ ] All of the above (mandatory)
- [ ] **Recommendation**: All of the above - any user edit must invalidate prior assumptions, never allow "partial trust" after edits

**Q2.1.4**: How should plan execution progress be shown?
- [ ] Progress bar (simple)
- [ ] Step-by-step list with status (detailed)
- [ ] Real-time logs (verbose)
- [ ] All of the above (user choice)
- [ ] **Recommendation**: All of the above, with user-configurable detail level

**Q2.1.5**: Should UI actions bypass the planning pipeline?
- [ ] No, all UI actions must go through planning pipeline
- [ ] Yes, some actions can bypass (for speed)
- [ ] Configurable per action type
- [ ] **Recommendation**: No, all UI actions must go through planning pipeline - UI must never become a bypass channel

### 2.2 Code Editor Integration

**Q2.2.1**: How should Monaco Editor be integrated?
- [ ] Single editor instance (simple)
- [ ] Multiple editor tabs (VS Code style)
- [ ] Split view (side-by-side)
- [ ] **Recommendation**: Multiple editor tabs with split view support (familiar UX)

**Q2.2.2**: Should the editor support AI suggestions inline?
- [ ] Yes, real-time suggestions
- [ ] No, only on-demand
- [ ] Configurable (user choice)
- [ ] **Recommendation**: Configurable - on by default, but user can disable for performance

**Q2.2.3**: How should code diffs be displayed?
- [ ] Inline diff (side-by-side)
- [ ] Unified diff (traditional)
- [ ] Tree diff (AST-based)
- [ ] All of the above
- [ ] **Recommendation**: All of the above, with AST-based as default for accuracy

**Q2.2.4**: Should the editor support collaborative editing?
- [ ] Yes, real-time collaboration
- [ ] No, single user only
- [ ] Future feature
- [ ] **Recommendation**: Future feature - focus on single-user quality first

### 2.3 Settings & Configuration UI

**Q2.3.1**: How should settings be organized?
- [ ] Single page (simple)
- [ ] Categorized tabs (organized)
- [ ] Searchable (large configs)
- [ ] **Recommendation**: Categorized tabs with search for large configs

**Q2.3.2**: Should settings support validation in real-time?
- [ ] Yes, validate as user types
- [ ] No, validate on save
- [ ] Both (warnings in real-time, errors on save)
- [ ] **Recommendation**: Both - warnings in real-time, blocking errors on save

**Q2.3.3**: How should settings be exported/imported?
- [ ] JSON file (simple)
- [ ] YAML file (human-readable)
- [ ] Both formats
- [ ] **Recommendation**: Both formats, with JSON as canonical

### 2.4 Error Display & Feedback

**Q2.4.1**: How should errors be displayed?
- [ ] Modal dialogs (blocking)
- [ ] Inline messages (non-blocking)
- [ ] Notification system (toast-style)
- [ ] All of the above (context-dependent)
- [ ] **Recommendation**: All of the above - blocking errors in modal, warnings inline, info in notifications

**Q2.4.2**: Should errors include suggested fixes?
- [ ] Yes, always
- [ ] No, just show error
- [ ] Configurable
- [ ] **Recommendation**: Yes, always - part of quality-first approach

**Q2.4.3**: How should error history be displayed?
- [ ] Recent errors only
- [ ] Full history with search
- [ ] Grouped by type
- [ ] **Recommendation**: Full history with search and grouping for debugging

---

## 15. Database & Persistence

### 3.1 Plan Storage

**Q3.1.1**: What database should be used for plan storage?
- [ ] SQLite (embedded, simple)
- [ ] PostgreSQL (robust, scalable)
- [ ] File-based JSON (simple, but limited)
- [ ] Hybrid (SQLite for local, PostgreSQL for cloud)
- [ ] **Recommendation**: SQLite for local (embedded, no setup), with optional PostgreSQL for cloud sync

**Q3.1.2**: How should plans be indexed for search?
- [ ] Full-text search (SQLite FTS)
- [ ] Tag-based (manual tags)
- [ ] Semantic search (embeddings)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - full-text for exact matches, tags for organization, semantic for discovery

**Q3.1.3**: Should plan history be versioned?
- [ ] Yes, full version history
- [ ] No, only current version
- [ ] Limited history (last N versions)
- [ ] **Recommendation**: Full version history for audit and rollback

**Q3.1.4**: How should plan storage handle large plans?
- [ ] Store as-is (simple)
- [ ] Compress (save space)
- [ ] Chunk (for very large plans)
- [ ] **Recommendation**: Compress for storage efficiency, chunk only if necessary

**Q3.1.5**: How should schema migrations be handled?
- [ ] Automatic migrations (risky)
- [ ] Manual migrations only
- [ ] Planned migrations (migrations themselves are planned and versioned)
- [ ] **Recommendation**: Planned migrations - schema migrations must themselves be planned and versioned, never automatic

### 3.2 Context Cache

**Q3.2.1**: How should context cache be stored?
- [ ] In-memory only (fast, but lost on restart)
- [ ] Disk cache (persistent)
- [ ] Database (queryable)
- [ ] Hybrid (memory + disk)
- [ ] **Recommendation**: Hybrid - memory for hot data, disk for persistence, database for large repos

**Q3.2.2**: What cache eviction strategy should be used?
- [ ] LRU (Least Recently Used)
- [ ] LFU (Least Frequently Used)
- [ ] Time-based (expire after N hours)
- [ ] Hybrid (LRU + time-based)
- [ ] **Recommendation**: Hybrid - LRU for memory, time-based for disk (context can become stale)

**Q3.2.3**: How should cache invalidation work?
- [ ] Manual (user triggers)
- [ ] Automatic (on file changes)
- [ ] Hybrid (automatic + manual override)
- [ ] **Recommendation**: Hybrid - automatic on file changes, manual override for force refresh

### 3.3 Bug Memory & Learning Data

**Q3.3.1**: How should bug patterns be stored?
- [ ] Database (structured queries)
- [ ] Files (JSON/YAML)
- [ ] Vector database (semantic search)
- [ ] Hybrid (database + vector for search)
- [ ] **Recommendation**: Hybrid - database for structured queries, vector for semantic pattern matching

**Q3.3.2**: Should learning data be project-specific or shared?
- [ ] Project-specific only (privacy)
- [ ] Shared across projects (learning)
- [ ] Opt-in sharing (user choice)
- [ ] **Recommendation**: Project-specific by default, opt-in sharing for learning (privacy first)

**Q3.3.3**: How should learning data be versioned?
- [ ] With code versions (git-based)
- [ ] Independent versioning
- [ ] Timestamp-based
- [ ] **Recommendation**: Independent versioning with git integration (learning evolves separately from code)

---

## 16. API Endpoints & IPC Communication

### 4.1 IPC Architecture

**Q4.1.1**: How should IPC channels be organized?
- [ ] Single channel (simple, but risky)
- [ ] Per-domain channels (context, planning, execution)
- [ ] Per-operation channels (fine-grained)
- [ ] **Recommendation**: Per-domain channels for organization, with operation-specific handlers

**Q4.1.2**: Should IPC support streaming responses?
- [ ] Yes, for all long operations
- [ ] No, only synchronous
- [ ] Configurable per operation
- [ ] **Recommendation**: Yes, for all long operations (planning, code generation, execution)

**Q4.1.3**: How should IPC handle errors?
- [ ] Return error in response (simple)
- [ ] Separate error channel (decoupled)
- [ ] Event-based errors (reactive)
- [ ] **Recommendation**: Return error in response for synchronous, event-based for long operations

**Q4.1.4**: Should IPC support cancellation?
- [ ] Yes, for all long operations
- [ ] No, operations run to completion
- [ ] Configurable
- [ ] **Recommendation**: Yes, for all long operations (user control)

**Q4.1.5**: Should IPC boundaries have schema validation?
- [ ] Yes, validate on every IPC boundary
- [ ] No, trust types
- [ ] Configurable
- [ ] **Recommendation**: Yes, validate on every IPC boundary - runtime validation at boundaries, not deep inside logic

### 4.2 Model API Integration

**Q4.2.1**: How should model API failures be handled?
- [ ] Retry with exponential backoff
- [ ] Fallback to alternative model
- [ ] User notification
- [ ] All of the above
- [ ] **Recommendation**: All of the above - retry first, fallback second, notify user always

**Q4.2.1a**: How should model fallbacks be handled?
- [ ] Pre-approved per project (fallbacks must be approved)
- [ ] Treated as "environment change" (trigger re-validation)
- [ ] Trigger confidence recomputation
- [ ] Never silent fallback
- [ ] All of the above
- [ ] **Recommendation**: All of the above - fallbacks must be pre-approved, trigger re-validation, never silent (different models = different reasoning = non-determinism)

**Q4.2.2**: Should model API calls be rate-limited?
- [ ] Yes, per-model limits
- [ ] No, unlimited
- [ ] Configurable per user
- [ ] **Recommendation**: Yes, per-model limits to prevent abuse and manage costs

**Q4.2.3**: How should model API keys be stored?
- [ ] Plain text in config (simple, but insecure)
- [ ] Encrypted in config
- [ ] System keychain (OS-native)
- [ ] **Recommendation**: System keychain for security, with encrypted config as fallback

**Q4.2.4**: Should model API calls be logged?
- [ ] Yes, full logging (audit)
- [ ] No, for privacy
- [ ] Configurable (user choice)
- [ ] **Recommendation**: Configurable - full logging for debugging, minimal for privacy

### 4.3 External API Integration

**Q4.3.1**: Should the IDE support external API integrations?
- [ ] Yes, plugin architecture
- [ ] No, built-in only
- [ ] Future feature
- [ ] **Recommendation**: Future feature - focus on core quality first

**Q4.3.2**: How should external API authentication work?
- [ ] OAuth 2.0 (standard)
- [ ] API keys (simple)
- [ ] Both (user choice)
- [ ] **Recommendation**: Both - OAuth for services that support it, API keys for others

---

## 17. Security & Privacy

### 5.1 Code Privacy

**Q5.1.1**: How should sensitive code be handled?
- [ ] Local processing only (no network)
- [ ] Encrypted transmission (if remote)
- [ ] User choice per request
- [ ] **Recommendation**: Local processing by default, encrypted transmission if remote, user choice for sensitive code

**Q5.1.1a**: Should the IDE support "offline-only mode"?
- [ ] Yes, explicit offline-only mode for sensitive environments
- [ ] No, always allow network
- [ ] Configurable
- [ ] **Recommendation**: Yes, explicit offline-only mode - mandatory for sensitive environments, blocks all network access

**Q5.1.2**: Should code be encrypted at rest?
- [ ] Yes, always
- [ ] No, plain text
- [ ] Configurable (user choice)
- [ ] **Recommendation**: Configurable - encrypted by default, user can disable for performance

**Q5.1.3**: How should API keys be protected?
- [ ] System keychain (OS-native)
- [ ] Encrypted config file
- [ ] Environment variables
- [ ] **Recommendation**: System keychain primary, encrypted config as fallback

### 5.2 Access Control

**Q5.2.1**: Should the IDE support user authentication?
- [ ] Yes, multi-user support
- [ ] No, single user
- [ ] Future feature
- [ ] **Recommendation**: Future feature - single user for MVP, multi-user for enterprise

**Q5.2.2**: How should project access be controlled?
- [ ] File system permissions (OS-level)
- [ ] IDE-level permissions
- [ ] Both
- [ ] **Recommendation**: Both - OS-level for security, IDE-level for user experience

**Q5.2.3**: Should the IDE support audit logging?
- [ ] Yes, full audit trail
- [ ] No, minimal logging
- [ ] Configurable
- [ ] **Recommendation**: Yes, full audit trail for compliance and debugging

### 5.3 Vulnerability Scanning

**Q5.3.1**: How should security vulnerabilities be detected?
- [ ] Static analysis (code scanning)
- [ ] Dependency scanning (package vulnerabilities)
- [ ] Runtime scanning (execution monitoring)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - static and dependency scanning during planning, runtime during execution

**Q5.3.2**: What should happen when vulnerabilities are detected?
- [ ] Block execution (safety first)
- [ ] Warn but allow (user choice)
- [ ] Auto-fix if possible
- [ ] **Recommendation**: Block execution for critical vulnerabilities, warn for low-risk, auto-fix for known safe fixes

**Q5.3.3**: Should vulnerability scanning be configurable?
- [ ] Yes, per-project rules
- [ ] No, always scan
- [ ] Configurable severity thresholds
- [ ] **Recommendation**: Configurable severity thresholds, but always scan (user can adjust sensitivity)

---

## 18. Error Handling & Recovery

### 6.1 Error Classification

**Q6.1.1**: How should errors be categorized?
- [ ] By severity (error, warning, info)
- [ ] By type (syntax, type, semantic, runtime)
- [ ] By source (compiler, linter, test, execution)
- [ ] By causality (tooling error, model error, user error, environment error)
- [ ] All of the above (multi-dimensional)
- [ ] **Recommendation**: All of the above - multi-dimensional classification including causality chain (what error caused what downstream)

**Q6.1.1a**: How should error causality chains be tracked?
- [ ] Track parent-child error relationships
- [ ] Track error propagation path
- [ ] Track root cause
- [ ] All of the above
- [ ] **Recommendation**: All of the above - full causality chain for debugging and learning

**Q6.1.2**: Should errors have unique error codes?
- [ ] Yes, for all errors
- [ ] No, descriptive messages only
- [ ] Only for common errors
- [ ] **Recommendation**: Yes, for all errors - enables error tracking, learning, and user support

**Q6.1.3**: How should error messages be localized?
- [ ] English only (simpler)
- [ ] Multi-language support
- [ ] Configurable
- [ ] **Recommendation**: English for MVP, multi-language for future (i18n from start)

### 6.2 Error Recovery

**Q6.2.1**: What recovery strategies should be supported?
- [ ] Automatic retry
- [ ] Rollback to last checkpoint
- [ ] Partial recovery (continue from failure point)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - automatic retry for transient errors, rollback for critical failures, partial recovery for non-critical

**Q6.2.2**: How many retry attempts should be allowed?
- [ ] Fixed limit (e.g., 3 attempts)
- [ ] Configurable per error type
- [ ] Infinite (until success)
- [ ] **Recommendation**: Configurable per error type - fixed limit for most, infinite only for user-approved operations

**Q6.2.3**: Should errors trigger learning?
- [ ] Yes, learn from all errors
- [ ] No, errors are exceptions
- [ ] Only for common errors
- [ ] Only for specific error types (tooling, model)
- [ ] **Recommendation**: Only for specific error types - errors must be labeled (tooling error, model error, user error, environment error), only tooling and model errors are learnable by default (prevents learning to "work around" errors instead of fixing root causes)

### 6.3 Error Reporting

**Q6.3.1**: How should errors be reported to users?
- [ ] Technical details (for developers)
- [ ] User-friendly messages (for end users)
- [ ] Both (layered messages)
- [ ] **Recommendation**: Both - user-friendly by default, technical details on demand

**Q6.3.2**: Should errors be reported to developers?
- [ ] Yes, automatic error reporting
- [ ] No, local only
- [ ] Opt-in (user choice)
- [ ] **Recommendation**: Opt-in - privacy first, but enable reporting for improvement

**Q6.3.3**: How should error reports be structured?
- [ ] Plain text (simple)
- [ ] Structured JSON (machine-readable)
- [ ] Both formats
- [ ] **Recommendation**: Structured JSON for machine processing, human-readable summary for users

---

## 19. Type System & Type Safety

### 7.1 Type Definitions

**Q7.1.1**: How should types be organized?
- [ ] Single types file (simple)
- [ ] Per-domain types (organized)
- [ ] Per-component types (modular)
- [ ] **Recommendation**: Per-domain types for organization, shared types in common file

**Q7.1.2**: Should types be versioned?
- [ ] Yes, semantic versioning
- [ ] No, types evolve with code
- [ ] Only for public APIs
- [ ] **Recommendation**: Only for public APIs - internal types evolve with code

**Q7.1.3**: How should type changes be handled?
- [ ] Breaking changes require migration
- [ ] Automatic type migration
- [ ] User approval required
- [ ] **Recommendation**: Breaking changes require migration - automatic if safe, user approval if risky

### 7.2 Type Validation

**Q7.2.1**: When should types be validated?
- [ ] Compile-time only (TypeScript)
- [ ] Runtime validation (Zod, io-ts)
- [ ] Both (defense in depth)
- [ ] Runtime validation only at boundaries
- [ ] **Recommendation**: Both, but runtime validation only at boundaries (external input, IPC boundaries, generated code entry points) - avoid runtime validation deep inside internal logic to prevent noise

**Q7.2.1a**: What are the Runtime Validation Zones?
- [ ] External input (user input, file input)
- [ ] IPC boundaries (main ↔ renderer)
- [ ] Generated code entry points
- [ ] All of the above
- [ ] **Recommendation**: All of the above - define clear boundaries, validate at boundaries only

**Q7.2.2**: How should type errors be handled?
- [ ] Block execution (strict)
- [ ] Warn but allow (lenient)
- [ ] Configurable strictness
- [ ] **Recommendation**: Block execution for type errors - type safety is non-negotiable for quality

**Q7.2.3**: Should the IDE support gradual typing?
- [ ] Yes, allow `any` with warnings
- [ ] No, strict mode only
- [ ] Configurable per project
- [ ] **Recommendation**: Configurable per project - strict by default, enforce "no implicit any" as default even during migration, allow gradual only with explicit opt-in

### 7.3 Type Inference

**Q7.3.1**: How should type inference work?
- [ ] Full inference (minimal annotations)
- [ ] Explicit types required (verbose but clear)
- [ ] Hybrid (infer where safe, explicit for public APIs)
- [ ] **Recommendation**: Hybrid - infer where safe, explicit for public APIs and complex types

**Q7.3.2**: Should type inference be logged?
- [ ] Yes, for debugging
- [ ] No, transparent
- [ ] Configurable
- [ ] **Recommendation**: Configurable - off by default, on for debugging complex type issues

---

## 20. Learning System & Bias Control

### 11.1 Learning Boundaries

**Q11.1.1**: What learning is explicitly forbidden?
- [ ] Learning from user overrides of safety refusals
- [ ] Learning from emergency bypasses
- [ ] Learning from known incorrect outcomes
- [ ] All of the above
- [ ] **Recommendation**: All of the above - explicit forbidden learning prevents silent behavior drift

**Q11.1.2**: What learning is explicitly allowed?
- [ ] Learning from successful executions
- [ ] Learning from passing tests
- [ ] Learning from explicit user confirmations
- [ ] All of the above
- [ ] **Recommendation**: All of the above - only learn from positive, validated outcomes

**Q11.1.3**: How should learning be validated?
- [ ] Cross-validate with multiple successful cases
- [ ] Require explicit user confirmation
- [ ] Test learned patterns before applying
- [ ] All of the above
- [ ] **Recommendation**: All of the above - validate learning before applying

**Q11.1.4**: Should learning be reversible?
- [ ] Yes, can unlearn patterns
- [ ] No, learning is permanent
- [ ] Mark as "invalidated" instead of deleting
- [ ] **Recommendation**: Mark as "invalidated" instead of deleting - preserve history, prevent reuse

**Q11.1.5**: How should learning bias be controlled?
- [ ] Track learning source (what was learned from)
- [ ] Track learning confidence (how certain is the pattern)
- [ ] Require minimum evidence before learning
- [ ] All of the above
- [ ] **Recommendation**: All of the above - comprehensive bias control

### 11.2 Error Learning Control

**Q11.2.1**: How should error types be labeled for learning?
- [ ] Tooling error (learnable)
- [ ] Model error (learnable)
- [ ] User error (not learnable)
- [ ] Environment error (not learnable)
- [ ] All labels with learning rules
- [ ] **Recommendation**: All labels with learning rules - only tooling and model errors learnable by default

**Q11.2.2**: How should the system prevent learning to "work around" errors?
- [ ] Only learn fixes, not workarounds
- [ ] Require root cause analysis before learning
- [ ] Validate fixes don't introduce new problems
- [ ] All of the above
- [ ] **Recommendation**: All of the above - prevent learning bad patterns

---

## 21. Absolute Prohibitions

### 12.1 Code Safety Prohibitions

**Q12.1.1**: What are the absolute "never do" rules?
- [ ] Never delete user code without explicit approval
- [ ] Never bypass failing tests
- [ ] Never invent APIs (validate against actual APIs)
- [ ] Never widen types to `any` silently
- [ ] Never change public contracts without version bump
- [ ] All of the above (mandatory)
- [ ] **Recommendation**: All of the above - these should be enforced at rule level, not just guidelines

**Q12.1.2**: How should prohibitions be enforced?
- [ ] Compile-time checks
- [ ] Runtime validation
- [ ] Rule engine enforcement
- [ ] All of the above
- [ ] **Recommendation**: All of the above - multiple layers of enforcement

**Q12.1.3**: Can prohibitions be overridden?
- [ ] No, absolute prohibitions
- [ ] Yes, with explicit user approval
- [ ] Yes, with audit log entry
- [ ] **Recommendation**: Yes, with explicit user approval and audit log entry - user has final control, but all overrides are logged

**Q12.1.4**: Should prohibitions be versioned?
- [ ] Yes, prohibitions may evolve
- [ ] No, fixed prohibitions
- [ ] **Recommendation**: Yes, prohibitions may evolve - but changes require explicit approval and versioning

### 12.2 Additional Prohibitions

**Q12.2.1**: Should there be prohibitions on model behavior?
- [ ] Never trust model output without validation
- [ ] Never use model output for security decisions
- [ ] Never allow model to modify system configuration
- [ ] All of the above
- [ ] **Recommendation**: All of the above - model is untrusted, validation is mandatory

**Q12.2.2**: Should there be prohibitions on execution?
- [ ] Never execute irreversible operations without approval
- [ ] Never execute operations that exceed resource limits
- [ ] Never execute operations with low confidence
- [ ] All of the above
- [ ] **Recommendation**: All of the above - execution safety is non-negotiable

**Q12.2.3**: Should there be prohibitions on learning?
- [ ] Never learn from user overrides of safety
- [ ] Never learn from emergency bypasses
- [ ] Never learn from incorrect outcomes
- [ ] All of the above
- [ ] **Recommendation**: All of the above - learning must be from positive, validated outcomes only

---

## 22. Best Practices & Research

### 8.1 Research Areas

**Q8.1.1**: What existing tools should be studied?
- [ ] Cursor (commercial IDE)
- [ ] GitHub Copilot (code completion)
- [ ] Devin (autonomous agent)
- [ ] SWE-agent (research)
- [ ] All of the above
- [ ] **Recommendation**: All of the above - learn from existing solutions, avoid their mistakes

**Q8.1.2**: What academic papers should be reviewed?
- [ ] AI planning systems
- [ ] Code generation quality
- [ ] Autonomous software engineering
- [ ] All relevant papers
- [ ] **Recommendation**: All relevant papers - academic research provides proven techniques

**Q8.1.3**: What open-source projects should be analyzed?
- [ ] VS Code (editor architecture)
- [ ] Language servers (LSP)
- [ ] Code analysis tools (ESLint, TypeScript)
- [ ] All relevant projects
- [ ] **Recommendation**: All relevant projects - open-source provides implementation patterns

**Q8.1.4**: Should formal methods research be reviewed?
- [ ] Yes, contracts and invariants
- [ ] No, too theoretical
- [ ] **Recommendation**: Yes, contracts and invariants - formal methods provide proven techniques for correctness

### 8.2 Implementation Patterns

**Q8.2.1**: What design patterns should be used?
- [ ] Strategy pattern (planning strategies)
- [ ] Factory pattern (model providers)
- [ ] Observer pattern (event system)
- [ ] All relevant patterns
- [ ] **Recommendation**: All relevant patterns - use proven patterns for maintainability

**Q8.2.2**: How should code be organized?
- [ ] Feature-based (by domain)
- [ ] Layer-based (by technical layer)
- [ ] Hybrid (features within layers)
- [ ] **Recommendation**: Hybrid - features within layers for organization and testability

**Q8.2.3**: What testing patterns should be followed?
- [ ] TDD (Test-Driven Development)
- [ ] BDD (Behavior-Driven Development)
- [ ] Property-based testing
- [ ] All of the above
- [ ] **Recommendation**: All of the above - TDD for core logic, BDD for user flows, property-based for edge cases

### 8.3 Code Quality Standards

**Q8.3.1**: What code quality metrics should be enforced?
- [ ] Cyclomatic complexity (complexity)
- [ ] Test coverage (quality)
- [ ] Code duplication (maintainability)
- [ ] All relevant metrics
- [ ] **Recommendation**: All relevant metrics - comprehensive quality measurement

**Q8.3.2**: What linting rules should be enforced?
- [ ] ESLint (JavaScript/TypeScript)
- [ ] Prettier (formatting)
- [ ] Custom project rules
- [ ] All of the above
- [ ] **Recommendation**: All of the above - standard rules + project-specific

**Q8.3.3**: How should code reviews be conducted?
- [ ] Automated only (AI + tools)
- [ ] Human review required
- [ ] Hybrid (automated + human for critical)
- [ ] **Recommendation**: Hybrid - automated for all code, human review for critical changes

---

## 23. Ambiguities Requiring Resolution

### 9.1 Planning Ambiguities

**Q9.1.1**: How should the system handle conflicting user requirements?
- [ ] Ask user to resolve
- [ ] Use project conventions
- [ ] Refuse and explain
- [ ] **Recommendation**: Refuse and explain - clarity over speed

**Q9.1.2**: What happens when a plan step becomes impossible during execution?
- [ ] Stop and ask user
- [ ] Regenerate plan
- [ ] Skip step and continue
- [ ] **Recommendation**: Stop and ask user - never proceed with invalid plan

**Q9.1.3**: How should the system handle partial plan execution?
- [ ] Rollback all changes
- [ ] Keep completed steps, ask about remaining
- [ ] Automatic recovery if possible
- [ ] **Recommendation**: Keep completed steps if valid, ask about remaining - user control

### 9.2 Code Generation Ambiguities

**Q9.2.1**: What should happen when model generates code that doesn't match project style?
- [ ] Auto-format to match style
- [ ] Warn user
- [ ] Regenerate with style constraints
- [ ] **Recommendation**: Auto-format first, regenerate if formatting insufficient

**Q9.2.2**: How should the system handle model hallucinations (non-existent APIs)?
- [ ] Validate against actual APIs
- [ ] Trust model output
- [ ] Warn and ask user
- [ ] **Recommendation**: Validate against actual APIs - never trust model blindly

**Q9.2.3**: What should happen when generated code conflicts with existing code?
- [ ] Merge automatically
- [ ] Ask user to resolve
- [ ] Regenerate with conflict resolution
- [ ] **Recommendation**: Ask user to resolve - never auto-merge conflicting semantics

### 9.3 Execution Ambiguities

**Q9.3.1**: How should the system handle external file changes during execution?
- [ ] Stop execution
- [ ] Continue with warning
- [ ] Merge changes
- [ ] **Recommendation**: Stop execution - safety first, user resolves conflicts

**Q9.3.2**: What happens when a test fails during execution?
- [ ] Stop execution
- [ ] Continue with warning
- [ ] Auto-fix and retry
- [ ] **Recommendation**: Stop execution - tests are quality gates

**Q9.3.3**: How should the system handle resource exhaustion (memory, disk)?
- [ ] Stop and warn user
- [ ] Clean up and continue
- [ ] Refuse operation
- [ ] **Recommendation**: Stop and warn user - resource management is critical

---

## 24. Recommendations & Decisions

### 10.1 Architecture Recommendations

**R10.1.1**: **Event-Driven Core with Synchronous Critical Path**
- Use event bus for decoupling components
- Use synchronous calls for quality-critical operations (planning, validation)
- **Rationale**: Decoupling for flexibility, synchronization for quality guarantees

**R10.1.2**: **Layered Architecture with Clear Boundaries**
- Presentation layer (UI)
- Application layer (orchestration)
- Domain layer (business logic)
- Infrastructure layer (external services)
- **Rationale**: Clear separation of concerns, testability, maintainability

**R10.1.3**: **Plugin Architecture for Extensibility**
- Core system is fixed and quality-focused
- Extensions via plugins for optional features
- **Rationale**: Core quality guaranteed, extensibility for flexibility

### 10.2 Quality Recommendations

**R10.2.1**: **Zero Tolerance for Broken Code**
- Never show broken code to user
- Compile gate + auto-fix loop mandatory
- Refuse if cannot fix
- **Rationale**: Quality over speed, user trust

**R10.2.2**: **Comprehensive Testing Strategy**
- Unit tests for all logic
- Integration tests for workflows
- E2E tests for user flows
- Mutation testing for quality validation
- **Rationale**: Defense in depth, quality assurance

**R10.2.3**: **Structured Logging for Everything**
- All decisions logged
- All errors logged with context
- Audit trail for compliance
- **Rationale**: Debugging, learning, compliance

### 10.3 Autonomy Recommendations

**R10.3.1**: **Refuse When Uncertain**
- Better to refuse than generate wrong code
- Explain refusal clearly
- Offer resolution paths
- **Rationale**: Autonomy requires confidence, uncertainty breaks trust

**R10.3.2**: **Learn from Outcomes**
- Track what works
- Track what fails
- Improve based on data
- **Rationale**: Continuous improvement, better autonomy over time

**R10.3.3**: **User Override Always Available**
- Autonomy is default, not mandatory
- User can always intervene
- User decisions are logged and learned from
- **Rationale**: User control, trust building

### 10.4 Consistency Recommendations

**R10.4.1**: **Project Conventions are Law**
- Learn and enforce project conventions
- Never deviate without user approval
- Consistency over creativity
- **Rationale**: Code quality, maintainability

**R10.4.2**: **Deterministic Generation**
- Fixed temperature (≤ 0.2)
- Versioned prompts
- Idempotent outputs
- **Rationale**: Consistency, reproducibility

**R10.4.3**: **Version Everything**
- Code versions
- Plan versions
- Config versions
- Model versions
- **Rationale**: Reproducibility, debugging, rollback

---

## Next Steps

1. **Answer All Questions**: Review each question and provide answers
2. **Document Decisions**: Create `DECISIONS.md` with all answers
3. **Update Architecture**: Refine architecture based on decisions
4. **Create Implementation Plan**: Break down into detailed implementation steps
5. **Begin Implementation**: Start with critical quality foundations

---

## Summary

This document contains **280+ questions** covering:
- Architecture & system design (18 questions)
- Planning confidence & ambiguity system (12 questions)
- Specification completeness gate (7 questions)
- Design quality gate (7 questions)
- Invariant system (9 questions)
- Semantic change classification (5 questions)
- Agent architecture & criticality (10 questions)
- Cross-agent consistency (6 questions)
- Pipeline & rollback semantics (8 questions)
- Test intent verification (7 questions)
- Learning quarantine system (7 questions)
- Human escalation protocol (7 questions)
- Deterministic execution envelope (8 questions)
- UI components & UX (13 questions)
- Database & persistence (10 questions)
- API endpoints & IPC (13 questions)
- Security & privacy (10 questions)
- Error handling & recovery (12 questions)
- Type system & type safety (10 questions)
- Learning system & bias control (10 questions)
- Absolute prohibitions (10 questions)
- Best practices & research (10 questions)
- Ambiguities (9 questions)
- Recommendations (12 recommendations)

### Key Enhancements Based on Feedback

1. **Planning Confidence Score**: Mandatory confidence computation with explicit thresholds and factors
2. **Ambiguity Classification**: Three-class system (Must Ask, Resolve via Conventions, System Limitation)
3. **Agent Criticality Levels**: Three-level system (Informational, Advisory, Critical) with execution guarantees
4. **Rollback Classification**: Three-class system (Reversible, Compensatable, Irreversible) with explicit handling
5. **Execution Lock-In Point**: Clear definition of when assumptions are frozen
6. **UI Edit Invalidation**: User edits invalidate all prior assumptions
7. **Learning Boundaries**: Explicit forbidden and allowed learning sources
8. **Error Learning Control**: Error type labeling prevents learning bad patterns
9. **Model Fallback Rules**: Pre-approval and re-validation required
10. **Runtime Validation Zones**: Clear boundaries for where validation occurs
11. **Absolute Prohibitions**: Hard rules enforced at system level
12. **Offline-Only Mode**: Explicit mode for sensitive environments

All questions are designed to ensure **quality, autonomy, and consistency** with a focus on **anticipation and planning**.

**Key Principle**: Answer these questions **before** implementation to avoid costly rework and ensure quality from the start.

---

## Critical Enhancements Based on Expert Feedback

### 1. Planning Confidence Score (MANDATORY)

**Problem Identified**: No defined confidence model, "uncertainty" was subjective.

**Solution**: 
- **Planning Confidence Score** computed during planning phase
- **Inputs**: Ambiguity count/severity, rule violations, contract completeness, dependency certainty, test coverage expectations
- **Rules**: Below threshold → refuse, Borderline → ask, Above threshold → proceed
- **Mandatory**: Always computed and logged for audit trail

**Implementation Questions**: Q2.1.1 - Q2.1.5

### 2. Ambiguity Classification System

**Problem Identified**: No distinction between recoverable, irreducible, and false ambiguity.

**Solution**:
- **Class A (Must Ask User)**: Critical ambiguity affecting architecture, security, persistence, public APIs
- **Class B (Resolve via Conventions)**: Recoverable ambiguity resolved using project conventions (logged)
- **Class C (System Limitation)**: False ambiguity - system lacks knowledge, explain and refuse
- **Happens During Planning**: All ambiguities classified before execution

**Implementation Questions**: Q2.2.1 - Q2.2.6

### 3. Agent Criticality Levels

**Problem Identified**: Async agents reporting late could allow execution to advance too far.

**Solution**:
- **Level 0 (Informational)**: Non-blocking, can report late
- **Level 1 (Advisory)**: Blocks execution advancement, must complete before execution
- **Level 2 (Critical)**: Blocks planning approval, must complete before planning
- **Hard Guarantee**: Async agents with Level ≥1 must complete before execution lock-in

**Implementation Questions**: Q3.1.1 - Q3.2.3

### 4. Rollback Classification

**Problem Identified**: Rollback semantics underspecified for different operation types.

**Solution**:
- **Reversible**: Code changes, config (full rollback)
- **Compensatable**: DB migrations with down scripts (compensatory rollback)
- **Irreversible**: External APIs, file deletions (no rollback)
- **Planning Rule**: Refuse irreversible steps unless user explicitly accepts

**Implementation Questions**: Q4.1.1 - Q4.1.5

### 5. Execution Lock-In Point

**Problem Identified**: No clear definition of when assumptions are frozen.

**Solution**:
- **Lock-In Point**: After change graph validation, confidence score validation, all Level ≥1 agents complete
- **After Lock-In**: No more assumptions, no more ambiguity resolution, no more plan modifications
- **Reversible**: Only if critical error detected or user explicitly requests

**Implementation Questions**: Q4.2.1 - Q4.2.3

### 6. UI Edit Invalidation

**Problem Identified**: User edits may invalidate safety assumptions, agent guarantees, confidence scores.

**Solution**:
- **Any User Edit Must**: Invalidate prior plan confidence, trigger full re-planning, re-run ambiguity detection
- **Never Allow**: "Partial trust" after edits - all assumptions reset
- **UI Must Never**: Become a bypass channel - all UI actions go through planning pipeline

**Implementation Questions**: Q2.1.3a, Q2.1.5

### 7. Learning Boundaries

**Problem Identified**: No definition of what learning is forbidden, risk of silent behavior drift.

**Solution**:
- **Forbidden Learning**: User overrides of safety refusals, emergency bypasses, known incorrect outcomes
- **Allowed Learning**: Successful executions, passing tests, explicit user confirmations
- **Validation Required**: Cross-validate, require confirmation, test patterns before applying

**Implementation Questions**: Q11.1.1 - Q11.1.5

### 8. Error Learning Control

**Problem Identified**: System may learn to "work around" errors instead of fixing root causes.

**Solution**:
- **Error Labeling**: Tooling error (learnable), Model error (learnable), User error (not learnable), Environment error (not learnable)
- **Learning Rules**: Only tooling and model errors learnable by default
- **Prevent Workarounds**: Only learn fixes, require root cause analysis, validate fixes don't introduce new problems

**Implementation Questions**: Q11.2.1 - Q11.2.2

### 9. Model Fallback Rules

**Problem Identified**: Different models = different reasoning = non-determinism, fallbacks threaten consistency.

**Solution**:
- **Pre-Approval Required**: Fallbacks must be pre-approved per project
- **Environment Change**: Fallback treated as "environment change"
- **Re-Validation**: Trigger re-validation and confidence recomputation
- **Never Silent**: Never silently fall back - always notify and re-validate

**Implementation Questions**: Q4.2.1a

### 10. Runtime Validation Zones

**Problem Identified**: Runtime validation location unclear - everywhere or only boundaries?

**Solution**:
- **Validation Zones**: External input, IPC boundaries, generated code entry points
- **Avoid**: Runtime validation deep inside internal logic (prevents noise)
- **Clear Boundaries**: Define explicit zones, validate at boundaries only

**Implementation Questions**: Q7.2.1a, Q4.1.5

### 11. Absolute Prohibitions

**Problem Identified**: Safety implied but no hard taboos for autonomy.

**Solution**:
- **Never Delete User Code**: Without explicit approval
- **Never Bypass Failing Tests**: Tests are quality gates
- **Never Invent APIs**: Validate against actual APIs
- **Never Widen Types to `any`**: Silently
- **Never Change Public Contracts**: Without version bump
- **Enforcement**: At rule level, not just guidelines

**Implementation Questions**: Q12.1.1 - Q12.2.3

### 12. Offline-Only Mode

**Problem Identified**: Security section excellent but missing explicit offline mode.

**Solution**:
- **Explicit Offline-Only Mode**: For sensitive environments
- **Blocks All Network Access**: Mandatory for sensitive code
- **Configurable**: User can enable for privacy

**Implementation Questions**: Q5.1.1a

### 13. Design Quality Gate

**Problem Identified**: Code quality ≠ correctness. System validates types/tests/contracts/rules but doesn't evaluate design quality.

**Solution**:
- **Design Quality Agent (Level 2 - Critical)**: Evaluates cohesion, coupling, layer violations, architectural drift, over/under-engineering, pattern alignment
- **Mandatory Gate**: Between planning and execution
- **Output**: Pass/Fail, structured critique, suggested refactors
- **Rule**: Code generation refused if design quality score < threshold, even if types/tests pass

**Implementation Questions**: Q4.1.1 - Q4.2.3

### 14. Specification Completeness Gate

**Problem Identified**: Confidence validated but not spec completeness. Implicit behavior can leak into generated code.

**Solution**:
- **Specification Completeness Gate**: Before planning approval
- **Requirements**: Every public function has inputs, outputs, error semantics, side-effects. Every state mutation is explicit. Persistence boundaries declared. Sync/async behavior declared.
- **Rule**: If spec completeness < 100% for public surfaces → refuse
- **Non-Goals Section**: Mandatory for every plan (what this change does NOT do)

**Implementation Questions**: Q3.1.1 - Q3.2.4

### 15. Invariant System

**Problem Identified**: Contracts mentioned but not invariants. Generated code must prove invariants, not just satisfy types.

**Solution**:
- **Invariant Layer (Mandatory)**: Invariants must always hold true
- **Checked At**: Plan validation, execution, tests, runtime (critical paths)
- **Examples**: "This function must not mutate global state", "This operation must be idempotent", "This service must be side-effect free"
- **Key Rule**: Generated code must prove (or test) invariants, not just satisfy types

**Implementation Questions**: Q5.1.1 - Q5.3.2

### 16. Semantic Change Classification

**Problem Identified**: AST diffs mentioned but semantic impact not enforced. Essential for autonomy in large codebases.

**Solution**:
- **Semantic Change Classification (Mandatory)**: Each change classified as behavior-preserving, behavior-extending, behavior-modifying, or behavior-breaking
- **Rules**: Behavior-modifying or breaking changes require explicit user approval, migration plan, version bump
- **Validation**: Compare actual vs planned semantic classification

**Implementation Questions**: Q6.1.1 - Q6.2.5

### 17. Test Intent Verification

**Problem Identified**: Tests generated but test intent not verified. Tests may not actually assert intended behavior.

**Solution**:
- **Test Intent Agent (Level 1)**: Verifies tests fail before fix, pass after fix, assert intended behavior (not implementation details), no tautological tests
- **Rule**: Tests that don't fail before fix invalidate the plan

**Implementation Questions**: Q10.1.1 - Q10.1.7

### 18. Learning Quarantine

**Problem Identified**: Learning is allowed/forbidden/validated but not staged. Risk of slow poisoning.

**Solution**:
- **Learning Quarantine**: New learning stored as candidate, applied only in "shadow mode", requires N successful confirmations, explicit promotion to active learning
- **Prevents**: Slow poisoning of the system

**Implementation Questions**: Q11.1.1 - Q11.1.7

### 19. Cross-Agent Consistency Check

**Problem Identified**: Agents may individually pass but contradict each other.

**Solution**:
- **Cross-Agent Consistency Validator (Level 2)**: Checks planning vs execution, test vs contract, type vs runtime validation
- **Rule**: Any contradiction → planning refused

**Implementation Questions**: Q8.1.1 - Q8.1.6

### 20. Human Escalation Protocol

**Problem Identified**: "Ask user" is ambiguous. Need explicit protocol.

**Solution**:
- **Escalation Protocol**: When blocking, provide what is blocked, why, evidence, exact decision choices, consequences, require explicit acknowledgment
- **Prevents**: Ambiguous user approvals

**Implementation Questions**: Q12.1.1 - Q12.1.7

### 21. Determinism Hash-Level Guarantees

**Problem Identified**: Determinism mentioned but not how to enforce it.

**Solution**:
- **Deterministic Execution Envelope**: Include model version hash, prompt template hash, context snapshot hash, toolchain version hash in logs
- **Rule**: Same envelope → same output, or system flags non-determinism

**Implementation Questions**: Q13.1.1 - Q13.1.8

---

## Additional Critical Enhancements (Latest Round)

### 22. Design Quality Gate (MANDATORY)

**Problem Identified**: Code quality ≠ correctness. System validates types/tests/contracts/rules but doesn't evaluate design quality.

**Solution**:
- **Design Quality Agent (Level 2 - Critical)**: Evaluates cohesion, coupling, layer violations, architectural drift, over/under-engineering, pattern alignment
- **Mandatory Gate**: Between planning and execution
- **Output**: Pass/Fail, structured critique, suggested refactors
- **Rule**: Code generation refused if design quality score < threshold, even if types/tests pass

**Implementation Questions**: Q4.1.1 - Q4.2.3

### 23. Specification Completeness Gate

**Problem Identified**: Confidence validated but not spec completeness. Implicit behavior can leak into generated code.

**Solution**:
- **Specification Completeness Gate**: Before planning approval
- **Requirements**: Every public function has inputs, outputs, error semantics, side-effects. Every state mutation is explicit. Persistence boundaries declared. Sync/async behavior declared.
- **Rule**: If spec completeness < 100% for public surfaces → refuse
- **Non-Goals Section**: Mandatory for every plan (what this change does NOT do)

**Implementation Questions**: Q3.1.1 - Q3.2.4

### 24. Invariant System

**Problem Identified**: Contracts mentioned but not invariants. Generated code must prove invariants, not just satisfy types.

**Solution**:
- **Invariant Layer (Mandatory)**: Invariants must always hold true
- **Checked At**: Plan validation, execution, tests, runtime (critical paths)
- **Examples**: "This function must not mutate global state", "This operation must be idempotent", "This service must be side-effect free"
- **Key Rule**: Generated code must prove (or test) invariants, not just satisfy types

**Implementation Questions**: Q5.1.1 - Q5.3.2

### 25. Semantic Change Classification

**Problem Identified**: AST diffs mentioned but semantic impact not enforced. Essential for autonomy in large codebases.

**Solution**:
- **Semantic Change Classification (Mandatory)**: Each change classified as behavior-preserving, behavior-extending, behavior-modifying, or behavior-breaking
- **Rules**: Behavior-modifying or breaking changes require explicit user approval, migration plan, version bump
- **Validation**: Compare actual vs planned semantic classification

**Implementation Questions**: Q6.1.1 - Q6.2.5

### 26. Test Intent Verification

**Problem Identified**: Tests generated but test intent not verified. Tests may not actually assert intended behavior.

**Solution**:
- **Test Intent Agent (Level 1)**: Verifies tests fail before fix, pass after fix, assert intended behavior (not implementation details), no tautological tests
- **Rule**: Tests that don't fail before fix invalidate the plan

**Implementation Questions**: Q10.1.1 - Q10.1.7

### 27. Learning Quarantine

**Problem Identified**: Learning is allowed/forbidden/validated but not staged. Risk of slow poisoning.

**Solution**:
- **Learning Quarantine**: New learning stored as candidate, applied only in "shadow mode", requires N successful confirmations, explicit promotion to active learning
- **Prevents**: Slow poisoning of the system

**Implementation Questions**: Q11.1.1 - Q11.1.7

### 28. Cross-Agent Consistency Check

**Problem Identified**: Agents may individually pass but contradict each other.

**Solution**:
- **Cross-Agent Consistency Validator (Level 2)**: Checks planning vs execution, test vs contract, type vs runtime validation
- **Rule**: Any contradiction → planning refused

**Implementation Questions**: Q8.1.1 - Q8.1.6

### 29. Human Escalation Protocol

**Problem Identified**: "Ask user" is ambiguous. Need explicit protocol.

**Solution**:
- **Escalation Protocol**: When blocking, provide what is blocked, why, evidence, exact decision choices, consequences, require explicit acknowledgment
- **Prevents**: Ambiguous user approvals

**Implementation Questions**: Q12.1.1 - Q12.1.7

### 30. Determinism Hash-Level Guarantees

**Problem Identified**: Determinism mentioned but not how to enforce it.

**Solution**:
- **Deterministic Execution Envelope**: Include model version hash, prompt template hash, context snapshot hash, toolchain version hash in logs
- **Rule**: Same envelope → same output, or system flags non-determinism

**Implementation Questions**: Q13.1.1 - Q13.1.8

### 13. Schema Migration Planning

**Problem Identified**: Persistence strong but schema migrations not explicitly planned.

**Solution**:
- **Planned Migrations**: Schema migrations themselves must be planned and versioned
- **Never Automatic**: Migrations require explicit planning and approval
- **Versioned**: Migrations are versioned like code

**Implementation Questions**: Q3.1.5

### 14. Error Causality Chains

**Problem Identified**: Multi-dimensional classification excellent but missing causality tracking.

**Solution**:
- **Track Causality**: Parent-child error relationships, error propagation path, root cause
- **Full Chain**: Complete causality chain for debugging and learning
- **Prevent Cascade**: Understand what error caused what downstream

**Implementation Questions**: Q6.1.1a

### 15. Formal Methods Research

**Problem Identified**: Research comprehensive but missing formal methods.

**Solution**:
- **Review Formal Methods**: Contracts and invariants research
- **Proven Techniques**: Formal methods provide proven techniques for correctness
- **Integration**: Consider formal verification for critical components

**Implementation Questions**: Q8.1.4

---

## Implementation Priority

### Phase 1: Critical Foundations (Weeks 1-2)
1. Planning Confidence Score (Q2.1.1 - Q2.1.5)
2. Ambiguity Classification (Q2.2.1 - Q2.2.6)
3. Specification Completeness Gate (Q3.1.1 - Q3.2.4)
4. Design Quality Gate (Q4.1.1 - Q4.2.3)
5. Invariant System (Q5.1.1 - Q5.3.2)
6. Semantic Change Classification (Q6.1.1 - Q6.2.5)
7. Agent Criticality Levels (Q7.1.1 - Q7.2.3)
8. Cross-Agent Consistency (Q8.1.1 - Q8.1.6)
9. Execution Lock-In Point (Q9.2.1 - Q9.2.3)
10. Absolute Prohibitions (Q21.1.1 - Q21.2.3)

### Phase 2: Safety & Quality (Weeks 3-4)
11. Rollback Classification (Q9.1.1 - Q9.1.5)
12. Test Intent Verification (Q10.1.1 - Q10.1.7)
13. Learning Quarantine (Q11.1.1 - Q11.1.7)
14. Human Escalation Protocol (Q12.1.1 - Q12.1.7)
15. Deterministic Execution Envelope (Q13.1.1 - Q13.1.8)
16. Learning Boundaries (Q20.1.1 - Q20.1.5)
17. Error Learning Control (Q20.2.1 - Q20.2.2)
18. Runtime Validation Zones (Q19.2.1a, Q16.1.5)
19. Model Fallback Rules (Q16.2.1a)

### Phase 3: Enhanced Features (Weeks 5-6)
20. UI Edit Invalidation (Q14.1.3a, Q14.1.5)
21. Offline-Only Mode (Q17.1.1a)
22. Schema Migration Planning (Q15.1.5)
23. Error Causality Chains (Q18.1.1a)
24. Formal Methods Research (Q22.1.4)

---

## Next Steps

1. **Answer All Questions**: Review each question in priority order
2. **Document Decisions**: Create `DECISIONS.md` with all answers
3. **Update Architecture**: Refine architecture based on decisions
4. **Implement Critical Foundations**: Start with Phase 1
5. **Iterate**: Build, test, refine based on real-world usage

---

**Remember**: Quality, autonomy, and consistency are the most crucial parts. Anticipation and planning are crucial - all problems must be identified and resolved during planning, not execution.
