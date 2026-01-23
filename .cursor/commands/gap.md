# Cursor Full Gap Analysis Prompt — Exhaustive & Zero-Assumption

## Objective
Perform a **complete, end-to-end gap analysis** of the system or feature under review.  
The analysis must be **as thorough as possible**, identifying **all missing pieces, inconsistencies, risks, and errors**.

This is an **analysis-only task**.  
**Do not implement fixes. Do not refactor. Do not modify code.**

---

## 1. Scope Definition (Mandatory)

Before analysis begins, explicitly state:
- What is being analyzed:
  - Feature
  - Module
  - Service
  - Entire application
- What is **in scope**
- What is **out of scope**
- Assumptions about environment, runtime, and usage

If scope is ambiguous:
- Stop
- List the ambiguities
- Do not proceed until they are clarified

---

## 2. System Inventory & Mapping (Required)

Build a complete inventory of the system as it currently exists.

### Enumerate and map:
- Files and directories
- Backend services and APIs
- Frontend components and pages
- State management layers
- Database models, schemas, migrations
- External integrations and dependencies
- Environment variables and configuration
- Feature flags and conditional logic

### For each element, document:
- Purpose
- Responsibilities
- Inputs and outputs
- Dependencies
- Ownership within the system

---

## 3. Expected vs Actual Behavior Analysis

For each major workflow and feature:
- Define the **expected behavior**
- Describe the **actual behavior** based on the current implementation
- Identify mismatches, omissions, and contradictions

Include:
- Happy paths
- Edge cases
- Failure modes
- Error handling behavior

---

## 4. Gap Identification (Core Requirement)

Identify **all gaps**, including but not limited to:

### Functional Gaps
- Missing features
- Partially implemented logic
- Incomplete workflows
- Broken or unreachable code paths

### Technical Gaps
- Missing validation
- Incorrect or unsafe assumptions
- Type mismatches
- Schema or contract inconsistencies
- Error handling gaps
- Logging and observability gaps

### Integration Gaps
- Frontend ↔ backend mismatches
- API contract violations
- Missing data propagation
- Incomplete persistence or retrieval logic

### Testing Gaps
- Missing unit tests
- Missing integration tests
- Missing regression coverage
- Untested edge cases

### UX & Product Gaps
- Broken or unclear UI flows
- Missing loading, empty, or error states
- Accessibility issues
- Inconsistent behavior across screens

### Security & Stability Gaps
- Auth or authorization weaknesses
- Input sanitization issues
- Data exposure risks
- Race conditions or concurrency issues

---

## 5. Error & Risk Classification (Required)

For **each identified gap or issue**, classify:
- Severity (Critical / High / Medium / Low)
- Impact (User, Data, Security, Stability)
- Likelihood of occurrence
- Affected components
- Whether it blocks production readiness

---

## 6. Root Cause Hypotheses (No Fixes)

For every major gap:
- Explain *why* it exists
- Identify architectural, process, or implementation causes
- Highlight repeated patterns or systemic issues

Do **not** propose fixes yet.

---

## 7. Completeness Checklist Validation

Explicitly confirm whether the system is complete across these dimensions:

- Feature completeness
- API completeness
- Data lifecycle completeness
- Error handling completeness
- State management completeness
- Test coverage completeness
- Documentation completeness

Call out **every missing or partial item**.

---

## 8. Prioritized Gap Summary (Required Output)

Produce a **prioritized, structured summary** including:

- Complete list of gaps and errors
- Grouped by category
- Ordered by severity and risk
- Clear indication of:
  - Must-fix before production
  - Should-fix soon
  - Nice-to-have improvements

---

## 9. Execution Constraint

- This task is **analysis only**
- No code changes
- No refactors
- No speculative fixes
- No assumptions without explicit callout

---

## 10. Final Confidence Statement

End with:
- An explicit statement of confidence level in the analysis
- Known blind spots or limitations
- What additional information would improve accuracy

---
