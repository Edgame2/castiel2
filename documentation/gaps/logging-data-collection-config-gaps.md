# Gap Analysis: Logging Container — Data Collection Enable/Disable Config

**Date:** 2026-02-07  
**Scope:** containers/logging  
**Requirement:** Config file to enable/disable data collection per **event type**, **resource type**, and **category** (detailed).

---

## Executive Summary

| Area | Current State | Gap |
|------|---------------|-----|
| **Event-level collection** | All consumed events are stored; no per-event-type toggle | No config to enable/disable collection by event type (e.g. `auth.login.success`, `user.profile_updated`) |
| **Resource-type-level collection** | Not used as a filter before storage | No config to enable/disable by resource type (e.g. `user`, `tenant`, `secret`) |
| **Category-level collection** | Category is derived in eventMapper; no filter | No config to enable/disable by audit category (ACTION, ACCESS, SECURITY, SYSTEM, CUSTOM) |
| **Config file** | `defaults` covers capture/redaction/retention/hash_chain/alerts only | No `data_collection` section defining what to collect |
| **Severity / wildcards** | Not used as filters | No enable/disable by severity; no wildcard support for event types |

---

## 1. Current State

### 1.1 What Exists Today

- **RabbitMQ bindings** (`config/default.yaml` → `rabbitmq.bindings`, `rabbitmq.data_lake.bindings`, `rabbitmq.ml_audit.bindings`): Control *which events are consumed* (e.g. `auth.#`, `user.#`). If a binding is removed, those events are never received.
- **Event mapper** (`src/events/eventMapper.ts`): Maps each received event to `CreateLogInput` with `action` (= event type), `category` (from CATEGORY_MAP prefix), `severity`, `resourceType`/`resourceId` (from extractResource).
- **Consumer** (`src/events/consumers/AuditEventConsumer.ts`): For every message, calls `mapEventToLog(event)` then `ingestionService.ingest(logInput, ...)`. There is **no check** whether collection is enabled for that event type, category, or resource type.
- **Log types** (`src/types/log.types.ts`): `LogCategory` = ACTION, ACCESS, SECURITY, SYSTEM, CUSTOM; `AuditLog` has `action`, `category`, `resourceType`, `resourceId`.

### 1.2 What Is Missing

- A **config-driven allow/deny** that is applied *after* the event is received and mapped, *before* (or instead of) calling `ingest`, so that:
  - Collection can be turned **off** for specific event types (e.g. high-volume or PII-heavy events).
  - Collection can be turned **off** for specific resource types (e.g. don’t store `notification` if only auth/user/secret matter).
  - Collection can be turned **off** for entire categories (e.g. don’t store SYSTEM or CUSTOM).
- A **single, documented config section** (e.g. `data_collection`) that lists or references event types, resource types, and categories with an explicit enabled/disabled flag (or allowlist/denylist model).

---

## 2. Required Behavior (Detailed)

### 2.1 Config File: Enable/Disable by Event Type

- **Requirement:** The config file MUST allow enabling or disabling data collection **per event type** (e.g. `auth.login.success`, `user.profile_updated`, `secret.accessed`).
- **Detail:**
  - Event type = the `event.type` (or routing key) after normalization, e.g. `action` in `CreateLogInput`.
  - Wildcards: Config MUST support patterns (e.g. `auth.#`, `user.*`); matching order (e.g. most specific wins) MUST be documented. Options:
    - **Allowlist:** Only listed event types are collected; all others are dropped.
    - **Denylist:** All event types are collected except those listed.
    - **Explicit per-event:** Each event type has an `enabled: true | false` (or equivalent).
  - Config MUST be validated at load time (e.g. against schema) so invalid event types or values fail fast.
  - Default behavior (when no data_collection section, or when an event type is not mentioned) MUST be defined: e.g. “collect by default” or “don’t collect by default”.

### 2.2 Config File: Enable/Disable by Resource Type

- **Requirement:** The config file MUST allow enabling or disabling data collection **per resource type** (e.g. `user`, `tenant`, `team`, `role`, `invitation`, `secret`, `plan`, `notification`).
- **Detail:**
  - Resource type = the value set in `CreateLogInput.resourceType` (from `extractResource(event)` in eventMapper). For events that don’t map to a resource, `resourceType` may be null/empty.
  - Same allowlist/denylist/explicit-per-item choice as for event types.
  - When `resourceType` is null: Use the `resource_type.default` value in config (treat null as not listed).
  - Config MUST be validated at load time.

### 2.3 Config File: Enable/Disable by Category

- **Requirement:** The config file MUST allow enabling or disabling data collection **per audit category** (ACTION, ACCESS, SECURITY, SYSTEM, CUSTOM).
- **Detail:**
  - Category = `LogCategory` enum used in `CreateLogInput.category` (derived in eventMapper via `getCategory(event.type)`).
  - Same allowlist/denylist/explicit-per-category choice.
  - All five categories (ACTION, ACCESS, SECURITY, SYSTEM, CUSTOM) MUST be representable in config (e.g. each with `enabled: true | false`).
  - Config MUST be validated at load time.

### 2.4 Enable/Disable by Severity

- **Requirement:** The config file MUST allow enabling or disabling data collection **per severity** (DEBUG, INFO, WARN, ERROR, CRITICAL).
- **Detail:** Severity = `LogSeverity` in `CreateLogInput`. Each severity level MUST be configurable (e.g. `severity.DEBUG: false`). Unlisted severities = collect. Config MUST be validated at load time.

### 2.5 Evaluation: AND of All Dimensions

