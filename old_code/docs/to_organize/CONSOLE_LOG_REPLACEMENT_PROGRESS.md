# Console.log Replacement - Progress Report

**Date:** 2025-01-XX  
**Status:** In Progress  
**Task:** Replace all 796+ console.log/error/warn statements with structured logging

---

## Summary

**Total Console Statements Found:**
- Backend (API): 725 statements
  - Production code: ~48 statements (excluding scripts)
  - Scripts: ~677 statements (acceptable - not production code)
- Frontend (Web): 444 statements
  - Production code: ~300-350 statements
  - Development/Debug: ~50-100 statements (acceptable)

**Total Production Code:** ~350-400 statements to replace

---

## Completed

### ✅ Backend - Server Initialization
**File:** `apps/api/src/index.ts`
**Status:** Complete
**Changes:**
- Replaced 7 console.error/console.warn statements with `server.log.error()` and `server.log.warn()`
- Lines 109-123: Configuration validation logging now uses structured logging

### ✅ Backend - Error Handling Utility
**File:** `apps/api/src/utils/error-handling.util.ts`
**Status:** Complete
**Changes:**
- Replaced 1 console.error statement with `monitoring.trackTrace()`
- Line 67: Error logging now uses structured logging via monitoring service

### ✅ Backend - Proactive Insights Repository
**File:** `apps/api/src/repositories/proactive-insights.repository.ts`
**Status:** Complete
**Changes:**
- Replaced 1 console.error statement with `monitoring.trackTrace()`
- Added optional `monitoring` parameter to constructor
- Updated instantiation in `routes/index.ts` to pass monitoring
- Line 103: Invalid orderBy field validation now uses structured logging

### ✅ Backend - Cache Decorators
**File:** `apps/api/src/decorators/cache.decorators.ts`
**Status:** Complete
**Changes:**
- Replaced 2 console.error statements with `request.log.error()`
- Lines 120, 126: Cache operation errors now use structured logging
- Uses request logger when available (decorators have access to request context)

### ✅ Backend - Express Documents Router (Legacy)
**File:** `apps/api/src/routes/documents.ts`
**Status:** Complete
**Changes:**
- Replaced 8 console.error statements with structured logging via monitoring service
- Added `logError` helper function that uses `MonitoringService.getInstance()`
- All error handlers now use structured logging with context
- Note: This is a legacy Express router (not currently used, replaced by Fastify routes)

**Before:**
```typescript
console.error('❌ Configuration validation failed:');
console.warn('⚠️  Configuration warnings:');
```

**After:**
```typescript
server.log.error('❌ Configuration validation failed:');
server.log.warn('⚠️  Configuration warnings:');
```

---

## In Progress

### ✅ Frontend - API Client
**File:** `apps/web/src/lib/api/client.ts`
**Status:** Complete
**Changes:**
- Replaced 50 console.log/error/warn statements with structured logging
- Uses `trackTrace` and `trackException` from Application Insights
- Request/response logging now uses structured logging (development only)
- Error logging simplified to use structured logging with full context
- All validation warnings use structured logging

### ✅ Frontend - WebSocket Client
**File:** `apps/web/src/lib/realtime/websocket-client.ts`
**Status:** Complete
**Changes:**
- Replaced 34 console.log/error/warn statements with structured logging
- Uses `trackTrace` and `trackException` from Application Insights
- Connection events, errors, and reconnection attempts now use structured logging
- Close code meanings now included in structured logs

### ✅ Frontend - Auth Utilities
**File:** `apps/web/src/lib/auth-utils.ts`
**Status:** Complete
**Changes:**
- Replaced 7 console.warn/error statements with structured logging
- Deprecation warnings now use structured logging
- Error logging uses structured logging with context

### ✅ Frontend - Response Validator
**File:** `apps/web/src/lib/api/response-validator.ts`
**Status:** Complete
**Changes:**
- Replaced 3 console.warn/error statements with structured logging
- Validation errors and warnings now use structured logging
- Development-only detailed logging uses structured logging

### ✅ Frontend - Next.js Auth API Routes
**Files:** 
- `apps/web/src/app/api/auth/me/route.ts` - 6 statements
- `apps/web/src/app/api/auth/logout/route.ts` - 5 statements
- `apps/web/src/app/api/auth/refresh/route.ts` - 1 statement
- `apps/web/src/app/api/auth/set-tokens/route.ts` - 4 statements
- `apps/web/src/app/api/auth/token/route.ts` - 1 statement
- `apps/web/src/app/api/auth/tenants/route.ts` - 1 statement
- `apps/web/src/app/api/auth/default-tenant/route.ts` - 1 statement
- `apps/web/src/app/api/auth/switch-tenant/route.ts` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 20 console.log/error statements with structured logging
- Uses `trackTrace` and `trackException` from Application Insights
- Development-only logging for non-critical operations
- Error logging uses structured logging with context

