# Plan Review: Quality-First IDE Implementation

## Executive Summary

This document reviews the current implementation plan against the comprehensive quality requirements in `todo.md`. It identifies critical gaps, proposes missing steps, and provides extensive questions to guide implementation decisions.

**Current Status**: 85 steps completed (stub implementations)
**Gaps Identified**: 25+ critical quality-focused features missing
**New Steps Needed**: ~30 additional steps

---

## Critical Gaps Analysis

### 1. FORMAL INTENT & SPECIFICATION LAYER (CRITICAL GAP)

**Current State**: 
- `PlanGenerator` receives raw `userRequest: string`
- No structured intent parsing
- No ambiguity detection
- No requirement disambiguation

**Required (from todo.md III)**:
- Convert user input to structured spec (JSON/protobuf)
- Explicit: Goal, Non-goals, Scope, Constraints, Language/Framework/Versions
- Detect ambiguity
- Ask clarification if >1 valid interpretation
- Refuse if constraints conflict

**Missing Steps**:
- **Step 86**: Implement `IntentInterpreter` - Convert natural language to structured intent spec
- **Step 87**: Implement `RequirementDisambiguationAgent` - Detect ambiguities and ask clarifying questions
- **Step 88**: Implement `IntentSpecValidator` - Validate structured intent and detect conflicts

**Questions**:
1. What format should structured intent use? (JSON Schema, Protobuf, custom TypeScript types?)
2. How should ambiguity detection work? (LLM-based, rule-based, hybrid?)
3. What level of ambiguity triggers clarification? (Any ambiguity, or only critical ambiguities?)
4. Should the system learn from user clarifications to improve future disambiguation?
5. How should constraint conflicts be resolved? (User choice, automatic resolution, refusal?)
6. Should intent specs be persisted for learning and audit trails?
7. What happens if user refuses to clarify? (Refuse generation, proceed with assumptions, ask again?)

---

### 2. CHANGE GRAPH GENERATION (CRITICAL GAP)

**Current State**:
- Plans have steps but no explicit change graph
- No pre-execution symbol tracking
- No dependency impact analysis before code generation

**Required (from todo.md V, 2.3)**:
- Explicit list of files to modify
- Explicit list of symbols: Added, Modified, Deleted
- Dependency impact analysis
- Backward compatibility analysis
- Risk classification per change
- Change size limiter (LOC/AST nodes)

**Missing Steps**:
- **Step 89**: Implement `ChangeGraphBuilder` - Create change graph from plan before execution
- **Step 90**: Implement `SymbolTracker` - Track all symbols (added/modified/deleted) per change
- **Step 91**: Implement `ImpactAnalyzer` - Analyze dependency impact and backward compatibility
- **Step 92**: Implement `ChangeSizeLimiter` - Enforce maximum change size (LOC/AST nodes)

**Questions**:
1. When should change graph be generated? (During planning, before execution, both?)
2. How should change size limits be configured? (Per project, per file, per change type?)
3. What should happen if change exceeds limit? (Split into smaller changes, refuse, warn?)
4. How should backward compatibility be analyzed? (Type checking, API surface analysis, tests?)
5. Should change graphs be persisted for audit and rollback?
6. How should risk classification work? (Rule-based, ML-based, user-defined?)
7. Should change graphs be validated against actual code changes after execution?

---

### 3. AST PATCH GENERATION (CRITICAL GAP)

**Current State**:
- `CodeGenerationService` generates raw text code
- No AST patch system
- Direct file writes without AST validation

**Required (from todo.md VII, 3.2)**:
- AST patch generation (not raw text)
- Patch types: insert_function, modify_function, add_import, add_test
- Enforced formatting via formatter
- Enforced linting rules
- Diff preview mandatory

**Missing Steps**:
- **Step 93**: Implement `ASTPatchGenerator` - Convert model output to AST patches
- **Step 94**: Implement `ASTPatchApplier` - Apply AST patches to files safely
- **Step 95**: Implement `PatchValidator` - Validate patches before application
- **Step 96**: Enhance `CodeGenerationService` - Use AST patches instead of raw text

**Questions**:
1. Which AST library should be used? (TypeScript Compiler API, Babel, tree-sitter, language-specific?)
2. How should patches be represented? (JSON, custom format, language-specific AST format?)
3. What happens if patch application fails? (Rollback, manual fix, retry with different patch?)
4. Should patches be previewed before application? (Always, configurable, only for large changes?)
5. How should formatting be enforced? (Prettier, ESLint --fix, custom formatter?)
6. Should patches support undo/redo operations?
7. How should patches handle conflicts with external changes?
8. Should patches be stored for audit and replay?

---

### 4. CONTRACT-FIRST GENERATION (CRITICAL GAP)

**Current State**:
- Code generation happens in one pass
- No separation of contracts from implementation
- No validation of contracts before implementation

**Required (from todo.md VI, 3.1)**:
- Generate contracts before implementations
- Generate types before logic
- Generate interfaces before classes
- Generate signatures before bodies
- Refuse to generate implementation until contracts compile

