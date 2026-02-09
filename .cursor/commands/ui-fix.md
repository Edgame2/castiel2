Purpose: Audit all web UI container(s) in this repo, fix every issue found, and support resuming across sessions.
Scope: All containers that serve a web UI (primary: containers/ui). Apply every section below; within a session you may do one or more sections and then stop — the next session continues from the next section or from the checklist.
How to run:
Session 1: Start at Section 1; complete as many sections as possible; at the end, write a short progress note (e.g. in a file like docs/ui-audit-progress.md or in chat) listing which sections are Done and which are Pending.
Next sessions: Read the progress note, then continue from the first Pending section. After each section, update the progress note.
Final session: Run the “Final verification” step and output the summary.
Section 1 — Route protection
Rule: Every page requires authentication except: /login, /register, /forgot-password. Optionally public: /reset-password, /verify-email, /accept-invitation (only if product decision).
Check:
List every route under src/app (including nested routes). Mark each as protected or public.
Determine how protection is enforced: Next.js middleware.ts, root layout auth check, or per-page redirect/check.
Confirm unauthenticated access to any protected path redirects to /login (or /unauthorized where appropriate).
Fix:
If there is no central protection: add middleware.ts at the UI app root that (1) allows only the public paths above (and static assets), (2) checks auth (e.g. cookie/session/token), (3) redirects to /login for protected routes when unauthenticated.
If protection is only in some pages/layouts: either move logic into middleware or add the same redirect/check to every protected layout/page so no protected route is reachable without auth.
Ensure /logout and /unauthorized are either allowed in middleware when unauthenticated or handled so they don’t create redirect loops.
Progress: [ ] Section 1 done.
Section 2 — Shadcn usage
Rule: UI must use Shadcn default components from @/components/ui (Radix-based). No duplicate custom or third-party form/control components where Shadcn provides one.
Check:
List components in src/components/ui and confirm they follow Shadcn/Radix patterns (e.g. components.json present and valid).
For every page and shared component: identify buttons, inputs, labels, cards, checkboxes, selects, dialogs, tabs. Note any that are raw HTML, custom, or from another library instead of @/components/ui.
Fix:
Replace non-Shadcn equivalents with Shadcn components from @/components/ui. Add missing Shadcn components with npx shadcn@latest add <component> if needed.
Use Shadcn primitives for dialogs, dropdowns, and forms (e.g. Button, Input, Label, Card, Checkbox, Select, Dialog).
Progress: [ ] Section 2 done.
Section 3 — TypeScript
Rule: Zero TypeScript errors. No any for props or API responses. Strict typing.
Check:
Run pnpm tsc --noEmit (or npm run build if that runs the typecheck) in the UI container; list all errors.
Search for : any and untyped API response usage; list files and locations.
Fix:
Resolve every tsc error (types, imports, generics).
Replace any with proper types or unknown + type guards. Add interfaces/types for API responses and component props. Re-run tsc --noEmit until it passes.
Progress: [ ] Section 3 done.
Section 4 — No hardcoded URLs or ports
Rule: All API base URLs and ports come from configuration (e.g. NEXT_PUBLIC_API_BASE_URL); no literal localhost, IPs, or ports in source.
Check:
Grep for localhost, 127.0.0.1, :3000, :3001, :8080, and similar; exclude comments, README, and env examples.
Confirm every fetch/API call uses a base URL from env or config (e.g. process.env.NEXT_PUBLIC_API_BASE_URL or a derived apiBaseUrl).
Fix:
Replace any hardcoded base URL/port with the configured base URL (env-driven). Ensure the same pattern is used consistently (e.g. one apiBaseUrl helper used everywhere).
Progress: [ ] Section 4 done.
Section 5 — API auth and 401 handling
Rule: Authenticated requests send credentials (e.g. credentials: 'include' or Authorization). On 401, redirect to login or unauthorized and clear session.
Check:
For every fetch to protected backend routes: verify credentials: 'include' or Authorization (or equivalent) is set.
Search for 401 handling: interceptors, response checks, or global error handler. Verify redirect target (e.g. /login or /unauthorized) and that session/token is cleared on 401.
Fix:
Add credentials or auth headers to any protected request that lacks them.
Add 401 handling where missing: on 401 response, redirect to /login (or /unauthorized) and clear cookies/token. Prefer a single place (e.g. fetch wrapper or API module) so behavior is consistent.
Progress: [ ] Section 5 done.
Section 6 — Tailwind-only styling
Rule: Layout and theming use Tailwind (and Shadcn) only; no inline style={{}} for layout/colors/spacing (exceptions: dynamic values like width from data).
Check:
Grep for style=\{\{ in src; list files and usages. Classify: acceptable (e.g. dynamic width) vs should be Tailwind.
Fix:
Replace inline styles that duplicate Tailwind (margin, padding, color, font-size, etc.) with Tailwind classes. Keep only styles that cannot be expressed with Tailwind (e.g. CSS variables or dynamic values).
Progress: [ ] Section 6 done.
Section 7 — Loading and empty states
Rule: Data-fetching pages show a loading state and an empty state where relevant.
Check:
For pages that fetch data (dashboard, lists, detail views): note whether they show loading (skeleton/spinner) while fetching and a clear empty state when the list/data is empty.
Fix:
Add loading UI (e.g. skeleton or spinner) where missing. Add explicit empty state (message + optional CTA) for list/dashboard pages. Reuse Shadcn or existing patterns where possible.
Progress: [ ] Section 7 done.
Section 8 — Form accessibility
Rule: Form inputs have associated labels (htmlFor/id); required fields are indicated; focus order is logical.
Check:
Audit forms (login, register, forgot-password, settings, admin forms): every <input>/<select>/<textarea> has a matching <Label htmlFor="..."> and id; required fields are marked (aria or visual).
Fix:
Add missing id and <Label htmlFor="id">. Add required or aria-required and visible “required” indicator where appropriate. Fix any obviously wrong tab order (e.g. by reordering DOM or using tabIndex only when necessary).
Progress: [ ] Section 8 done.
Section 9 — Metadata and not-found
Rule: Important routes have metadata or generateMetadata. A global not-found.tsx exists and links to /login or home.
Check:
Root layout and key routes (login, register, dashboard, settings, admin) have metadata (title at least).
not-found.tsx exists and offers a link back (e.g. to /login or /).
Fix:
Add metadata / generateMetadata where missing (at least title). Ensure not-found.tsx exists and includes a clear link; align with Section 1 (redirect to login when appropriate).
Progress: [ ] Section 9 done.
Section 10 — Error handling and no leaked internals
Rule: User-facing errors show a safe message; no raw stack traces or internal error strings exposed in the UI.
Check:
Search for catch blocks and error UI: do they show error.message or raw String(e)? Any console.error that might render in SSR or in dev-only UI is acceptable; ensure nothing sensitive is shown in production UI.
Fix:
Replace raw error display with a generic or sanitized message (e.g. “Something went wrong. Please try again.”). Log full error server-side or in dev only. Keep specific, safe messages only where they are intentional (e.g. “Invalid email format”).
Progress: [ ] Section 10 done.
Final verification (run after all sections)
Run pnpm tsc --noEmit (or project typecheck) — must pass.
Run pnpm build (or equivalent) for the UI — must succeed.
Manually or with a quick script: open /login, /register, /forgot-password (unauthenticated) — should load; open a protected route unauthenticated — should redirect to login.
Update progress note: mark all sections Done and add “Final verification passed.”
Summary to output:
List of sections completed.
Bullet list of issues found and fixed (by section).
Any recommendations left for later (e.g. full a11y audit, performance, i18n).
Confirmation that typecheck and build pass and that route protection behaves as required.
Resuming in a new session:
Read the progress note (or previous summary), then start from the first section still marked Pending. After each section, update the progress note and, if you stop, say “Next session: start at Section X.” Use this same prompt again in the next session so the agent has full context.

Section X — Menu visible only on protected pages
Rule: The main app menu (navigation bar, sidebar, or header nav) must be shown only on protected (authenticated) pages. It must not appear on public routes: /login, /register, /forgot-password, and optionally /reset-password, /verify-email, /accept-invitation (if those are public).
Check:
Find where the menu/sidebar/header is rendered (e.g. root layout.tsx, dashboard layout.tsx, or a shared layout component).
See whether it’s rendered for all routes or only under certain pathnames/layouts.
Open (or reason about) the public routes above and confirm the menu is not visible there.
Fix:
Render the menu only when the user is on a protected route. Options:
Use a layout that wraps only protected routes (e.g. (dashboard) or (app) group) and put the menu in that layout so it never wraps login/register/forgot-password; or
In the layout that currently shows the menu, conditionally render the menu (e.g. with usePathname() or middleware-set cookie/header) so it is hidden for public paths.
Ensure public pages have their own minimal layout (no sidebar/nav) and that redirects to /login don’t briefly show the menu.