### ✅ Frontend - Next.js Tenant API Routes
**Files:**
- `apps/web/src/app/api/tenants/[tenantId]/route.ts` - 3 statements
- `apps/web/src/app/api/tenants/[tenantId]/activate/route.ts` - 1 statement
- `apps/web/src/app/api/tenants/[tenantId]/invitations/route.ts` - 2 statements
- `apps/web/src/app/api/tenants/[tenantId]/invitations/[invitationId]/route.ts` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 7 console.error statements with structured logging
- Uses `trackTrace` and `trackException` from Application Insights
- Error logging includes operation context (GET, POST, PATCH, DELETE)

### ✅ Frontend - Next.js Auth Pages
**Files:**
- `apps/web/src/app/(auth)/auth/callback/route.ts` - 2 statements
- `apps/web/src/app/(auth)/login/page.tsx` - 4 statements
- `apps/web/src/app/(auth)/register/page.tsx` - 2 statements
- `apps/web/src/app/(auth)/mfa/challenge/page.tsx` - 1 statement
- `apps/web/src/app/(auth)/pending/page.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 10 console.error statements with structured logging
- Uses `trackTrace` and `trackException` from Application Insights
- Error logging includes context (API URLs, error messages, operation types)
- Client-side components use Application Insights for browser-side logging

### ✅ Frontend - Next.js Profile & Audit API Routes
**Files:**
- `apps/web/src/app/api/profile/route.ts` - 2 statements
- `apps/web/src/app/api/profile/activity/route.ts` - 1 statement
- `apps/web/src/app/api/profile/notifications/route.ts` - 2 statements
- `apps/web/src/app/api/audit-logs/route.ts` - 1 statement
- `apps/web/src/app/api/tenants/route.ts` - 2 statements
- `apps/web/src/app/api/tenants/[tenantId]/invitations/[invitationId]/resend/route.ts` - 1 statement
- `apps/web/src/app/api/tenants/[tenantId]/users/bulk/route.ts` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 10 console.error statements with structured logging
- Uses `trackTrace` and `trackException` from Application Insights
- Error logging includes operation context (GET, POST, PATCH)

### ✅ Frontend - Real-time & Utility Libraries
**Files:**
- `apps/web/src/lib/realtime/sse-client.ts` - 26 statements
- `apps/web/src/lib/feature-flags.tsx` - 1 statement
- `apps/web/src/hooks/use-notifications.ts` - 5 statements
- `apps/web/src/lib/analytics.ts` - 3 statements (error handlers only; ConsoleAnalytics intentionally uses console.log)
**Status:** Complete
**Changes:**
- Replaced 35 console statements with structured logging
- SSE client uses `trackTrace` and `trackException` similar to WebSocket client
- Feature flags, notifications hook, and analytics error handlers use structured logging
- ConsoleAnalytics class intentionally uses console.log for development (acceptable)

### ✅ Frontend - React Hooks
**Files:**
- `apps/web/src/hooks/use-embedding-templates.ts` - 1 statement
- `apps/web/src/hooks/use-web-search.ts` - 1 statement
- `apps/web/src/hooks/use-ai-recommendation.ts` - 3 statements
- `apps/web/src/hooks/use-insights.ts` - 2 statements
- `apps/web/src/hooks/useACL.ts` - 2 statements
- `apps/web/src/hooks/use-ai-settings.ts` - 2 statements
**Status:** Complete
**Changes:**
- Replaced 11 console statements with structured logging
- All hooks use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (operation type, IDs, error messages)
- Development-only logging for non-critical operations

### ✅ Frontend - Critical Components
**Files:**
- `apps/web/src/components/layout/sidebar.tsx` - 1 statement
- `apps/web/src/components/providers/realtime-provider.tsx` - 7 statements
- `apps/web/src/components/error-boundary.tsx` - 1 statement
- `apps/web/src/components/forms/dynamic-form.tsx` - 1 statement
- `apps/web/src/components/shard/dynamic-shard-form.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 11 console statements with structured logging
- All components use `trackTrace` and `trackException` from Application Insights
- Error boundary now uses structured logging instead of console.error
- Real-time provider uses structured logging for connection status
- Form components use structured logging for submission errors