**Missing Steps**:
- **Step 97**: Implement `ContractGenerator` - Generate interfaces, types, signatures first
- **Step 98**: Implement `ContractValidator` - Validate contracts compile before implementation
- **Step 99**: Enhance `CodeGenerationService` - Two-phase generation (contracts → implementation)
- **Step 100**: Implement `ContractEnforcer` - Ensure all generated code follows contract-first pattern

**Questions**:
1. How should contracts be represented? (TypeScript interfaces, separate contract files, inline?)
2. What happens if contract generation fails? (Retry, ask user, refuse?)
3. Should contracts be persisted separately from implementation?
4. How should contract validation work? (TypeScript compiler, custom validator, both?)
5. Should contracts be versioned independently of implementation?
6. How should contract changes be handled? (Breaking changes, migration, versioning?)
7. Should contracts be documented separately?

---

### 5. SEMANTIC RULES ENGINE (CRITICAL GAP)

**Current State**:
- `ValidationService` exists but no framework-specific semantic rules
- No React hooks validation
- No async/await pattern enforcement
- No framework-specific best practices

**Required (from todo.md X, 4.2)**:
- Hand-written semantic rules
- React hooks only at top level
- No async calls in constructors
- DB access only in repository layer
- Controllers must validate inputs
- All external calls must have timeouts
- All async functions must be awaited or returned

**Missing Steps**:
- **Step 101**: Implement `SemanticRulesEngine` - Framework-agnostic rule engine
- **Step 102**: Implement `ReactRules` - React-specific semantic rules
- **Step 103**: Implement `NodeRules` - Node.js-specific semantic rules
- **Step 104**: Implement `FrameworkAdapterRegistry` - Register rules per framework
- **Step 105**: Integrate semantic rules into `ValidationService`

**Questions**:
1. How should rules be defined? (TypeScript classes, JSON config, DSL, all of the above?)
2. Should rules be project-configurable or global?
3. How should rule violations be handled? (Blocking, warnings, auto-fix?)
4. Should rules be composable? (Can users combine multiple rule sets?)
5. How should custom project rules be added? (Config file, UI, code?)
6. Should rules be versioned with framework versions?
7. How should rule performance be optimized? (Caching, incremental checking, parallel execution?)
8. Should rules support learning from project patterns?

---

### 6. COMPILER-BACKED INDEX (ENHANCEMENT NEEDED)

**Current State**:
- `ASTAnalyzer` parses files but no full compiler-backed index
- No symbol table
- No type graph
- No call graph
- No import graph
- No test coverage map

**Required (from todo.md IV.A)**:
- Full AST for every file
- Symbol table
- Type graph
- Call graph
- Import graph
- Module boundaries
- Test coverage map

**Missing Steps**:
- **Step 106**: Implement `SymbolTable` - Build and maintain symbol table from AST
- **Step 107**: Implement `TypeGraph` - Build type dependency graph
- **Step 108**: Implement `CallGraph` - Build function/method call graph
- **Step 109**: Implement `ImportGraph` - Build module import dependency graph
- **Step 110**: Implement `TestCoverageMap` - Map test files to source files
- **Step 111**: Implement `CompilerBackedIndex` - Unified compiler-backed index aggregating all graphs

**Questions**:
1. Should the index be incremental or full rebuild? (Incremental for performance, full for accuracy?)
2. How should the index be persisted? (Memory, disk cache, database?)
3. How should index staleness be detected? (File watchers, timestamps, checksums?)
4. Should the index support multiple languages? (TypeScript first, then others?)
5. How should index updates be triggered? (On file change, on demand, periodic?)
6. Should the index support queries? (What calls this function? What uses this type?)
7. How should index performance be optimized? (Lazy loading, caching, parallel building?)

---

### 7. COMPILE GATE WITH AUTO-FIX LOOP (CRITICAL GAP)

**Current State**:
- `ValidationService` validates but no compile gate
- No automatic fix loop
- No "no broken code visible" enforcement

**Required (from todo.md IX.A, 4.1)**:
- Zero type errors (hard stop)
- Zero warnings (configurable)
- Strict mode enforced
- Generate → Compile → Fix → Repeat loop
- No human sees broken code

**Missing Steps**:
- **Step 112**: Implement `CompileGate` - Hard stop on compilation errors
- **Step 113**: Implement `AutoFixLoop` - Automatic fix loop until compilation passes
- **Step 114**: Implement `ErrorParser` - Parse compiler errors and map to AST nodes
- **Step 115**: Implement `ErrorRepairer` - Repair errors based on compiler feedback
- **Step 116**: Enhance `CodeGenerationService` - Integrate compile gate and auto-fix loop

