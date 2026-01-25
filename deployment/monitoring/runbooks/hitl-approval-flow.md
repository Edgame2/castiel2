# HITL Approval Flow — Plan §972

Design for **Human-in-the-Loop (HITL)** approvals: when high-risk, high-value opportunities exceed configurable thresholds, an approval workflow is triggered.  
Config, design, **approval API** (workflow-orchestrator: GET/POST hitl/approvals, Cosmos `hitl_approvals`), and **notification-manager** (eventMapper for `hitl.approval.requested`) are in place. See §5.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §8.4, §972.

---

## 1. Configuration (risk-analytics)

**risk-analytics** `config/default.yaml` and `config/schema.json`:

| Key | Default | Description |
|-----|---------|-------------|
| `feature_flags.hitl_approvals` | `false` | Enable HITL; when `true`, evaluate thresholds on risk evaluation. |
| `thresholds.hitl_risk_min` | `0.8` | Minimum risk score (0–1) to trigger approval. |
| `thresholds.hitl_deal_min` | `1_000_000` | Minimum deal amount to trigger approval. |

**Per-tenant overrides (Plan §8.4):**  
If **configuration-service** holds tenant overrides for `feature_flags.hitl_approvals`, `thresholds.hitl_risk_min`, `thresholds.hitl_deal_min`, risk-analytics (and any HITL participant) reads from configuration-service when present, else `config/default.yaml`.

---

## 2. Trigger condition

When **all** of the following hold, HITL is triggered:

- `feature_flags.hitl_approvals === true`
- `riskScore >= thresholds.hitl_risk_min` (from the latest risk evaluation)
- `amount >= thresholds.hitl_deal_min` (from c_opportunity / shard; `Amount` or equivalent)

Evaluation happens at **risk evaluation** time (e.g. after `risk.evaluated` is produced, or in the same flow before publishing).  
`opportunityId` = `c_opportunity` shard id; `tenantId` is required in all events and APIs.

---

## 3. Intended flow (design)

1. **risk-analytics**  
   - On risk evaluation: if HITL trigger condition is met, publish **`hitl.approval.requested`** (RabbitMQ, `coder_events`).  
   - Payload (min): `{ tenantId, opportunityId, riskScore, amount, requestedAt, correlationId?, approverRole? }`.

2. **workflow-orchestrator**  
   - Consumes `hitl.approval.requested`; creates approval in Cosmos `hitl_approvals` (partition `tenantId`).  
   - `HitlApprovalService`; assigns to configured approvers (role-based or from config).  
   - **Done:** workflow-orchestrator; persistence in `hitl_approvals`. See §5.

3. **notification-manager**  
   - **Done:** Consumes `hitl.approval.requested` (eventConsumer uses `#`; eventMapper maps to NotificationInput). **Payload must include** `ownerId` or `approverId` or `recipientId` so a notification can be sent; `tenantId`, `opportunityId` required.  
   - Sends IN_APP + EMAIL, criticality HIGH; `actionUrl` from `eventData.approvalUrl` if set.  
   - risk-analytics (or workflow-orchestrator) must include at least one of `ownerId`, `approverId`, `recipientId` when publishing.

4. **Approve / Reject**  
   - **Done:** workflow-orchestrator `GET /api/v1/hitl/approvals/:id`, `POST .../approve` (body `{ decidedBy, comment? }`), `POST .../reject`.  
   - Handler: update approval in `hitl_approvals`, publish **`hitl.approval.completed`** with `{ tenantId, opportunityId, approvalId, approved, decidedBy, decidedAt }`. See §5.

5. **Audit**  
   - **`hitl.approval.requested`** — who requested, when, for which opportunity; can be consumed by **logging** (MLAuditConsumer or a dedicated HITL audit consumer) → Blob/audit store.  
   - **`hitl.approval.completed`** — approve/reject decision; same audit path.  
   - Event format: `{ domain }.{ entity }.{ action }`; include `tenantId` in all payloads.

---

## 4. Event summary

| Event | Publisher | Payload (min) | Consumers (intended) |
|-------|-----------|---------------|----------------------|
| `hitl.approval.requested` | risk-analytics | tenantId, opportunityId, riskScore, amount, requestedAt; **ownerId** or **approverId** or **recipientId** (for notification) | workflow-orchestrator (or dedicated approval), **notification-manager** (eventMapper), logging/audit |
| `hitl.approval.completed` | workflow-orchestrator (HitlApprovalService, on approve/reject) | tenantId, opportunityId, approvalId, approved, decidedBy, decidedAt | logging/audit, optional risk-analytics |

---

## 5. Implementation status (was TBD)

- **notification-manager:** ~~Event binding and template~~ — Done: eventMapper handles `hitl.approval.requested`; IN_APP + EMAIL. Require `ownerId` or `approverId` or `recipientId` in payload.
- **Approval API / callback:** ~~TBD~~ — **Done.** **workflow-orchestrator:** `GET /api/v1/hitl/approvals/:id`, `POST /api/v1/hitl/approvals/:id/approve` (body: `{ decidedBy, comment? }`), `POST /api/v1/hitl/approvals/:id/reject`. Persistence: Cosmos `hitl_approvals` (partition `tenantId`). Consumer for `hitl.approval.requested` creates approval; approve/reject publish `hitl.approval.completed`. `HitlApprovalService`, `WorkflowEventPublisher.publishHitlApprovalCompleted`; `logs-events.md`, OpenAPI.
- **Documents:** Done: `hitl.approval.requested` and `hitl.approval.completed` in logging `docs/logs-events.md`; MLAuditConsumer bindings in `config/default.yaml` and `README.md`.

---

## 6. References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §8.4, §972
- [audit-event-flow.md](audit-event-flow.md) – `hitl.approval.requested`, `hitl.approval.completed` → MLAuditConsumer
- `containers/risk-analytics/config/default.yaml`, `config/schema.json`, `src/config/index.ts`
