# Google Workspace catalog entry (Super Admin UI)

To add the Google Workspace integration to the catalog via the **Super Admin integration catalog UI** (instead of the seed script), create an entry with the following values.

## Endpoint

- **POST** `/api/v1/admin/integrations/catalog` (or **POST** `/api/v1/super-admin/integration-catalog`)

## Body (minimal)

| Field | Value |
|-------|--------|
| `integrationId` | `google_workspace` |
| `name` | `google_workspace` |
| `displayName` | `Google Workspace` |
| `description` | Sync Calendar, Drive, and Gmail with domain-wide delegation (service account). |
| `category` | `workspace` |
| `provider` | `google_workspace` |
| `visibility` | `public` |
| `authMethods` | `["serviceaccount"]` |
| `supportedEntities` | `["Event", "Calendar", "Document", "File", "Email", "Message"]` |
| `webhookSupport` | `false` |
| `status` | `active` |
| `createdBy` | \<your admin user id\> |

## Optional

- `shardMappings`: array of `{ integrationEntity, supportedShardTypes, defaultShardType, bidirectionalSync, description? }`  
  - Event/Calendar → `calendarevent`  
  - Document/File → `document`  
  - Email/Message → `email`
- `rateLimit`: `{ requestsPerMinute: 60, requestsPerHour: 3000 }`
- `icon`, `color`, `documentationUrl`, `setupGuideUrl`

## Seed script (alternative)

From the integration-manager root:

```bash
pnpm run seed:google-workspace
```

Requires `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, and optionally `COSMOS_DB_DATABASE_ID` (or set via config).