**Questions**:
1. How many auto-fix iterations should be allowed? (Configurable limit, infinite until success?)
2. What happens if auto-fix fails after N iterations? (Ask user, refuse, partial fix?)
3. How should compiler errors be categorized? (Type errors, syntax errors, semantic errors?)
4. Should auto-fix be conservative or aggressive? (Minimal changes, comprehensive fixes?)
5. How should auto-fix decisions be logged? (For learning, audit, debugging?)
6. Should auto-fix be configurable per error type? (Some errors auto-fix, others require user?)
7. How should auto-fix handle ambiguous errors? (Multiple possible fixes?)

---

### 8. DETERMINISTIC GENERATION CONTROLS (GAP)

**Current State**:
- `CodeGenerationService` uses `temperature: 0.7` (too high)
- No fixed system prompts
- No idempotent output enforcement

**Required (from todo.md VIII)**:
- Temperature ≤ 0.2
- Fixed system prompts
- No creativity mode
- Stable naming
- Idempotent outputs
- Retry = deterministic delta, not re-roll

**Missing Steps**:
- **Step 117**: Implement `DeterministicGenerator` - Wrapper enforcing deterministic generation
- **Step 118**: Implement `PromptTemplateManager` - Fixed, versioned prompt templates
- **Step 119**: Implement `IdempotencyEnforcer` - Ensure idempotent outputs
- **Step 120**: Update `CodeGenerationService` - Use deterministic settings (temp ≤ 0.2)

**Questions**:
1. Should temperature be configurable or fixed? (Fixed at 0.2, or user-configurable with max 0.2?)
2. How should prompt templates be versioned? (Git, version numbers, semantic versioning?)
3. How should idempotency be tested? (Run same request twice, compare outputs?)
4. Should deterministic mode be optional or mandatory? (Always on, or user can disable?)
5. How should deterministic generation handle model differences? (Same model always, or model-agnostic?)
6. Should prompt templates be project-specific or global?

---

### 9. REFUSAL SYSTEM (CRITICAL GAP)

**Current State**:
- No explicit refusal mechanism
- System proceeds even with low confidence
- No uncertainty detection

**Required (from todo.md XVII, 7.1)**:
- Refuse if incomplete requirements
- Refuse if conflicting constraints
- Refuse if unknown runtime environment
- Refuse if multiple valid architectures exist
- Explain refusal precisely
- Offer resolution paths

**Missing Steps**:
- **Step 121**: Implement `RefusalSystem` - Detect conditions requiring refusal
- **Step 122**: Implement `UncertaintyDetector` - Detect low-confidence situations
- **Step 123**: Implement `RefusalExplainer` - Explain refusals and offer solutions
- **Step 124**: Integrate refusal system into `PlanGenerator` and `CodeGenerationService`

**Questions**:
1. What confidence threshold triggers refusal? (Configurable, fixed, context-dependent?)
2. How should refusals be presented to users? (Error message, dialog, inline explanation?)
3. Should users be able to override refusals? (Force proceed, or strict refusal?)
4. How should refusal reasons be logged? (For learning, audit, debugging?)
5. Should the system learn from user overrides? (If user overrides, was refusal wrong?)
6. How should resolution paths be generated? (LLM-generated, rule-based, template-based?)

---

### 10. DIFF-AWARE REPAIR (GAP)

**Current State**:
- `RootCauseAnalyzer` exists but no diff-aware repair
- No constraint on repair scope

**Required (from todo.md 5.2, XIII)**:
- Repair agent limited to lines it generated
- Direct dependencies only
- Never rewrite unrelated code
- Root-cause analysis via symbol graph

**Missing Steps**:
- **Step 125**: Implement `DiffTracker` - Track what code was generated/changed
- **Step 126**: Implement `DiffAwareRepairer` - Repair only generated code, not unrelated code
- **Step 127**: Implement `RepairScopeLimiter` - Limit repairs to direct dependencies only
- **Step 128**: Enhance `RootCauseAnalyzer` - Use symbol graph for root cause analysis

**Questions**:
1. How should generated code be tracked? (Line numbers, AST nodes, git diff, all of the above?)
2. What defines "direct dependencies"? (Imports, function calls, type usage, all?)
3. How should repair scope violations be detected? (Static analysis, runtime checks, both?)
4. Should repair scope be configurable? (Strict, lenient, user-defined?)
5. How should repair attempts be logged? (For audit, learning, debugging?)

---

### 11. HISTORICAL BUG MEMORY (GAP)

**Current State**:
- No bug pattern memory
- No fix pattern learning
- No regression prevention

**Required (from todo.md XV.B, 6.2)**:
- Bug patterns storage
- Fix patterns storage
- Regression prevention rules
- Learn from past bugs

**Missing Steps**:
- **Step 129**: Implement `BugMemory` - Store bug patterns and fixes
- **Step 130**: Implement `BugPatternLearner` - Learn from bug fixes
- **Step 131**: Implement `RegressionPreventer` - Prevent known bug patterns
- **Step 132**: Integrate bug memory into `CodeGenerationService` and `ValidationService`

