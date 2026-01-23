# Consistency & Implementation Guidelines

This document defines the architectural standards, consistency rules, and implementation guidelines for the Castiel codebase. All contributions must adhere to these rules to ensure maintainability, scalability, and a unified developer experience.

## 1. UI & Frontend (Next.js + Tailwind)

### Component Architecture
We follow a **Feature-based** component architecture, complemented by a designated design system folder.

*   **Design System (`@/components/ui`)**: Contains strictly reusable, atomic UI components (buttons, inputs, cards). These should largely follow the **Shadcn UI** implementation patterns.
    *   *Rule:* Do not add business logic to these components.
*   **Feature Components (`@/components/<feature-name>`)**: Group components by their functional domain (e.g., `dashboard`, `documents`, `widgets`).
    *   *Rule:* If a component is only used within a specific feature, place it here.
*   **Page Organization**: Follow Next.js App Router conventions. Colocate `page.tsx`, `layout.tsx`, and route-specific components if they are not reused elsewhere.
*   **Dashboard Widget Compatibility**: Components should be designed to be embedded as Dashboard Widgets.
    *   *Rule:* Avoid hard-coded page dependencies. Ensure components can accept dimensions or layout constraints via props to fit into widget grids.

### State Management
We separate **Server State** from **Client UI State**.

*   **Server State (React Query / TanStack Query):**
    *   **Mandatory** for all data fetching, caching, and synchronization with the API.
    *   *Rule:* Never store API data in Zustand or Context manually. Use `useQuery` and `useMutation`.
    *   *Rule:* Centralize query keys in a factory or constant file to avoid invalidation bugs.
*   **Client UI State (Zustand):**
    *   Use for complex global UI state (e.g., `CommandPalette` visibility, multi-step wizard progress, user settings).
    *   *Rule:* Keep stores small and focused. Avoid a single monolithic "AppStore".
*   **React Context:**
    *   Use sparingly, primarily for dependency injection or static configuration that doesn't change often (e.g., Theme, Auth Session).

### Next.js Patterns
*   **Server Components by Default:** Build pages as Server Components. only add `'use client'` to the specific leaf components that require interactivity (hooks, event listeners).
*   **Data Fetching:** Fetch data in Server Components where possible, pass data as props. For dynamic updates, use React Query in client components.

### Styling (Tailwind CSS)
*   **Utility First:** Use Tailwind utility classes for 90% of styling.
*   **Shadcn UI:** Use the provided component library. Avoid writing custom CSS classes in `.css` files unless absolutely necessary for complex animations or legacy integration.
*   **Arbitrary Values:** Avoid `w-[350px]` or `bg-[#123456]`. Use theme tokens (e.g., `w-96`, `bg-primary`) to maintain consistency.
*   **Ordering:** Recommended to use `prettier-plugin-tailwindcss` to enforce class ordering.

## 2. API & Backend (Fastify)

### Protocol Strategy
*   **REST First:** The primary API protocol is **REST** over Fastify.
*   **GraphQL:** Reserved for complex, specific data-fetching scenarios where client-defined shaping is critical. Do not default to GraphQL for standard CRUD.

### Validation Strategy
*   **New Endpoints (Zod First):** All **new** endpoints must use `fastify-type-provider-zod` to validate inputs.
    *   *Reason:* This allows defining schemas in `@castiel/shared-types`, which can be imported by the Frontend for type-safe forms (React Hook Form) and API clients.
*   **Existing Endpoints (Legacy):**
    *   Existing endpoints using raw Fastify/JSON Schemas (e.g., `auth.schemas.ts`) are **acceptable** to keep for now.
    *   *Migration Rule:* If you modify an existing legacy endpoint, you are **strongly encouraged** to refactor it to Zod at that time.
*   **Shared Schemas:**
    *   Schemas should be defined in `packages/shared-types` whenever they represent shared domain entities.
    *   API-specific schemas (like a specific "Change Password" payload) can live in `apps/api/src/schemas` but should simpler Zod objects, not raw JSON Schema.

