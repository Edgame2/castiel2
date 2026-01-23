# Prompt System – Implementation Plan

This plan adds a multi-tenant prompt system with clear scoping for Super Admin, Tenant Admin, and Users; optimized for vector search (RAG), and designed to fit into the existing AI Insights orchestration and services.

## 1) Goals & Scope
- Provide reusable AI prompts with three scopes: System (Super Admin only), Tenant (Tenant Admin), User (end users).
- Keep strict tenant isolation and leverage existing vector search and context assembly for grounding.
- Allow versioning, activation, preview, and optional A/B testing.
- Integrate with the existing insight orchestration without breaking current flows.

Out of scope: building a marketplace of shared prompts across tenants; cross-tenant sharing is explicitly excluded.

## 2) Roles & Permissions
- Super Admin
	- Full CRUD on System prompts (system-only use; not visible/selectable by tenants/users).
	- Can view tenant-level telemetry for prompt performance.
- Tenant Admin
	- CRUD on Tenant prompts for their tenant.
	- May inherit from a System prompt by cloning and customizing.
- User
	- CRUD on their own prompts (owner-scoped). Can propose promotion to tenant admins for review/activation.

Enforce RBAC in API layer and UI routing. All write operations require appropriate role and tenant context.

## 3) Data Model (Cosmos DB)
- Container: `prompts` (reuse Cosmos client patterns already used elsewhere).
- Partition key: `/tenantId`.
	- System prompts: `tenantId = "SYSTEM"`.
	- Tenant and User prompts: `tenantId = <tenantId>`.
- Item shape (minimal):
	- `id: string` (uuid)
	- `tenantId: string` ("SYSTEM" or tenant GUID)
	- `category: 'system' | 'tenant' | 'user'`
	- `ownerId?: string` (for user prompts)
	- `visibility?: 'private' | 'tenant'` (system is implicitly private)
	- `name: string` (human-readable)
	- `slug: string` (unique per tenant/category)
	- `insightType?: string` (optional linkage to a known task/intent)
	- `template: { systemPrompt?: string; userPrompt?: string; variables?: string[] }`
	- `ragConfig?: { topK?: number; minScore?: number; includeCitations?: boolean; requiresContext?: boolean }`
	- `status: 'draft' | 'active' | 'archived'`
	- `version: number` (monotonic per `slug` within tenant)
	- `createdBy: { userId: string; at: string }`
	- `updatedBy?: { userId: string; at: string }`
	- `tags?: string[]` (for UI recommendations and categorization)
	- `metadata?: Record<string, unknown>` (description, domain)

Indexes
- Point lookups by `tenantId` + `id`.
- Composite indexes to support: `(tenantId, slug, version DESC)`, filters on `category`, `status`, `ownerId`.
- **Optimization:** Exclude `template.systemPrompt` and `template.userPrompt` from indexing to save storage/write RUs, unless full-text search is strictly required.

Cosmos best practices
- Reuse a singleton client, enable retries, and log diagnostics on slow queries.
- Choose high-cardinality keys; avoid hot partitions.
- **Data Integrity:** Define a Unique Key Policy on `(tenantId, slug, version)` to prevent duplicates.
- **Versioning:** Use a Stored Procedure for "Create/Update" operations to guarantee atomic monotonic version incrementing within the partition.

## 4) Services (Backend)
Introduce the following internal services (naming illustrative; align with your backend conventions):
- PromptRepository
	- CRUD, list, search by slug/version, resolve active prompt by precedence.
- PromptResolver
	- Precedence: User > Tenant > System when resolving for a task/intent.
	- **Optimization:** Execute queries for System scope and Tenant/User scope in parallel (`Promise.all`) rather than sequentially to minimize latency.
	- Validates `status === 'active'` and role-based access.