**Questions**:
1. How should bug patterns be represented? (Code patterns, AST patterns, semantic patterns?)
2. How should bug memory be persisted? (Database, files, in-memory with disk backup?)
3. Should bug memory be project-specific or global? (Per project, shared across projects?)
4. How should bug patterns be matched? (Exact match, fuzzy match, semantic match?)
5. Should users be able to add/remove bug patterns manually?
6. How should bug memory be versioned? (With code versions, independent versioning?)

---

### 12. MULTI-AGENT ARCHITECTURE (ARCHITECTURAL GAP)

**Current State**:
- Component-based architecture
- No explicit agent structure
- No agent pipeline enforcement

**Required (from todo.md II.A, II.B)**:
- Intent Interpreter Agent
- Requirement Disambiguation Agent
- Planning Agent
- Context Selection Agent
- Code Generation Agent
- Static Analysis Agent
- Test Generation Agent
- Execution Agent
- Repair Agent
- Risk Assessment Agent
- Policy Enforcement Agent
- Each agent: narrow scope, machine-readable output, cannot bypass validation
- Pipeline enforcement: no agent may skip stage, resumable, debuggable

**Missing Steps**:
- **Step 133**: Implement `AgentBase` - Base class for all agents
- **Step 134**: Implement `AgentPipeline` - Enforce agent execution pipeline
- **Step 135**: Refactor existing components into agents (PlanningAgent, CodeGenerationAgent, etc.)
- **Step 136**: Implement `AgentOrchestrator` - Coordinate agent execution

**Questions**:
1. Should agents be synchronous or asynchronous? (Sync for simplicity, async for performance?)
2. How should agent outputs be validated? (Schema validation, type checking, both?)
3. Should agents be composable? (Can agents call other agents?)
4. How should agent failures be handled? (Retry, fallback, user intervention?)
5. Should agents support parallel execution? (Independent agents in parallel?)
6. How should agent execution be logged? (For debugging, audit, learning?)
7. Should agents be replaceable? (Plugin architecture, or fixed agents?)

---

### 13. STRUCTURED OUTPUTS ONLY (GAP)

**Current State**:
- Model outputs are free text
- JSON parsing is best-effort
- No guaranteed structured output

**Required (from todo.md I, 817)**:
- No text-only generation → structured outputs only
- All LLM outputs must be structured (JSON, XML, etc.)

**Missing Steps**:
- **Step 137**: Implement `StructuredOutputEnforcer` - Ensure all model outputs are structured
- **Step 138**: Implement `OutputSchemaValidator` - Validate outputs against schemas
- **Step 139**: Update all model calls to require structured output
- **Step 140**: Implement `OutputParser` - Parse and validate structured outputs

**Questions**:
1. What structured format should be used? (JSON Schema, JSON, XML, Protobuf, all of the above?)
2. How should structured output failures be handled? (Retry, fallback to text, refuse?)
3. Should output schemas be versioned? (With code, independent versioning?)
4. How should schema validation errors be presented? (To user, to repair agent, both?)
5. Should schemas be project-configurable or global?

---

### 14. VERSION AWARENESS (ENHANCEMENT NEEDED)

**Current State**:
- No explicit version tracking
- No feature availability matrix

**Required (from todo.md IV.B)**:
- Language version
- Framework version
- Dependency versions
- Feature availability matrix

**Missing Steps**:
- **Step 141**: Implement `VersionDetector` - Detect language, framework, dependency versions
- **Step 142**: Implement `FeatureAvailabilityMatrix` - Map features to versions
- **Step 143**: Implement `VersionValidator` - Validate code against version constraints
- **Step 144**: Integrate version awareness into `CodeGenerationService`

**Questions**:
1. How should versions be detected? (package.json, runtime detection, config file, all?)
2. How should feature availability be determined? (Rule-based, database, LLM-based?)
3. Should version constraints be enforced? (Block incompatible code, warn, allow?)
4. How should version mismatches be handled? (Suggest upgrades, refuse, proceed with warning?)

---

### 15. EXPLAIN WHY THIS WORKS (GAP)

**Current State**:
- No code explanation requirement
- No correctness explanation

**Required (from todo.md 4.4)**:
- Force model to explain why code is correct
- What assumptions it makes
- Edge cases handled
- If explanation is weak → regenerate

**Missing Steps**:
- **Step 145**: Implement `CodeExplainer` - Generate explanations for generated code
- **Step 146**: Implement `ExplanationValidator` - Validate explanation quality
- **Step 147**: Integrate explanation into `CodeGenerationService` - Require explanations
- **Step 148**: Implement `ExplanationUI` - Display explanations to users

**Questions**:
1. What format should explanations use? (Natural language, structured, both?)
2. How should explanation quality be measured? (Length, coverage, clarity, all?)
3. What happens if explanation is weak? (Regenerate code, ask user, proceed with warning?)
4. Should explanations be persisted? (For audit, learning, documentation?)
5. Should explanations be editable by users?

---

## Additional Quality Features from todo.md

### 16. Code Generation Rules Enforcement

