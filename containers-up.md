# Docker Compose build status

- **upy**: All buildable services (prompt-service fix applied; single-service rebuild succeeded).
- **failing**: (none)

## Fix applied
- **prompt-service**: `PromptService.ts` line 275 — TS2347 (untyped function call with type args). Fixed by using result type assertion instead of `.query<...>()` on `any`.

## Last run
- Full build had one failure (prompt-service); fixed and rebuilt.
- `docker-compose up -d` — all services started.
- Latest up: 2026-02-08 — 47/47 containers up.