- PromptRenderer
	- Renders the chosen template with variables: `{ userQuery, context, citations, constraints, format }`.
	- **Syntax:** Use **Mustache** syntax (e.g., `{{variable}}`) for logic-less, safe templating.
	- **Validation:** Enforce strict validation ensuring provided variables match the template's placeholders to prevent drift.
	- Enforces grounding instruction and structured output expectations.
- PromptManagementService
	- Combines repository + resolver + renderer; exposes high-level methods used by orchestration.

Integration into existing orchestration
- Replace any hardcoded system prompts with a call to `PromptManagementService.resolveAndRender(...)`.
- Keep existing Context Assembly and Vector Search; pipe `ragConfig` into those services.
- Maintain token budgeting and safety policies already present in the orchestration.

Caching
Caching
- Cache the **result** of the resolution (resolved prompt object) using a composite key `tenantId:insightType:slug`.
- TTL: Short (e.g., 60–300s) to balance performance with freshness.

## 5) API Endpoints
Namespace (suggested): `/api/prompts`
- System (Super Admin only)
	- `POST /system` – create system prompt
	- `GET /system` – list
	- `GET /system/:id` – read
	- `PUT /system/:id` – update
	- `POST /system/:id/activate` – activate new version
	- `POST /system/:id/archive` – archive
- Tenant (Tenant Admin)
	- `POST /tenant` – create tenant prompt
	- `GET /tenant` – list for tenant
	- `GET /tenant/:id` – read
	- `PUT /tenant/:id` – update
	- `POST /tenant/:id/activate` – activate
	- `POST /tenant/:id/archive` – archive
	- `POST /tenant/import` – clone from system by `id` or `slug`
- User (Authenticated)
	- `POST /user` – create user prompt
	- `GET /user` – list owned prompts
	- `GET /user/:id` – read
	- `PUT /user/:id` – update
	- `POST /user/:id/activate` – set active for a given `insightType` or `slug`
	- `POST /user/:id/archive` – archive
- Resolution & Preview
	- `POST /resolve` – resolve prompt for `{ tenantId, userId, insightType?, slug?, promptId? }`
	- `POST /preview` – dry-run render with `{ variables }`, optionally fetch RAG context

Promotion workflow (User → Tenant)
- User
	- `POST /user/:id/propose` – propose promotion of a user prompt to tenant scope; creates a review item
- Tenant Admin
	- `GET /tenant/promotions` – list pending promotion proposals
	- `POST /tenant/promotions/:proposalId/approve` – approve and clone as Tenant prompt (draft)
	- `POST /tenant/promotions/:proposalId/reject` – reject with optional reason
	- `POST /tenant/:id/activate` – activation remains a separate explicit step

Security
- Enforce role checks on every route. Derive `tenantId` from auth context. Deny any cross-tenant access.

Implementation steps (API)
- Define OpenAPI/route specs for each group (system/tenant/user/resolve/preview) with request/response schemas and validation rules.
- Implement controller/handler functions with RBAC guards and tenant scoping.
- Add pagination, filtering (by `status`, `category`, `ownerId`, `insightType`), and sorting (by `updatedAt`, `version DESC`).
- Add input validation: required fields (`name`, `slug`, `template`), variable whitelist, `ragConfig` bounds; return informative errors.
- Add idempotency for activation/archive operations to avoid duplicate state transitions.
- Add rate limits per tenant/user for write-heavy endpoints.
- Add observability: structured logs for CRUD, resolution, preview; include tenantId, promptId, version.
- Add automated tests for success/failure paths and RBAC.

## 6) RAG / Vector Search Integration
- Each prompt may carry `ragConfig` to tune retrieval per prompt.
- When `requiresContext` is true, call vector search and context assembly before rendering.
- Always filter retrieval by `tenantId` (and project/app scope if applicable) to guarantee isolation.
- Provide citations back to the model and (optionally) to clients.

## 7) UI (Web)
Sections
- System Prompts (Super Admin): full CRUD, versioning, activation, preview with RAG.
- Tenant Prompts (Tenant Admin): same CRUD; import from System; activation toggles; preview.
- My Prompts (User): CRUD for owned prompts; activate for personal use; preview.