**Missing Steps**:
- **Step 149**: Implement `CodeGenerationRulesEnforcer` - Enforce all rules from todo.md VI:
  - No inline magic values
  - No duplicated logic
  - No re-implementation of existing utilities
  - No dead code
  - No unused exports
  - No silent error swallowing
  - Explicit error types only

### 17. Context Ranking and Management

**Missing Steps**:
- **Step 150**: Implement `ContextRanker` - Rank files by relevance
- **Step 151**: Implement `ContextLimiter` - Limit context size deterministically
- **Step 152**: Implement `ContextProvenance` - Track context source and freshness

### 18. Confidence & Risk Modeling

**Missing Steps**:
- **Step 153**: Implement `ConfidenceScorer` - Score confidence per change
- **Step 154**: Implement `RiskClassifier` - Classify risk per change
- **Step 155**: Integrate confidence/risk into UI and decision-making

---

## Summary of New Steps

**Total New Steps Needed**: ~30 steps (Steps 86-155)

**Critical Priority** (Must have for quality):
- Steps 86-88: Intent & Specification Layer
- Steps 89-92: Change Graph
- Steps 93-96: AST Patch Generation
- Steps 97-100: Contract-First Generation
- Steps 101-105: Semantic Rules Engine
- Steps 112-116: Compile Gate & Auto-Fix
- Steps 121-124: Refusal System
- Steps 137-140: Structured Outputs

**High Priority** (Strongly recommended):
- Steps 106-111: Compiler-Backed Index
- Steps 117-120: Deterministic Generation
- Steps 125-128: Diff-Aware Repair
- Steps 129-132: Bug Memory

**Medium Priority** (Nice to have):
- Steps 133-136: Multi-Agent Architecture
- Steps 141-144: Version Awareness
- Steps 145-148: Code Explanations
- Steps 149-155: Additional Quality Features

---

## Comprehensive Questions List

### Intent & Specification (Questions 1-7)
See Section 1 above.

### Change Graph (Questions 8-14)
See Section 2 above.

### AST Patches (Questions 15-22)
See Section 3 above.

### Contract-First (Questions 23-29)
See Section 4 above.

### Semantic Rules (Questions 30-37)
See Section 5 above.

### Compiler-Backed Index (Questions 38-44)
See Section 6 above.

### Compile Gate (Questions 45-51)
See Section 7 above.

### Deterministic Generation (Questions 52-57)
See Section 8 above.

### Refusal System (Questions 58-63)
See Section 9 above.

### Diff-Aware Repair (Questions 64-68)
See Section 10 above.

### Bug Memory (Questions 69-74)
See Section 11 above.

### Multi-Agent Architecture (Questions 75-81)
See Section 12 above.

### Structured Outputs (Questions 82-86)
See Section 13 above.

### Version Awareness (Questions 87-90)
See Section 14 above.

### Code Explanations (Questions 91-95)
See Section 15 above.

### General Architecture Questions (96-110)

96. Should the IDE support multiple languages from the start, or TypeScript first?
97. How should the IDE handle very large codebases? (Incremental analysis, sampling, full analysis?)
98. Should the IDE support distributed execution? (Multiple machines, cloud, local only?)
99. How should the IDE handle real-time collaboration? (Multiple users, conflicts, synchronization?)
100. Should the IDE support offline mode? (Local models only, cached responses, full offline?)
101. How should the IDE handle model API failures? (Retry, fallback models, user notification?)
102. Should the IDE support custom model fine-tuning? (User-provided models, fine-tuned models?)
103. How should the IDE handle sensitive code? (Local processing only, encryption, access controls?)
104. Should the IDE support plugin architecture? (Third-party plugins, extensibility, security?)
105. How should the IDE handle performance optimization? (Caching, lazy loading, background processing?)
106. Should the IDE support undo/redo for all operations? (Full history, selective undo, limitations?)
107. How should the IDE handle concurrent plan executions? (Queue, parallel, sequential?)
108. Should the IDE support plan templates? (Reusable plans, plan libraries, plan sharing?)
109. How should the IDE handle user preferences? (Per-project, global, both?)
110. Should the IDE support analytics and telemetry? (Usage tracking, error reporting, performance metrics?)

### Testing & Quality Questions (111-120)

111. What test coverage threshold should be enforced? (80%, 90%, configurable, per-project?)
112. Should mutation testing be mandatory or optional? (Always, on-demand, configurable?)
113. How should test generation failures be handled? (Retry, manual test creation, proceed without tests?)
114. Should the IDE support property-based testing? (Always, optional, framework-specific?)
115. How should test data be managed? (Generated, user-provided, both?)
116. Should the IDE support test parallelization? (Automatic, configurable, sequential?)
117. How should flaky tests be handled? (Retry, mark as flaky, fail immediately?)
118. Should the IDE support test debugging? (Step-through, breakpoints, logging?)
119. How should test performance be optimized? (Caching, incremental testing, parallel execution?)
120. Should the IDE support test visualization? (Coverage reports, test graphs, execution traces?)

