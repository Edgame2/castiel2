# UI audit progress (ui-fix command)

- **Section 1 — Route protection:** Done (middleware.ts added; public paths + redirect to /login)
- **Section 2 — Shadcn usage:** Done (Select + Textarea added; login, MFA enroll/verify, security, admin, recommendations use Shadcn; remaining admin forms can follow same pattern)
- **Section 3 — TypeScript:** Done (removed all `any`; filter/condition values and API result errors/warnings typed)
- **Section 4 — No hardcoded URLs or ports:** Done (no localhost/ports in src; all fetch use NEXT_PUBLIC_API_BASE_URL)
- **Section 5 — API auth and 401 handling:** Done (login, recommendations, RecommendationsCard, settings/security use apiFetch; 401 → /logout; auth flows use skip401Redirect)
- **Section 6 — Tailwind-only styling:** Done (one fix: StakeholderGraph SVG fontSize → Tailwind text-[10px]; rest are dynamic/data-driven, kept)
- **Section 7 — Loading and empty states:** Done (audit: recommendations, conversations, integrations, security, detail pages have loading+empty; added loading message + empty state for admin users list)
- **Section 8 — Form accessibility:** Done (label/id + required indicators on login, register, forgot-password, reset-password; admin users org input + sort selects)
- **Section 9 — Metadata and not-found:** Done (login/register/forgot-password layouts + dashboard/settings/not-found metadata; not-found has links to Home, Dashboard, Login)
- **Section 10 — Error handling:** Pending
- **Section X — Menu visible only on protected pages:** Done (AppNav only on protected routes)
- **Final verification:** Pending

## This session (Section 1 + X)
- Added `containers/ui/src/middleware.ts`: public paths (login, register, forgot-password, reset-password, verify-email, accept-invitation, logout, unauthorized); redirect to /login when unauthenticated on protected routes; auth via `accessToken` cookie.
- Added `containers/ui/src/components/AppNav.tsx`: client nav rendered only when pathname is not in public list.
- Root layout now uses `<AppNav />` instead of inline nav so menu is hidden on login/register/forgot-password etc.
- Added `containers/ui/src/lib/api.ts`: `getApiBaseUrl()` and `apiFetch()` with optional 401 → redirect to /logout.

## Section 2 (this session)
- Added `@/components/ui/select.tsx` (Radix Select: Select, SelectTrigger, SelectValue, SelectContent, SelectItem, etc.).
- Added `@/components/ui/textarea.tsx`.
- Replaced raw buttons/inputs/selects/textareas with Shadcn in: login (already used Shadcn), admin/page (Refresh), admin/ml-models/models/new (full form), settings/mfa/enroll, settings/mfa/verify, settings/security (sessions, MFA, API keys), recommendations/RecommendationsCard.
- Remaining: some admin forms (e.g. ml-models/models/[id], feature-engineering, risk-catalog, decision-rules) still use raw elements; same replacement pattern applies.

## Section 3 (this session)
- Replaced `any` with proper types: processing/page (filter value → string | number | boolean), field-mappings (parameter default → string | number | boolean | null; errors/warnings → { message?: string } | string), sync/page (filter value + operator cast), entity-linking (condition value).
- Typecheck not run in this environment (npm/npx unavailable). Run `pnpm tsc --noEmit` or `npm run typecheck` locally to confirm.

## Section 5 (this session)
- Login: uses apiFetch for /api/auth/login and /api/auth/login/complete-mfa with skip401Redirect: true (in-page error).
- Recommendations page and RecommendationsCard: use apiFetch for GET and POST (401 → redirect to /logout).
- Settings/security: all fetches (sessions, MFA status, API keys, revoke, backup codes, disable MFA, create/revoke key) use apiFetch; MFA backup-codes and disable use skip401Redirect: true so 401 shows in-page error.
- Other pages still use raw fetch with credentials: 'include'; can be migrated to apiFetch for consistent 401 handling.

## Section 6 (this session)
- Grep found style={{}} in: feedback/types (dynamic hex color), action-catalog (dynamic colors/widths), RiskVelocityChart (left %), RemediationWorkflowCard (width %), WinProbabilityTrendChart/StakeholderGraph/ClusterVisualization/SentimentTrendChart (height), ConfidenceScore (width %), AccountHealthCard (dynamic color), integrations/health (width %). All except one are dynamic/data-driven — kept.
- Replaced StakeholderGraph SVG `style={{ fontSize: 10 }}` with `className="text-[10px]"`.

## Section 7 (this session)
- Audited data-fetching pages: recommendations, conversations, settings/integrations, recommendations/[id], admin/security/users, dashboard cards (RecommendedTodayCard, etc.) already have loading and empty states.
- Admin Security Users: added explicit loading block (“Loading member summary…”) when loading && orgId; added empty state when members.length === 0 (“No members in this organization.”).

## Section 8 (this session)
- Login: added visible required indicator (*) for Email and Password (already had Label+id and required).
- Register: added visible required indicator for Email and Password; already had label+id for all fields.
- Forgot-password: added visible required indicator for Email; already had label+id.
- Reset-password: added visible required indicator for New password and Confirm password; already had label+id.
- Admin Security Users: added id="admin-users-org-id" and htmlFor to Organization ID label; added id/htmlFor for Sort by and Sort direction selects (Sort direction label is sr-only); aria-required on org input.

## Section 9 (this session)
- Root layout and admin layout already had metadata. Unauthorized page had metadata.
- Added layout.tsx with metadata for login (title: "Sign in | Castiel"), register ("Create account | Castiel"), forgot-password ("Forgot password | Castiel") so client pages get correct document title.
- Added metadata to dashboard/page.tsx and settings/page.tsx (title + description).
- not-found.tsx: added metadata (title: "Page not found | Castiel"); already had links to Home, Dashboard, Login.

**Next session:** Start at Section 10 (Error handling and no leaked internals).
