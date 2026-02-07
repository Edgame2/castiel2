# Google Workspace to Shard Mapping

Entity and field mappings for the Google Workspace integration (domain-wide delegation). Use `integration.syncConfig.entityMappings` and `integration.syncConfig.pullFilters` to control what is synced.

---

## Entity mapping

| externalEntity (catalog) | Shard type   | Adapter entity (fetchRecords) |
|--------------------------|-------------|--------------------------------|
| Event, Calendar          | calendarevent | event, calendar              |
| Document, File           | document    | document, file                 |
| Email, Message           | email       | email, message                 |

---

## Supported pull filter keys

Configure `integration.syncConfig.pullFilters` as an array of `{ field, operator, value }`. The adapter uses `field` and `value`; `operator` is reserved for future use.

### Calendar (Event / Calendar)

| field       | value type | Description |
|------------|------------|-------------|
| calendarId | string     | Calendar ID (default: `primary`). |
| timeMin    | string     | ISO 8601 datetime; only events on or after this time. |
| timeMax    | string     | ISO 8601 datetime; only events before this time. |

### Drive (Document / File)

| field | value type | Description |
|-------|------------|-------------|
| q     | string     | Drive API [query](https://developers.google.com/drive/api/guides/search-files) (e.g. `'folderId' in parents`, `mimeType = 'application/pdf'`). |

### Gmail (Email / Message)

| field     | value type | Description |
|-----------|------------|-------------|
| labelIds  | string[]   | Gmail label IDs to include (e.g. `INBOX`). Omit to sync default inbox. Exclude `TRASH` and `SPAM` if desired. |

---

## Field mappings (external → shard)

Use these in `entityMappings[].fieldMappings` as `externalField` → `shardField` when building structured data for shards.

### calendarevent (from Calendar API)

| shardField | externalField (adapter output) | Notes |
|------------|-------------------------------|-------|
| id         | id                            | Google event id. |
| summary    | summary                       | Event title. |
| start      | start                         | dateTime or date. |
| end        | end                           | dateTime or date. |
| htmlLink   | htmlLink                      | Link to open in Calendar. |
| status     | status                        | confirmed, tentative, cancelled. |
| ownerEmail | ownerEmail                    | Impersonated user (set by adapter). |

### document (from Drive API)

| shardField   | externalField (adapter output) | Notes |
|--------------|--------------------------------|-------|
| id           | id                             | Drive file id. |
| name         | name                           | File name. |
| mimeType     | mimeType                       | MIME type. |
| size         | size                           | Size in bytes. |
| createdTime  | createdTime                    | ISO 8601. |
| modifiedTime | modifiedTime                   | ISO 8601. |
| webViewLink  | webViewLink                    | Link to open in Drive. |
| ownerEmail   | ownerEmail                     | Impersonated user (set by adapter). |

### email (from Gmail API)

| shardField | externalField (adapter output) | Notes |
|------------|--------------------------------|-------|
| id         | id                             | Gmail message id. |
| threadId   | threadId                       | Thread id. |
| subject    | subject                        | From headers. |
| from       | from                           | From header. |
| to         | to                             | To header. |
| date       | date                           | Date header. |
| snippet    | snippet                        | Short preview. |
| ownerEmail | ownerEmail                     | Impersonated user (set by adapter). |

---

## Domain-wide delegation (service account)

This integration uses **one connection per tenant** with a **Google Cloud service account** and **domain-wide delegation**. No OAuth redirect flow; the tenant stores the service account JSON in secret-management.

1. **Google Cloud**: Create a project, enable Calendar API, Drive API, and Gmail API; create a service account and download the JSON key.
2. **Google Admin Console**: In **Security → API Controls → Domain-wide delegation**, add the service account client ID and grant the required OAuth scopes (read-only recommended):
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/gmail.readonly`
3. **Integration**: Connect with “Service account” in the UI (paste or upload the JSON). Set `integration.settings.userList` (e.g. in sync config or integration settings) to the list of user emails to sync; if empty, the adapter returns no records.

See [google-workspace-catalog-entry.md](./google-workspace-catalog-entry.md) for catalog entry setup.