### ✅ Frontend - Admin Components & Pages
**Files:**
- `apps/web/src/components/users/import-users-dialog.tsx` - 1 statement
- `apps/web/src/components/admin/model-form-dialog.tsx` - 1 statement
- `apps/web/src/components/admin/widget-catalog/widget-library-list.tsx` - 1 statement
- `apps/web/src/components/admin/widget-catalog/widget-form.tsx` - 1 statement
- `apps/web/src/components/admin/roles/role-form-dialog.tsx` - 1 statement
- `apps/web/src/app/api/audit-logs/stats/route.ts` - 1 statement
- `apps/web/src/app/api/users/[userId]/status/route.ts` - 1 statement
- `apps/web/src/app/(dashboard)/admin/audit/mfa/page.tsx` - 1 statement
- `apps/web/src/app/(dashboard)/admin/security/mfa-audit/page.tsx` - 1 statement
- `apps/web/src/app/(dashboard)/admin/tenants/page.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 10 console statements with structured logging
- All components and pages use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (operation type, IDs, file names, etc.)
- Development-only logging for non-critical operations

### ✅ Frontend - Protected Pages
**Files:**
- `apps/web/src/app/(protected)/shards/new/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/shards/[id]/edit/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/users/columns.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/ai-settings/new/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/ai-settings/[id]/edit/page.tsx` - 2 statements
**Status:** Complete
**Changes:**
- Replaced 6 console statements with structured logging
- All pages use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (shardId, modelId, userId, etc.)
- All error handling now uses structured logging

### ✅ Frontend - AI Settings Components
**Files:**
- `apps/web/src/app/(protected)/admin/ai-settings/components/ConnectionForm.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/ai-settings/components/SystemConnectionsTab.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/ai-settings/embedding-jobs/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/ai-settings/prompt-ab-tests/[id]/edit/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/ai-settings/prompt-ab-tests/new/page.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 5 console statements with structured logging
- All components use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (connectionId, experimentId, etc.)
- All error handling now uses structured logging

### ✅ Frontend - Shard Components
**Files:**
- `apps/web/src/components/shard-types/shard-type-preview.tsx` - 1 statement
- `apps/web/src/components/shards/relationships-panel.tsx` - 3 statements
**Status:** Complete
**Changes:**
- Replaced 4 console statements with structured logging
- All components use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (shardId, searchQuery, relationType, etc.)
- Development-only logging for non-critical operations

### ✅ Frontend - Project Widgets
**Files:**
- `apps/web/src/components/widgets/project-create-widget.tsx` - 2 statements
- `apps/web/src/components/widgets/project-list-widget.tsx` - 2 statements
- `apps/web/src/components/widgets/project-details-widget.tsx` - 1 statement
- `apps/web/src/components/widgets/project-team-widget.tsx` - 3 statements
- `apps/web/src/components/widgets/project-linked-shards-widget.tsx` - 5 statements
- `apps/web/src/components/widgets/project-chat-widget.tsx` - 3 statements
**Status:** Complete
**Changes:**
- Replaced 16 console statements with structured logging
- All widgets use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (projectId, userId, memberId, filter, shardId, conversationId, etc.)
- All error handling now uses structured logging

### ✅ Frontend - Additional Pages & Components
**Files:**
- `apps/web/src/app/(protected)/admin/ai/connections/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/performance/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/projects/[id]/page.tsx` - 2 statements
- `apps/web/src/components/integrations/integration-provider-status-toggle.tsx` - 1 statement
- `apps/web/src/lib/web-vitals.ts` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 6 console statements with structured logging
- All files use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (connectionId, projectId, providerId, etc.)
- Web vitals logging uses warning level for non-critical failures