UX Notes
- Use consistent forms for template variables and RAG settings.
- Show version history and status (draft/active/archived).
- Enable "Tagging" during prompt creation/editing to associate prompts with specific UI contexts or workflows (e.g., `dashboard`, `report-editor`, `data-grid`).
- **Recommendation System:** Use `tags` + `insightType` to suggest the most relevant prompts to the user based on their current location in the application.
- Provide a “Test prompt” preview panel with input + generated citations.

Dashboard integration pattern
- Use the existing widget catalog and tenant override system:
	- Register prompt widgets in the catalog (Super Admin), manage visibility per tenant (Tenant Admin), and surface available widgets to users.
	- Widgets are rendered inside the existing `WidgetContainer` and placed on dashboards using the CSS Grid-based layout.
	- Use `use-widget-catalog` hooks to fetch catalog entries and tenant overrides; use `use-dashboards` hooks to place and fetch data.

Widget catalog registration steps
- Define catalog entries for:
	- PromptsListWidget (per-scope listing + filters)
	- PromptEditorWidget (create/edit forms)
	- PromptPreviewWidget (live preview + RAG)
	- PromptActivationWidget (status, versioning, A/B controls)
	- PromptUsageWidget (telemetry)
- Mark visibility defaults: System widgets visible to Super Admin only; Tenant widgets visible to Tenant Admin; My Prompts visible to authenticated users.
- Provide tenant overrides for enabling/disabling these widgets per tenant.

Dashboard widgets (UI components)
- PromptsListWidget
	- Lists prompts by scope (system/tenant/user) with filters and search.
	- Props: `scope`, `tenantId`, `ownerId?`, `status?`, `insightType?`.
- PromptEditorWidget
	- Create/edit prompt metadata, template (system/user), variables, and `ragConfig`.
	- Props: `promptId?`, `scope`, `tenantId`, `onSaved`, `onCancel`.
- PromptPreviewWidget
	- Live preview with sample `userQuery`; fetches context if `requiresContext`.
	- Props: `promptId`, `variables`, `tenantId`, `userId?`.
- PromptActivationWidget
	- Manage status changes (draft → active → archived), version selector, A/B split toggles.
	- Props: `promptId`, `versions`, `onActivate`, `onArchive`, `abConfig?`.
- PromptUsageWidget
	- Telemetry view: usage counts, latency, token cost, satisfaction metrics.
	- Props: `promptId?`, `scope`, `tenantId`, date range.

Widget integration steps (UI)
- Register widgets in the dashboard’s widget registry/navigation for Super Admin, Tenant Admin, and Users.
- Add routes/screens that compose these widgets into flows per role.
- Wire widgets to API endpoints with authenticated fetch hooks; ensure tenant/user context is passed.
- Add optimistic UI for CRUD and activation; display validation errors inline.
- Add accessibility checks and responsive layouts; confirm widget performance with virtualized lists where needed.

## 8) Telemetry, A/B Testing, and Governance
- Record prompt usage per tenant/user, latency, token cost, and satisfaction signals (if available).
- A/B testing: allow two active candidates for a scope, with traffic split (e.g., 90/10). Track outcomes.
- Expose aggregate dashboards to Tenant Admin and global view to Super Admin.

Telemetry implementation details
- Provider: reuse `@castiel/monitoring` abstraction (Application Insights/OpenTelemetry configured by env) for events/metrics/traces.
- Events: `prompt.created`, `prompt.updated`, `prompt.activated`, `prompt.archived`, `prompt.used` (include `source_scope` (System/Tenant/User) and `resolved_version`), `prompt.resolution_failed`, `prompt.previewed`, `prompt.proposed`, `prompt.promotion.approved`, `prompt.promotion.rejected`.
- Metrics: `prompt.latency_ms`, `prompt.token.prompt`, `prompt.token.completion`, `prompt.token.total`, `prompt.cost.estimate`, grouped by `tenantId`, `userId`, `category`, `insightType`, `version`, `source_scope`.
- Aggregation API: add read-only endpoints for the Usage widget (e.g., `GET /api/prompts/:id/metrics?from=&to=&groupBy=`) backed by Redis counters and/or Cosmos rollups, following patterns in existing analytics services.

