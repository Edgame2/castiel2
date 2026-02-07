Run docker-compose (with sudo only if your environment requires it):
  docker-compose -f docker-compose.yml up
(or use -f docker-compose.dev.yml for local development if that's the target).

Fix any build or runtime errors shown in the compose output (e.g. missing env vars, failed health checks, port conflicts, missing images). If code or config changes are needed, follow .cursorrules: no hardcoded ports or URLs, config-driven settings, tenant isolation where applicable.

- If the failure is due to code or Dockerfile changes: run a rebuild (e.g. docker-compose build --no-cache <service> or docker-compose up --build) then bring the stack up again.
- If only config or env changed: fix the config and retry docker-compose up.

If build fails with "no space left" or similar: run docker system df to confirm disk usage, then docker system prune -f (and docker builder prune -f if needed), then retry the build.

Success means: all services in the chosen compose file start and stay running (or pass health checks if defined).

Ask for any information you need (e.g. which compose file, env file location, or logs).