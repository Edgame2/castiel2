# BI Sales Risk – Shard Fields (StructuredData)

**References:** [BI_SALES_RISK_SHARD_SCHEMAS.md](../../../documentation/requirements/BI_SALES_RISK_SHARD_SCHEMAS.md)

---

## Summary

Shard-manager accepts `structuredData` as a generic object. It **does not validate** `structuredData` against shard-type schemas and **does not reject** documents that omit these fields. The following are **optional extensions** for BI Sales Risk. Writers (e.g. integration-manager, adapters) may populate them when the upstream system provides the data.

---

## c_opportunity

**structuredData** may include:

| Field | Type | Notes |
|-------|------|-------|
| Amount | number | Deal value |
| StageName | string | Sales stage |
| CloseDate | string (ISO) | Target close |
| Probability | number | 0–100 |
| IsClosed | boolean | Deal closed |
| IsWon | boolean | Won if closed |
| AccountId | string | Account ref |
| OwnerId | string | Owner ref |
| CreatedDate | string (ISO) | Created |

**NEW (optional):**

| Field | Type | Notes |
|-------|------|-------|
| LastActivityDate | string (ISO) | Last engagement |
| Industry | string | At opportunity level |
| IndustryId | string | For model routing |
| CompetitorIds | string[] | From competitive intel |
| StageUpdatedAt | string (ISO) | When current stage was set |
| StageDates | Record&lt;string, string&gt; | Stage → date entered |
| lossReason | string | Plan §11.8, §943 |
| winReason | string | Plan §11.8, §943 |
| competitorId | string | When lost to |

---

## c_account

**structuredData** may include:

| Field | Type |
|-------|------|
| Name | string |

**NEW (optional):**

| Field | Type |
|-------|------|
| Industry | string |
| IndustryId | string |

---

## c_contact

**NEW (optional):**

| Field | Type | Notes |
|-------|------|-------|
| role | string | `decision_maker` \| `influencer` \| `executive_sponsor` \| other |

**Contact–contact:** `reports_to` relationship; document in shard-manager for propagation/network analysis.

---

## No Validation

ShardService does **not** enforce the presence or shape of these fields. Documents that omit them remain valid. Integration-manager and adapters should map from upstream (e.g. Salesforce) when available; see integration-manager docs for mapping details.