### User Experience Questions (121-130)

121. How should plan visualization work? (Tree, graph, timeline, all of the above?)
122. Should users be able to edit plans? (Full editing, limited editing, view-only?)
123. How should execution progress be displayed? (Progress bar, step-by-step, real-time logs?)
124. Should the IDE support keyboard shortcuts? (VS Code style, custom, configurable?)
125. How should errors be displayed? (Inline, panel, modal, all of the above?)
126. Should the IDE support themes? (Light, dark, custom, VS Code themes?)
127. How should the IDE handle large outputs? (Pagination, virtualization, streaming?)
128. Should the IDE support search and filtering? (Plans, code, context, all?)
129. How should the IDE handle notifications? (Desktop, in-app, configurable?)
130. Should the IDE support accessibility? (Screen readers, keyboard navigation, ARIA labels?)

---

## Implementation Recommendations

### Phase 1: Critical Quality Foundations (Weeks 1-4)
Implement Steps 86-100, 112-116, 121-124, 137-140
- Intent & Specification Layer
- Change Graph
- AST Patch Generation
- Contract-First Generation
- Compile Gate & Auto-Fix
- Refusal System
- Structured Outputs

### Phase 2: Enhanced Quality (Weeks 5-8)
Implement Steps 101-111, 117-120, 125-132
- Semantic Rules Engine
- Compiler-Backed Index
- Deterministic Generation
- Diff-Aware Repair
- Bug Memory

### Phase 3: Advanced Features (Weeks 9-12)
Implement Steps 133-155
- Multi-Agent Architecture
- Version Awareness
- Code Explanations
- Additional Quality Features

---

## Next Steps

1. **Answer Critical Questions**: Prioritize and answer questions 1-95 (critical gaps)
2. **Design Decisions**: Make architectural decisions based on answers
3. **Update Plan**: Add new steps 86-155 to the implementation plan
4. **Prioritize**: Determine which steps are MVP vs. post-MVP
5. **Begin Implementation**: Start with Phase 1 critical quality foundations

---

## Conclusion

The current plan provides a solid foundation but is missing ~30 critical quality-focused steps. The gaps are primarily in:
- Intent understanding and disambiguation
- Structured code generation (AST patches, contract-first)
- Quality enforcement (semantic rules, compile gates, refusal)
- Learning and improvement (bug memory, explanations)

Addressing these gaps will transform the IDE from a functional tool to a quality-first, autonomous code generation system that truly prioritizes correctness over speed.


. STRUCTURED INTENT & AMBIGUITY
1. What format should structured intent use?

Answer:
JSON Schema as the canonical format, with generated language-specific bindings (TypeScript types, Protobuf if needed later).

Why

JSON Schema:

Human-readable (debuggable, auditable)

Machine-validated

Versionable

Works well with LLM structured output

Protobuf:

Too rigid early

Harder to evolve

Poor for ad-hoc constraints

Recommendation

Canonical: JSON Schema

Runtime: validated JSON objects

Developer ergonomics: auto-generate TS types

2. How should ambiguity detection work?

Answer:
Hybrid system (rule-based first, LLM second).

Details

Rule-based:

Detect missing required fields

Detect multi-valued interpretations (e.g. auth type, environment)

LLM-based:

Detect semantic ambiguity

Detect intent underspecification

Detect multiple valid architectures

Why

Rules catch obvious ambiguity deterministically

LLM catches higher-level ambiguity humans miss

3. What level of ambiguity triggers clarification?

Answer:
Only critical ambiguity triggers clarification.

Critical ambiguity = ambiguity that affects:

Architecture

Security

Persistence

Public APIs

Backward compatibility

Data loss risk

Non-critical ambiguity

Naming

Logging format

Internal structure
→ resolved automatically using conventions.

4. Should the system learn from user clarifications?

Answer:
Yes — but conservatively.

Rules

Learn project-specific defaults

Never generalize across projects

Never override explicit user intent

Store learning as preference rules, not model weights

Example:

"When user says auth → means JWT"

5. How should constraint conflicts be resolved?

Answer:
Refuse by default.

Resolution order

Explicit user constraints win

Project constraints override inferred intent

Automatic resolution only if:

Safe

Reversible

Low-risk

Otherwise → ask or refuse.

6. Should intent specs be persisted?

Answer:
Yes, always.

Reasons

Audit trail

Reproducibility

Debugging autonomy failures

Regression analysis

Legal / compliance traceability

7. What if user refuses to clarify?

Answer:
Refuse generation.

Reason

Autonomous system must prefer no code over wrong code.

Proceeding with assumptions destroys trust and quality guarantees.

II. CHANGE GRAPH & PLANNING
1. When should change graph be generated?

Answer:
Twice.

Initial graph during planning (expected changes)

Final graph after execution (actual changes)

Then diff them.

2. How should change size limits be configured?

Answer:
Hierarchical configuration

