Goal: Get the codebase tested and error-free by creating tests, running them, fixing failures, rebuilding if needed, and re-running tests until everything passes. Scope is either the user’s selection (file/folder/container) or “current area”; when the user says “UI” or scope is containers/ui, follow the UI section below.

Conventions (all scopes)
- Use config and env for ports/URLs; no hardcoded values.
- Tests: Vitest; follow existing patterns in containers/<name>/tests/ (or UI patterns in containers/ui).

Steps

1. Create tests
- For the scope the user specifies (file, module, container, or “current area”), add or extend tests.
- Prefer the project’s existing test setup (e.g. Vitest in containers; see setup-container-tests skill).
- Put tests next to the code or in the service’s tests/ layout.
- **UI (containers/ui):** Use Vitest with @testing-library/react. Place tests next to components (e.g. *.test.tsx) or in __tests__/. Mock API via apiFetch or MSW when testing code that calls the backend; use NEXT_PUBLIC_API_BASE_URL / getApiBaseUrl() in app code, never hardcoded URLs.

2. Run tests
- From repo root or the relevant container: pnpm test (or pnpm run test in that package).
- If the project uses Vitest per container, run tests in the affected container(s).
- **UI:** From containers/ui run: pnpm run test:unit (or pnpm test). For coverage: pnpm run test:coverage.
- Record which test suites/files were run and whether they passed or failed.

3. Fix issues
- For each failing test or build error: identify cause, fix code (or test if the test was wrong), and avoid changing behavior that isn’t under test unless the user asked for it.
- Re-run the relevant tests after each fix to confirm.

4. Rebuild
- If fixes touch code that’s built (e.g. TypeScript): run the build for the affected scope (e.g. pnpm build in that package, or docker compose build --no-cache <service> for containers).
- **UI:** From containers/ui run: pnpm build (Next.js build).
- If the project uses containers-health.md, follow the same pattern as in docker-build.md: only rebuild services you changed and update the health list.

5. Run tests again
- Run the same test command(s) as in step 2.
- If anything still fails, repeat from step 3 (fix → run tests → rebuild if needed → run tests) until all specified tests pass and build succeeds.

6. Finish
- Summarize: what was tested, what was fixed, and that tests and build are passing (or what’s left for the user to do).