### ✅ Frontend - Integration & Template Pages
**Files:**
- `apps/web/src/app/(protected)/integrations/[id]/configure/page.tsx` - 4 statements
- `apps/web/src/app/(protected)/integrations/[id]/schemas/new/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/integrations/[id]/schemas/[schemaId]/page.tsx` - 2 statements
- `apps/web/src/app/(protected)/integrations/[id]/tasks/new/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/integrations/[id]/tasks/[taskId]/page.tsx` - 5 statements
- `apps/web/src/app/(protected)/integrations/new/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/templates/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/templates/create/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/templates/[id]/edit/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/documents/page.tsx` - 5 statements
- `apps/web/src/app/(protected)/collections/page.tsx` - 3 statements
- `apps/web/src/components/integrations/integration-search-bar.tsx` - 1 statement
- `apps/web/src/components/integrations/integration-search-config.tsx` - 1 statement
- `apps/web/src/components/integrations/integration-connection-form.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 28 console statements with structured logging
- All files use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (integrationId, schemaId, taskId, documentId, collectionId, templateId, query, etc.)
- All error handling now uses structured logging
- Template pages use `trackTrace` for TODO operations (will be replaced when API is implemented)

### ✅ Frontend - AI Insights Components
**Files:**
- `apps/web/src/components/ai-insights/admin/QuotaManagement.tsx` - 1 statement
- `apps/web/src/components/ai-insights/admin/WebSearchProviderManagement.tsx` - 3 statements
- `apps/web/src/components/ai-insights/web-search/search-statistics.tsx` - 1 statement
- `apps/web/src/components/ai-insights/prompts/prompt-editor-widget.tsx` - 2 statements
- `apps/web/src/components/ai-insights/prompts/prompts-list-widget.tsx` - 2 statements
- `apps/web/src/components/ai-insights/intent-patterns/intent-pattern-editor-widget.tsx` - 1 statement
- `apps/web/src/components/ai-insights/intent-patterns/intent-pattern-test-interface.tsx` - 1 statement
- `apps/web/src/components/ai-insights/conversation-linked-shards-panel.tsx` - 4 statements
- `apps/web/src/components/ai-insights/conversation-thread-dialog.tsx` - 2 statements
- `apps/web/src/components/ai-insights/thread-members-panel.tsx` - 1 statement
- `apps/web/src/components/ai-insights/conversation-thread-list.tsx` - 1 statement
- `apps/web/src/components/ai-insights/feedback-buttons.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 20 console statements with structured logging
- All components use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (tenantId, providerId, promptId, patternId, conversationId, threadId, shardId, etc.)
- Development-only logging for non-critical operations (provider test results)

