# Cursor Implementation Prompt — Quality First (Zero Regression)

## Objective
Implement the next feature or change with **maximum correctness, completeness, and integration quality**.  
**Speed is not a priority.** Reliability, maintainability, and correctness come first.

## 1. Mandatory Pre-Implementation Analysis

Before writing **any** code, you must perform a full analysis and explicitly document it.

### Required Analysis
- Deeply analyze the existing codebase:
  - Understand current behavior end-to-end.
  - Identify existing architectural patterns and conventions.
  - Locate similar implementations already present in the system.

- Enumerate all relevant elements:
  - Files (frontend, backend, shared)
  - API endpoints (routes, methods, authentication, validation)
  - Components, hooks, services, and utilities
  - State management and data flow
  - Environment variables, configuration, feature flags

- Identify dependencies and integration points:
  - External services (APIs, storage, auth, messaging, etc.)
  - Internal shared services and modules
  - Database models, migrations, constraints
  - Frontend ↔ backend contracts (DTOs, schemas, types)

**Do not proceed to implementation until this analysis is complete and explicit.**


## 2. Implementation Rules (Strict)

All rules below are **mandatory**:

- Work in **small, self-contained, logically complete steps**
- If applicable, **implement and validate backend logic before frontend**
- **Reuse existing code whenever possible**:
  - Services
  - Hooks
  - Components
  - Utilities
  - Validation and error-handling logic
- **Do not introduce new abstractions** unless:
  - There is proven duplication or architectural debt
  - The need is explicitly justified
- No shortcuts
- No TODOs
- No commented-out code

### Unclear Requirements
If anything is unclear:
- **Stop immediately**
- Explain exactly what is unclear
- List all assumptions that would otherwise be required
- Do **not** guess or invent behavior


## 3. Quality & Safety Checks (Required)

Before a step is considered complete, verify and explicitly confirm:

- No steps were skipped
- Code compiles and runs without errors
- Types, schemas, and contracts are aligned
- No magic values or undocumented assumptions exist
- Errors are handled explicitly
- End-to-end integration works correctly:
  - UI
  - API
  - Database
  - State management
- Data flows correctly from input → processing → persistence → output

If any validation cannot be performed, explain **why** and what would be required.



## 4. Progress Tracking (Mandatory Output)

At the end of **every response**, display:

- Overall progress percentage
- Total number of steps
- Number of completed steps
- Number of remaining steps
- Clear description of the **next step**

### Format
Progress: X%
Steps completed: A / B
Remaining steps: C
Next step: <explicit description>

## 5. Execution Constraint

- Proceed **one step at a time only**
- Each step must leave the system in a **working, consistent, production-ready state**
- Never move forward with partial or broken implementations