Global project limit

Per-file limit

Per-change-type limit

Example:

New feature: larger allowance

Refactor: very strict

Hotfix: minimal

3. What if change exceeds limit?

Answer (in order):

Automatically split into smaller changes

If split not possible → ask user

If user refuses → refuse execution

4. How should backward compatibility be analyzed?

Answer:
Multi-layer analysis

Public API surface diff

Type compatibility analysis

Symbol visibility changes

Contract tests

Snapshot tests (only for public APIs)

No single method is sufficient.

5. Should change graphs be persisted?

Answer:
Yes, always.

Why

Rollback

Audit

Diff validation

Future regression detection

6. How should risk classification work?

Answer:
Rule-based core + user overrides

Risk factors

Public API changes

Security boundaries crossed

Data schema changes

Test coverage delta

Novel patterns

ML may assist later, but rules must dominate.

7. Should change graphs be validated post-execution?

Answer:
Yes — mandatory.

If actual changes ≠ planned changes:

Block finalization

Investigate drift

Regenerate or refuse

III. AST PATCHING & APPLICATION
1. Which AST library should be used?

Answer:
Language-specific, compiler-grade ASTs only.

Examples:

TypeScript: TypeScript Compiler API

Python: LibCST / ast + typing

Java: Eclipse JDT

Rust: rust-analyzer / syn

Avoid

Babel (lossy types)

tree-sitter (syntax only)

2. How should patches be represented?

Answer:
Structured JSON patch format referencing AST nodes.

Example:

{
  "op": "insert",
  "target": "FunctionDeclaration:UserService.reset",
  "payload": {...}
}


Never raw text diffs.

3. What if patch application fails?

Answer (strict):

Rollback immediately

Diagnose failure

Regenerate patch

Retry (limited attempts)

If still failing → refuse

Never leave partial state.

4. Should patches be previewed?

Answer:
Yes, always.

Even in autonomous mode:

Preview exists

User may opt out of viewing, not of generation

5. How should formatting be enforced?

Answer:
Toolchain-native formatting only

Order:

Apply patch

Run formatter (Prettier, gofmt, rustfmt)

Run linter --fix

Re-parse AST to confirm validity

6. Should patches support undo/redo?

Answer:
Yes — mandatory.

Undo/redo is trivial if patches are atomic and persisted.

7. How should patches handle conflicts?

Answer:
Hard stop + rebase logic.

Detect file changed externally

Rebase patch on new AST

If rebase ambiguous → ask user

Never auto-merge conflicting semantics

8. Should patches be stored?

Answer:
Yes, permanently (with retention policy).

Uses:

Replay

Debug

Forensics

Regression prevention

I. CONTRACTS (INTERFACES, TYPES, API SHAPES)
1. How should contracts be represented?

Answer:
Language-native contracts, declared explicitly, not inline.

TypeScript: exported interface / type

Stored in:

contracts/ or

types/ or

alongside implementation but separately declared

Never anonymous inline types for public or cross-layer boundaries

Reason:
Explicit contracts enable validation, versioning, diffing, and enforcement.

2. What happens if contract generation fails?

Answer:
Fail fast → retry once → refuse.

Order:

Retry generation with stricter constraints

If still failing → refuse and explain missing info

Never proceed to implementation without valid contracts.

3. Should contracts be persisted separately from implementation?

Answer:
Yes. Mandatory for any non-trivial system.

Contracts must:

Exist independently

Be analyzable without implementation

Survive refactors

4. How should contract validation work?

Answer:
Both compiler + custom validator.

Compiler:

Type correctness

Structural soundness

Custom validator:

Naming conventions

Error types

Nullability rules

Async guarantees

Compiler alone is insufficient.

5. Should contracts be versioned independently?

Answer:
Yes, if contracts are public or cross-module.

Internal-only contracts: implicit versioning via git

Public / shared contracts: explicit semantic version

6. How should contract changes be handled?

Answer:
Strict breaking-change discipline.

Breaking change detected → block execution

Require:

New version

Migration path

Compatibility analysis

Automatic migration only if provably safe

7. Should contracts be documented separately?

Answer:
Yes, automatically.

Generated docs from contracts

Source of truth = contract, not prose

Documentation is derived, never handwritten

II. RULE SYSTEM (SEMANTIC, STYLE, SAFETY)
1. How should rules be defined?

Answer:
All of the above, with hierarchy.

Core rules: TypeScript / code

Configurable rules: JSON / YAML

Advanced rules: DSL (optional)

Rule logic must be executable, not descriptive only.

2. Should rules be project-configurable or global?

Answer:
Both.

Priority:

Project rules

Framework rules

Global safety rules (non-overridable)

3. How should rule violations be handled?

Answer:
Default = blocking.

Blocking: correctness, safety, architecture

Auto-fix: mechanical issues

Warnings: cosmetic only

4. Should rules be composable?

Answer:
Yes. Mandatory.

Allow rule sets:

Framework

Organization