### Error Handling
*   **RFC 7807 Problem Details:** All API errors must return a standardized JSON response complying with RFC 7807.
    *   **Format:**
        ```json
        {
          "type": "about:blank",
          "title": "Resource Not Found",
          "status": 404,
          "detail": "User with ID 123 does not exist.",
          "instance": "/api/users/123"
        }
        ```
*   **Error Layering:** Catch errors at the Controller level or use a global Error Handler. Never crash the process.

## 3. Database (Cosmos DB)

### Schema Enforcement
*   **Schema-First NoSQL:** Although Cosmos DB is schema-less, the Application Layer **must** enforce schemas.
*   **Validation:** All Repository write operations (Create, Update) must validate data against the central Zod schema before sending to the database. "Schemaless" data is only allowed in specific `unstructuredData` fields if explicitly permitted.

### Partitioning & Keys
*   **Partition Key:** strictly `/tenantId` for all multi-tenant containers.
*   **ID Generation:** Use UUID v4.

### Naming Conventions
*   **camelCase:** Use `camelCase` for all database properties (e.g., `createdAt`, `userEmail`) to match JavaScript/TypeScript conventions. Avoid `snake_case` in the DB.

## 4. General Code Quality

### TypeScript
*   **Strict Mode:** `strict: true` is enabled.
*   **No Explicit Any:** Avoid `any`. Use `unknown` if the type is truly not known yet, or define a proper Interface/Type.

### Testing
*   **Definition of Done:** A feature is not complete without:
    *   **Unit Tests (Vitest):** For all utility functions, shared logic, and complex business rules.
    *   **Integration Tests:** For API endpoints (success & failure cases).
    *   **Type Safety:** `pnpm typecheck` must pass.

## 5. Additional Recommendations

Based on the current codebase analysis (`apps/api/src/config/env.ts`, `api-client.ts`, etc.), the following modernizations are recommended:

### Environment Variables
*   **Current State:** Manual parsing (`process.env.VAR || 'default'`) and manual validation function.
*   **Recommendation:** Migrate to **Type-Safe Environment Variables** using **Zod** directly or libraries like `t3-env` / `envalid`.
    *   *Benefit:* Eliminates silent failures and provides strict TypeScript types for `config`.
    *   *Action:* Replace `validateConfig` with a Zod schema parse.

### API Route Pattern
*   **Standard:** Continue using the **Route Factory + Controller** pattern seen in `user-management.routes.ts`.
    *   *Rule:* **Never** write business logic inside the `server.get()` handler. Always delegate to a Controller method.
    *   *Rule:* Use the `checkPerm` middleware factory for granular permission guards on every route.

### Frontend API Client
*   **Type Safety:** The Axios client is currently untyped by default.
    *   *Rule:* Always explicitly type the response data: `apiClient.get<UserResponse>('/api/...')`.
*   **Cleanup:** `apps/web/src/lib/api/client.ts` contains mixed auth logic (Cookie vs Token) with `DEPRECATED` comments.
    *   *Action:* Remove deprecated "Bearer Token" logic and rely strictly on HttpOnly cookies as the new standard implies.

### Logging
*   **Backend:** Continue using `request.log` (Pino) consistently.
*   **Frontend:** Avoid raw `console.log` / `console.error` in production code. Use a logger abstraction (or the existing AppInsights wrapper) to ensuring logs are captured in monitoring tools.

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Consistency guidelines documented but compliance may vary

#### Implemented Features (✅)

- ✅ Component architecture guidelines
- ✅ State management patterns
- ✅ Validation strategy
- ✅ Error handling standards
- ✅ Database conventions
- ✅ Code quality standards

#### Known Limitations

- ⚠️ **Guideline Compliance** - Not all code may follow documented guidelines
  - **Code Reference:**
    - Codebase may have inconsistencies
  - **Recommendation:**
    1. Audit codebase for compliance
    2. Refactor non-compliant code
    3. Add linting rules to enforce guidelines

- ⚠️ **Legacy Code** - Some legacy code may not follow new patterns
  - **Recommendation:**
    1. Migrate legacy code to new patterns
    2. Document migration process
    3. Prioritize high-impact areas

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Error Handling Standard](../development/ERROR_HANDLING_STANDARD.md) - Error handling patterns
- [Input Validation Standard](../development/INPUT_VALIDATION_STANDARD.md) - Validation patterns