Governance (promotion approval)
- User prompts require Tenant Admin approval to promote to tenant scope.
- Flow: user proposes → creates a promotion item; Tenant Admin reviews → approve (clone as tenant prompt in `draft`) or reject; activation is separate and auditable.
- Audit/notifications: emit events to monitoring and user notifications; keep an audit trail.

## 9) Seeding & Migration
- Migration script to create the `prompts` container (if needed) and seed initial System prompts.
- Feature flag to enable the new resolver in the orchestration and allow gradual rollout.
- Backfill: optionally clone current hardcoded prompts into System prompts for continuity.

## 10) Testing Strategy
- Unit tests
	- PromptResolver precedence and access control.
	- PromptRenderer templating and variable validation.
- Integration tests
	- End-to-end resolution with RAG context for different roles/scopes.
	- CRUD flows for System/Tenant/User.
- E2E tests
	- UI flows for creating, activating, and using prompts in an insight request.

## 11) Rollout Plan
0. Provision database container `prompts` in Cosmos DB
1. Data model + repository
2. Resolver + renderer + management service
3. API routes with RBAC and validation
4. Orchestration integration behind a flag
5. Seed System prompts and smoke test
6. Tenant Admin UI
7. User UI
8. A/B testing + telemetry
9. Default-on and deprecate hardcoded prompts

## 16) Insight Types (Canonical)
- Canonical `InsightType` values (from backend types) used for intent classification, prompt selection, and filtering:
	- **Implementation:** Define as a strict TypeScript `enum` or `const tuple` to ensure consistency across DB, API, and UI.
	- `summary`: concise overview or key points
	- `analysis`: deeper analysis and explanation
	- `comparison`: contrast entities or scenarios
	- `recommendation`: prioritized suggestions or actions
	- `prediction`: forecast or expected outcomes
	- `extraction`: structured extraction from content
	- `search`: retrieval-focused responses (often paired with web or vector search)
	- `generation`: free-form creation (emails, drafts, content)

UI usage
- Add these as first-class filters in lists/editors; allow friendly labels mapped to canonical values.
- Default filter set: `summary`, `analysis`, `recommendation`; others available via “More filters”.

## 14) Database Container – Work Breakdown
- Create Cosmos DB container `prompts` with `PK=/tenantId`; throughput per your current RU policy.
- Configure indexing policy to support composite queries on `(tenantId, slug, version DESC)` and filters on `category`, `status`, `ownerId`.
- Add monitoring for RU consumption and latency on this container; configure alerts for hot partitions.

## 15) Open Questions
- None at this time. New requirements will be captured in follow-ups.

## 12) Acceptance Criteria
- System/Tenant/User can CRUD prompts within allowed scope; validation errors are informative.
- Prompt resolution uses precedence and respects activation/state.
- Insights flow calls the new resolver and returns grounded, citation-rich answers.
- RAG filters by tenant; no cross-tenant leakage in results.
- Telemetry records prompt usage and costs; simple A/B split works.
- Documentation added for API and UI usage.

## 13) Risks & Mitigations
- Hot partitions due to skewed tenants → monitor RU usage; consider hierarchical partition keys if needed.
- Template drift causing regressions → enforce required variables and add preview validation before activation.
- Latency from RAG + rendering → cache prompt resolution, tune topK/minScore, keep chunks concise.
- RBAC gaps → leverage existing auth middleware; add negative tests for cross-tenant attempts.

---

Implementation will reuse existing AI orchestration, vector search, and context assembly. Exact type names and file locations should follow current backend conventions; introduce the new repository/service modules with minimal intrusion and behind a feature flag for safe rollout.