Project

Deterministic composition order

5. How should custom project rules be added?

Answer:
Config file + code extension.

Config for declarative rules

Code for semantic rules

UI optional, never required

6. Should rules be versioned with framework versions?

Answer:
Yes.

Each framework adapter ships its own rule version

Rule changes are treated like breaking changes

7. How should rule performance be optimized?

Answer:

Incremental checking

Rule result caching

AST-node scoped execution

Parallel execution where safe

Never skip rules for speed.

8. Should rules support learning from project patterns?

Answer:
Yes, but only as suggestions.

Observed patterns → propose new rules

Human / config approval required

Never auto-enforce learned rules

III. CODE INDEX (AST, SYMBOLS, DEPENDENCIES)
1. Incremental or full rebuild?

Answer:
Incremental by default, full rebuild for validation.

Incremental: speed

Full rebuild:

CI

After dependency changes

After tool upgrades

2. How should the index be persisted?

Answer:
Hybrid.

Memory: hot queries

Disk cache: restart resilience

Optional DB for very large repos

3. How should index staleness be detected?

Answer:
Multiple signals.

File watchers

Timestamps

Content checksums

Dependency graph invalidation

4. Should the index support multiple languages?

Answer:
Yes, but sequentially.

One language = one adapter

Shared query interface

Never mix ASTs across languages

5. How should index updates be triggered?

Answer:

File change → incremental update

Dependency change → rebuild affected subgraph

On demand → explicit rebuild

6. Should the index support queries?

Answer:
Yes. Mandatory.

Examples:

Who calls this?

What depends on this?

Is this public?

What breaks if I change this?

7. How should index performance be optimized?

Answer:

Lazy AST loading

Query result caching

Parallel parsing

Priority scheduling

Accuracy > speed.

IV. AUTO-FIX / REPAIR LOOP
1. How many auto-fix iterations?

Answer:
Configurable hard limit (default 3–5).

Infinite loops are forbidden.

2. What if auto-fix fails after N iterations?

Answer:
Refuse and explain.

Optionally:

Present partial diff

Ask for guidance

Never silently accept broken code.

3. How should compiler errors be categorized?

Answer:

Syntax errors

Type errors

Semantic / logic errors

Toolchain errors

Each category has different repair strategies.

4. Conservative or aggressive auto-fix?

Answer:
Always conservative.

Minimal diff

Local scope

No speculative refactors

5. How should auto-fix decisions be logged?

Answer:
Structured logs.

Error

Root cause

Patch

Outcome

Used for audit and learning.

6. Should auto-fix be configurable per error type?

Answer:
Yes. Mandatory.

Some errors:

Auto-fix allowed
Others:

Require user input

7. How should ambiguous errors be handled?

Answer:
Ask or refuse.

Never guess between multiple valid fixes.

V. DETERMINISM & PROMPTS
1. Should temperature be configurable?

Answer:
Fixed (≤ 0.2).

No user override in autonomous mode.

2. How should prompt templates be versioned?

Answer:
Git + semantic versioning.

Prompt changes are treated as code changes.

3. How should idempotency be tested?

Answer:

Run same intent twice

Compare:

Change graph

AST diff

Output hashes

Non-idempotent behavior is a bug.

4. Deterministic mode optional or mandatory?

Answer:
Mandatory for autonomous execution.

Optional only for manual / exploratory mode.

5. How should deterministic generation handle model differences?

Answer:
Pin model per project.

Model changes require:

Re-validation

Re-certification

6. Should prompt templates be project-specific?

Answer:
Layered.

Global base templates

Framework templates

Project overrides

VI. REPAIR SCOPE CONTROL
1. How should generated code be tracked?

Answer:
All of the above.

AST node IDs (primary)

Git diff

File + line ranges

2. What defines “direct dependencies”?

Answer:
Union of:

Imports

Function calls

Type usage

Inheritance / implementation

3. How should repair scope violations be detected?

Answer:
Static analysis.

Runtime checks are too late.

4. Should repair scope be configurable?

Answer:
Yes, but strict by default.

Strict: generated code only

Lenient: + direct dependencies

User-defined only with warning

5. How should repair attempts be logged?

Answer:
Structured, persistent logs.

Required for:

Debugging

Trust

Learning

VII. EXPLANATIONS
1. What format should explanations use?

Answer:
Both structured + natural language.

Structured:

What changed

Why

Assumptions

Edge cases

Natural language:

Human readability

2. How should explanation quality be measured?

Answer:

Coverage (matches change graph)

Specificity

Consistency with code

Absence of vague claims

3. What if explanation is weak?

Answer:
Regenerate code + explanation.

Weak explanation implies weak reasoning.

4. Should explanations be persisted?

Answer:
Yes.

They are part of the audit trail.

5. Should explanations be editable by users?

Answer:
View-only by default.

Editable only as annotations, never overwriting system explanation.

FINAL RULE (REITERATED)

If the system cannot explain why the code is correct, it must not generate it.