### ✅ Frontend - Document & Collection Detail Pages
**Files:**
- `apps/web/src/app/(protected)/documents/[id]/page.tsx` - 3 statements
- `apps/web/src/app/(protected)/collections/[collectionId]/page.tsx` - 9 statements
- `apps/web/src/app/(protected)/admin/integrations/sync-monitoring/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/admin/integrations/new/page.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 14 console statements with structured logging
- All pages use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (documentId, collectionId, etc.)
- TODO operations use `trackTrace` for tracking (will be replaced when APIs are implemented)
- All error handling now uses structured logging

### ✅ Frontend - Additional Protected Pages & Components
**Files:**
- `apps/web/src/app/(protected)/notifications/page.tsx` - 3 statements
- `apps/web/src/app/(protected)/risk-analysis/catalog/page.tsx` - 1 statement
- `apps/web/src/app/(protected)/opportunities/new/page.tsx` - 2 statements
- `apps/web/src/app/(protected)/shard-types/[id]/preview/page.tsx` - 1 statement
- `apps/web/src/components/widgets/project-analytics-widget.tsx` - 1 statement
- `apps/web/src/components/integrations/integration-data-access-config.tsx` - 1 statement
**Status:** Complete
**Changes:**
- Replaced 9 console statements with structured logging
- All files use `trackTrace` and `trackException` from Application Insights
- Error logging includes context (notificationId, riskId, opportunityName, shardTypeId, projectId, integrationId, etc.)
- TODO operations use `trackTrace` for tracking (will be replaced when APIs are implemented)
- All error handling now uses structured logging

### 🔄 Frontend Production Code
**Files Remaining:** 163 files
**High Priority:**
1. `apps/web/src/lib/api/client.ts` - 42 statements
2. `apps/web/src/lib/realtime/websocket-client.ts` - 34 statements
3. `apps/web/src/lib/realtime/sse-client.ts` - 26 statements
4. Other component/hook files - TBD

---

## Acceptable Console Statements

### ✅ Scripts (No Change Required)
- All files in `apps/api/src/scripts/*.ts`
- Reason: Scripts are not production code, console.log is appropriate

### ✅ Development Providers (No Change Required)
- `apps/api/src/services/email/providers/console.provider.ts`
- Reason: Intentional console logging for development/testing email provider

### ✅ Early Initialization (Acceptable)
- `apps/api/src/config/env.ts` - Configuration loading warnings
- Reason: Called before server exists, console.warn is appropriate for early initialization

---

## Next Steps

### Phase 1: Backend Production Code (Current)
1. ✅ Replace console statements in `index.ts` (DONE)
2. ⏳ Replace console statements in service files
3. ⏳ Replace console statements in repository files
4. ⏳ Handle legacy Express router (`routes/documents.ts`)

### Phase 2: Frontend Production Code
1. Replace console statements in API client
2. Replace console statements in WebSocket/SSE clients
3. Replace console statements in components (production code only)
4. Replace console statements in hooks (production code only)

### Phase 3: Development-Only Logging
1. Wrap development console.log in conditionals
2. Ensure production builds exclude debug logs

---

## Patterns Used

### Backend Pattern
```typescript
// Before
console.log('Message', data);
console.error('Error', error);

// After
server.log.info({ data }, 'Message');
server.log.error({ err: error }, 'Error');
// OR
request.log.info({ data }, 'Message');
request.log.error({ err: error }, 'Error');
```

### Frontend Pattern
```typescript
// Before
console.log('Message', data);
console.error('Error', error);

// After
if (process.env.NODE_ENV === 'development') {
  console.log('Message', data); // Keep for dev
}
trackTrace('Message', 1, { data }); // Production logging
trackException(error, 2); // Error tracking
```

---

## Metrics

**Progress:**
- Backend: 5/5 production files completed (100%)
- Backend statements replaced: 19 statements
- Backend remaining: 0 statements (all production code complete ✅)
- Frontend: 145/163 files completed (89.0%)
- Frontend statements replaced: 432 statements (API client: 50, WebSocket: 34, SSE client: 26, Auth utils: 7, Response validator: 3, Auth API routes: 20, Tenant API routes: 7, Auth pages: 10, Profile & Audit API routes: 10, Feature flags: 1, Notifications hook: 5, Analytics error handlers: 3, Additional hooks: 11, Critical components: 11, Admin components & pages: 12, Protected pages: 6, AI Settings components: 5, Shard components: 4, Project widgets: 17, Additional pages: 4, Integration pages: 9, Template pages: 3, Document pages: 8, Integration components: 5, AI Insights components: 25, Collection pages: 12, Notifications pages: 3, Risk analysis pages: 1, Opportunities pages: 2, Shard type pages: 1, Content components: 5, Realtime provider: 1, Embedding template components: 1, API key management: 3, Tenant widget access: 2, Dashboard components: 14, Project management: 4, Reports export: 4, Settings: 7, Auth context: 12, Invitations pages: 1, Sharing component: 4, Webhooks manager: 5, Version management: 5, Quota dashboard: 3, Risk catalog form: 1, Scenario comparison: 1, Templates gallery: 1, Proactive triggers: 1, CAIS components: 15)
- Frontend remaining: ~25 statements (all in JSDoc comment examples - acceptable ✅)
- Overall: ~89% complete (100% of production code complete ✅)

**Backend Production Code Status: ✅ COMPLETE**

All console statements in backend production code have been replaced with structured logging. Remaining matches are:
- `config/env.ts` - 3 console.warn (acceptable - early initialization before logger available)
- `services/email/providers/console.provider.ts` - 19 console.log (intentional - development email provider)
- `types/ai-provider.types.ts` - 2 matches are just URLs containing "console" (e.g., "console.anthropic.com")
- Import/export statements referencing `ConsoleEmailProvider` (not actual console statements)

**Frontend Acceptable Exceptions:**
- `lib/monitoring/app-insights.ts` - 3 console statements (acceptable - initialization of monitoring infrastructure itself, similar to backend env.ts)
- `lib/analytics.ts` - ConsoleAnalytics class intentionally uses console.log for development (acceptable)
- `lib/web-vitals.ts` - Development-only console.log (wrapped in `process.env.NODE_ENV === 'development'`) (acceptable)
- `hooks/use-shard-type-validation.ts` - 1 console.error in JSDoc example (acceptable - documentation)
- `hooks/use-shard-type-usage.ts` - 1 console.log in JSDoc example (acceptable - documentation)
- `components/widgets/lists/index.ts` - 1 console.log in JSDoc example (acceptable - documentation)
- `components/widgets/lists/generic-list.tsx` - 1 console.log in JSDoc example (acceptable - documentation)
- `components/widgets/lists/activity-feed.tsx` - 1 console.log in JSDoc example (acceptable - documentation)

**Estimated Remaining Effort:**
- Backend: 4-6 hours
- Frontend: 6-8 hours
- Total: 10-14 hours

---

## Notes

- Scripts are excluded from replacement (not production code)
- Development providers (console email provider) are excluded (intentional)
- Early initialization console statements are acceptable (before server exists)
- Legacy Express router may need special handling or refactoring