- **Requirement:** Collection is enabled only if **all** of category, resource type, event type, and severity allow it. If any dimension disables collection, the event is NOT collected.
- **Default when not listed:** **Collect.** So: category not listed → enabled; resource_type not listed (or null → use `resource_type.default`); event type not in denylist / in allowlist / explicit true → enabled; severity not listed → enabled.
- **Detail:** Evaluate each dimension, then AND the results. Document in config schema and logging README.

### 2.6 Scope: Main Audit Only; Other Destinations Separate

- **In scope:** Main audit log storage (IngestionService). When disabled, event MUST NOT be persisted to primary audit store.
- **Separate config:** Data Lake (Parquet), ML Audit (Blob), SIEM forward, and Archive have their **own** enable/disable or routing config; they do NOT use this `data_collection` section.

---

## 3. Proposed Config Structure (Example)

The following is a **proposal** for the config file; defaults and evaluation follow §4 Decisions.

```yaml
# Data collection: enable/disable what gets stored in the audit log
data_collection:
  # Default when no rule matches (per §4: collect when not listed)
  default: allow

  # Severity: per LogSeverity (DEBUG, INFO, WARN, ERROR, CRITICAL)
  severity:
    DEBUG:   false
    INFO:    true
    WARN:    true
    ERROR:   true
    CRITICAL: true

  # Category: per LogCategory (ACTION, ACCESS, SECURITY, SYSTEM, CUSTOM)
  category:
    ACTION:    true
    ACCESS:    true
    SECURITY:  true
    SYSTEM:    false
    CUSTOM:    true

  # Resource type: per resourceType (user, tenant, team, role, invitation, secret, plan, notification, or null)
  resource_type:
    default: true   # when resourceType is null or not listed
    user:          true
    tenant:        true
    team:          true
    role:          true
    invitation:    true
    secret:        true
    plan:          true
    notification:  false

  # Event type: allowlist, denylist, or explicit; supports wildcards (e.g. auth.#, user.*); most specific wins
  event_type:
    mode: denylist   # allowlist | denylist | explicit
    deny:
      - "notification.sent"
      - "plan.executed"
      - "notification.#"   # wildcard example
    # If allowlist:
    # allow:
    #   - "auth.login.success"
    #   - "auth.login.failed"
    # If explicit:
    # explicit:
    #   "auth.login.success": true
    #   "user.profile_updated": false
```

- **Schema:** The logging `config/schema.json` MUST be extended so that `data_collection` is validated: structure, category, resource_type, **severity**, event_type (including wildcard patterns), and `event_type.mode` with corresponding list/map.

---

## 4. Decisions (Resolved)

| Question | Decision |
|----------|----------|
| **Default when not listed** | **Collect** — when `data_collection` is absent or a dimension is not listed, the event is collected. |
| **Evaluation logic** | **AND** — all dimensions (category, resource type, event type, severity) must allow collection; if any disables, the event is not collected. |
| **Resource type when null** | Use **`resource_type.default`** in config (treat null as not listed). |
| **Data Lake / ML Audit / SIEM / Archive** | **Separate** — each destination has its own enable/disable or routing config; they do not use the main audit `data_collection` section. |
| **Tenant override** | **No** — no per-tenant override of data collection. |
| **Wildcards for event types** | **Yes** — config MUST support wildcard patterns (e.g. `auth.#`, `user.*`); most specific pattern wins. |
| **Filter by severity** | **Yes** — enable/disable MUST be configurable per severity (DEBUG, INFO, WARN, ERROR, CRITICAL). |


---

## 5. Implementation Notes (Non-Normative)

- **Consumer change:** In `AuditEventConsumer.handleMessage`, after `mapEventToLog(event)` and before `ingestionService.ingest(...)`, add `isCollectionEnabled(logInput, config.data_collection)` that returns boolean (AND of category, resource_type, event_type, severity); if false, skip ingest and optionally log at debug.
- **Event type matching:** Support wildcards (e.g. `auth.#`, `user.*`); match most specific pattern first. Severity and category are exact enum lookups.
- **Config access:** Pass resolved config (or the `data_collection` slice) into the consumer or a small helper so evaluation is consistent and testable.
- **Tests:** Unit tests for the evaluation function (category, resource type, event type with wildcards, severity; default collect; AND logic). Integration test: publish event that is disabled, assert no row in audit store.
- **Docs:** Update logging README and config schema description to document the new section and evaluation order.

---

## 6. Cross-References

- [containers/logging/README.md](../../containers/logging/README.md)
- [containers/logging/config/default.yaml](../../containers/logging/config/default.yaml)
- [containers/logging/config/schema.json](../../containers/logging/config/schema.json)
- [containers/logging/src/events/eventMapper.ts](../../containers/logging/src/events/eventMapper.ts)
- [containers/logging/src/events/consumers/AuditEventConsumer.ts](../../containers/logging/src/events/consumers/AuditEventConsumer.ts)
- [containers/logging/src/types/log.types.ts](../../containers/logging/src/types/log.types.ts)
- [containers/logging/docs/logs-events.md](../../containers/logging/docs/logs-events.md)

---

## 7. Recommendations

| Priority | Action |
|----------|--------|
| P1 | Add `data_collection` section to logging config with enable/disable by **event type** (with wildcards), **resource type**, **category**, and **severity**; extend schema and validate at load. Default when not listed: collect; evaluation: AND of all dimensions; null resourceType uses `resource_type.default`. |
| P2 | Implement `isCollectionEnabled(logInput, config)` (AND of category, resource_type, event_type with wildcard matching, severity) and use it in AuditEventConsumer before ingest; add unit and integration tests. |
| P2 | Document in README and schema; list supported event types (and wildcard rules), resource types, categories, and severities. |
| P3 | Add separate config for Data Lake, ML Audit, SIEM, and Archive if they need their own enable/disable rules. |

---

*End of logging data collection config gap analysis.*
