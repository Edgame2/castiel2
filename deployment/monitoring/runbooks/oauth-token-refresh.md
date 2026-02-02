# OAuth Token Refresh Runbook

Dedicated worker/timer in **integration-sync** refreshes OAuth tokens before expiration. integration-manager queries expiring connections and publishes refresh-requested events; integration-sync handles each event and calls the refresh API.

---

## 1. Flow

1. **Timer (integration-sync):** On startup, `TokenRefreshService.start()` runs `checkAndRefreshTokens()` immediately, then on an interval (default 1 hour). Config: `token_refresh.enabled`, `token_refresh.interval_ms`, `token_refresh.expiration_threshold_ms`.
2. **Check-expiring:** integration-sync publishes `integration.token.check-expiring` (payload: `timestamp`, `thresholdTime`) to RabbitMQ.
3. **integration-manager:** Consumes `integration.token.check-expiring`, queries `integration_connections` for OAuth connections with `oauth.expiresAt <= thresholdTime`, and publishes `integration.token.refresh-requested` for each (payload: `connectionId`, `integrationId`, `tenantId`, `expiresAt`, `requestedAt`).
4. **integration-sync:** `SyncTaskEventConsumer` consumes `integration.token.refresh-requested` and calls `TokenRefreshService.refreshConnectionTokens()`, which calls integration-manager `POST /api/v1/integrations/:integrationId/connections/:connectionId/refresh`.
5. **Result:** integration-sync publishes `integration.token.refreshed` on success or `integration.token.refresh.failed` on failure.

---

## 2. Verify the worker is running

- **integration-sync logs:** Look for:
  - `"Token refresh worker initialized and started"`
  - `"Published check-expiring event, integration-manager will handle token refresh detection"` (on each timer tick when enabled)
- **Config:** Ensure `token_refresh.enabled` is true (default) and RabbitMQ is configured so integration-sync and integration-manager can publish/consume events.
- **RabbitMQ bindings:** integration-sync queue should receive `integration.token.refresh-requested` (binding in `containers/integration-sync/config/default.yaml`). integration-manager must be subscribed to `integration.token.check-expiring`.

---

## 3. How to test

1. **Set a connection to expire soon:** In Cosmos `integration_connections`, set an OAuth connection’s `oauth.expiresAt` to a time within the threshold (e.g. now + 30 minutes; threshold default 1 hour).
2. **Trigger check:** Wait for the next timer run (default 1 hour) or restart integration-sync to run `checkAndRefreshTokens()` immediately.
3. **Verify:** integration-sync should publish `integration.token.check-expiring`. integration-manager should log "Token check-expiring event received" and "Found OAuth connections with expiring tokens", then publish `integration.token.refresh-requested`. integration-sync should log "Refreshing OAuth tokens for connection" and call the refresh API; on success, "OAuth tokens refreshed successfully" and `integration.token.refreshed`.

---

## 4. Config reference

| Key | Env | Default | Description |
|-----|-----|---------|-------------|
| `token_refresh.enabled` | `TOKEN_REFRESH_ENABLED` | true | Enable the token refresh worker |
| `token_refresh.interval_ms` | `TOKEN_REFRESH_INTERVAL_MS` | 3600000 (1 hour) | Interval between check-expiring runs |
| `token_refresh.expiration_threshold_ms` | `TOKEN_REFRESH_EXPIRATION_THRESHOLD_MS` | 3600000 (1 hour) | Refresh tokens that expire within this many ms |

---

## 5. References

- integration-sync README: OAuth token refresh subsection
- [containers/integration-sync/src/services/TokenRefreshService.ts](../../../containers/integration-sync/src/services/TokenRefreshService.ts)
- [containers/integration-manager/src/events/consumers/IntegrationManagerEventConsumer.ts](../../../containers/integration-manager/src/events/consumers/IntegrationManagerEventConsumer.ts) (`checkAndRefreshExpiringTokens`)
