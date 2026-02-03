# Container up status

Track services that come up successfully (upy) vs failing. Update after each `docker compose up` or `docker compose build --no-cache [services]`.

**Build status:** 53 buildable (compliance-service removed). ui was failing (fixed).

## Upy (start successfully)
- TBD (run `docker compose up -d` after ui build completes; full build can take 10+ min for ui)

## Failing (build or runtime errors)
- **ui** – Fixed: Dockerfile failed on `COPY --from=builder /app/public ./public` because `/app/public` did not exist. Added `RUN mkdir -p /app/public` in builder stage. Rebuild with `docker compose build --no-cache ui` then `docker compose up -d`. (Build timed out in environment; run locally to verify.)

## Last updates
- docker compose up -d failed on **ui**: "/app/public" not found in builder. Fixed containers/ui/Dockerfile: `RUN mkdir -p /app/public` after `npm run build` in builder stage. compliance-service removed (53 buildable).
