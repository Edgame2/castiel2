# Salesforce (and CRM) to Shard Field Mapping – BI Sales Risk

**References:** [BI_SALES_RISK_SHARD_SCHEMAS.md](../../../documentation/requirements/BI_SALES_RISK_SHARD_SCHEMAS.md), [shard-manager docs/BI_SALES_RISK_SHARD_FIELDS.md](../../shard-manager/docs/BI_SALES_RISK_SHARD_FIELDS.md)

---

## Overview

When syncing from Salesforce (or similar CRM) to shard-manager, `Integration.syncConfig.entityMappings` defines `externalEntity` → `shardTypeId` and `fieldMappings` (`externalField` → `shardField`). The sync layer that builds `structuredData` from upstream records should apply these mappings. **BidirectionalSyncService** uses the same `fieldMappings` for conflict detection between local shard and remote record.

These **NEW** BI Sales Risk fields are optional. Add the mappings below to `entityMappings[].fieldMappings` when the upstream system exposes the source fields. The current adapters and sync execution may not yet map them; this document specifies the intended mapping for when they are wired.

---

## c_opportunity (externalEntity: `Opportunity`)

| shardField (structuredData) | Suggested externalField (Salesforce) | Notes |
|-----------------------------|-------------------------------------|-------|
| LastActivityDate            | `LastActivityDate`                  | Standard; update from activities when available |
| Industry                    | `Industry__c` or Account.Industry   | Custom or from related Account |
| IndustryId                  | `Industry_Code__c` or similar       | Standardized ID for model routing |
| CompetitorIds               | `Competitor__c` or junction `Competitor_Ids__c` | Multi-picklist or custom; may need transform |
| StageUpdatedAt              | `LastStageChangeDate` or custom     | When stage was last changed |
| StageDates                  | Custom JSON or `Stage_Dates__c`     | Stage → date; may require composite/transform |
| lossReason                  | `Loss_Reason__c` or `LossReason`    | When IsClosed and not IsWon |
| winReason                   | `Win_Reason__c` or `Win_Reason`     | When IsWon |
| competitorId                | `Competitor__c` or `Lost_To_Competitor__c` | When lost to a competitor |

Standard Opportunity fields (Amount, StageName, CloseDate, Probability, IsClosed, IsWon, AccountId, OwnerId, CreatedDate) should already be mapped where sync supports them.

---

## c_account (externalEntity: `Account`)

| shardField (structuredData) | Suggested externalField (Salesforce) | Notes |
|-----------------------------|-------------------------------------|-------|
| Industry                    | `Industry`                          | Standard |
| IndustryId                  | `Industry_Code__c` or similar       | Custom standardized ID |

---

## c_contact (externalEntity: `Contact`)

| shardField (structuredData) | Suggested externalField (Salesforce) | Notes |
|-----------------------------|-------------------------------------|-------|
| role                        | `Contact_Role__c`, `Title`, or `Role__c` | Map to `decision_maker` \| `influencer` \| `executive_sponsor` via transform if needed |

---

## Audit Summary

- **BidirectionalSyncService:** Uses `mapping.fieldMappings` (or `mapping.config?.fieldMappings`) to compare `localShard.structuredData` with `remoteRecord`. It does **not** build `structuredData` from upstream; it only detects and resolves conflicts.
- **structuredData construction:** Done by the sync execution layer (e.g. integration-sync or adapters) that pulls upstream records and writes to shard-manager. That layer should use `entityMappings[].fieldMappings` where `externalField` is the upstream field and `shardField` is the key in `structuredData`.
- **AdapterRegistry / AdapterManagerService:** Provide adapter instances; the adapters that fetch and optionally map records are provider-specific. When adding or extending a Salesforce (or CRM) adapter, include the above `externalField` → `shardField` entries where the upstream API provides them.
- **No validation:** Shard-manager does not reject documents that omit these fields. Omit mappings for fields the upstream does not provide.
