# Salesforce Adapter

## Overview

The Salesforce adapter enables bidirectional sync between Castiel and Salesforce CRM. It supports OAuth 2.0 authentication, SOQL queries, REST API operations, and Change Data Capture webhooks.

---

## Configuration

### Provider Details

| Property | Value |
|----------|-------|
| Provider ID | `salesforce` |
| Auth Type | OAuth 2.0 (Web Server Flow) |
| API Version | v59.0 |
| Rate Limits | 25 req/sec, 100K req/day |

### Required Scopes

```
api
refresh_token
offline_access
```

### OAuth Configuration

```typescript
const salesforceOAuth = {
  authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
  tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
  scopes: ['api', 'refresh_token', 'offline_access'],
  responseType: 'code',
  grantType: 'authorization_code'
};

// For sandbox environments
const salesforceSandboxOAuth = {
  authorizationUrl: 'https://test.salesforce.com/services/oauth2/authorize',
  tokenUrl: 'https://test.salesforce.com/services/oauth2/token',
  // ...same scopes
};
```

---

## Entity Mappings

### Account → c_company

| Salesforce Field | Shard Field | Direction |
|------------------|-------------|-----------|
| `Id` | `external_relationships[].externalId` | - |
| `Name` | `name` | Bidirectional |
| `Industry` | `structuredData.industry` | Bidirectional |
| `NumberOfEmployees` | `structuredData.employeeCount` | Bidirectional |
| `AnnualRevenue` | `structuredData.annualRevenue` | Bidirectional |
| `Website` | `structuredData.website` | Bidirectional |
| `Description` | `description` | Bidirectional |
| `Phone` | `structuredData.phone` | Bidirectional |
| `BillingStreet` | `structuredData.address.street` | Bidirectional |
| `BillingCity` | `structuredData.address.city` | Bidirectional |
| `BillingState` | `structuredData.address.state` | Bidirectional |
| `BillingPostalCode` | `structuredData.address.postalCode` | Bidirectional |
| `BillingCountry` | `structuredData.address.country` | Bidirectional |
| `Type` | `structuredData.accountType` | Bidirectional |
| `OwnerId` | `metadata.salesforceOwnerId` | Inbound |
| `LastModifiedDate` | `metadata.externalLastModified` | Inbound |

### Contact → c_contact

| Salesforce Field | Shard Field | Direction |
|------------------|-------------|-----------|
| `Id` | `external_relationships[].externalId` | - |
| `FirstName` | `structuredData.firstName` | Bidirectional |
| `LastName` | `structuredData.lastName` | Bidirectional |
| `Email` | `structuredData.email` | Bidirectional |
| `Phone` | `structuredData.phone` | Bidirectional |
| `Title` | `structuredData.title` | Bidirectional |
| `AccountId` | Relationship to c_company | Bidirectional |
| `Department` | `structuredData.department` | Bidirectional |

### Opportunity → c_opportunity

| Salesforce Field | Shard Field | Direction |
|------------------|-------------|-----------|
| `Id` | `external_relationships[].externalId` | - |
| `Name` | `name` | Bidirectional |
| `Amount` | `structuredData.amount` | Bidirectional |
| `StageName` | `structuredData.stage` | Bidirectional |
| `CloseDate` | `structuredData.closeDate` | Bidirectional |
| `Probability` | `structuredData.probability` | Bidirectional |
| `AccountId` | Relationship to c_company | Bidirectional |
| `Description` | `description` | Bidirectional |

---

## SOQL Query Examples

### Basic Query

```sql
SELECT Id, Name, Industry, Website, Phone
FROM Account
WHERE LastModifiedDate > 2025-01-01T00:00:00Z
LIMIT 1000
```

### With Filters

```sql
SELECT Id, Name, Industry, NumberOfEmployees, AnnualRevenue
FROM Account
WHERE Type = 'Customer'
  AND OwnerId = '005xxx'
  AND Industry IN ('Technology', 'Healthcare')
  AND LastModifiedDate > 2025-01-01T00:00:00Z
ORDER BY LastModifiedDate ASC
LIMIT 1000
```

### Related Records

```sql
SELECT Id, Name, 
  (SELECT Id, FirstName, LastName, Email FROM Contacts)
FROM Account
WHERE Id = '001xxx'
```

---

## API Operations

### Fetch Records

```typescript
async fetchRecords(entity: string, options: FetchOptions): Promise<FetchResult> {
  const soql = this.buildSOQL(entity, options);
  
  const response = await this.request<SalesforceQueryResult>(
    'GET',
    '/services/data/v59.0/query',
    { params: { q: soql } }
  );
  
  return {
    records: response.records,
    hasMore: !response.done,
    cursor: response.nextRecordsUrl,
    totalCount: response.totalSize
  };
}

// Continue pagination
async fetchMoreRecords(cursor: string): Promise<FetchResult> {
  const response = await this.request<SalesforceQueryResult>('GET', cursor);
  
  return {
    records: response.records,
    hasMore: !response.done,
    cursor: response.nextRecordsUrl
  };
}
```

### Create Record

```typescript
async createRecord(entity: string, data: Record<string, any>): Promise<CreateResult> {
  const response = await this.request<SalesforceCreateResult>(
    'POST',
    `/services/data/v59.0/sobjects/${entity}`,
    { body: data }
  );
  
  return {
    id: response.id,
    success: response.success,
    errors: response.errors?.map(e => e.message)
  };
}
```

### Update Record

```typescript
async updateRecord(entity: string, id: string, data: Record<string, any>): Promise<UpdateResult> {
  await this.request(
    'PATCH',
    `/services/data/v59.0/sobjects/${entity}/${id}`,
    { body: data }
  );
  
  return { success: true };
}
```

### Delete Record

```typescript
async deleteRecord(entity: string, id: string): Promise<DeleteResult> {
  await this.request(
    'DELETE',
    `/services/data/v59.0/sobjects/${entity}/${id}`
  );
  
  return { success: true };
}
```

---

## Webhook Support (Change Data Capture)

### Setup CDC

1. Enable Change Data Capture for objects in Salesforce Setup
2. Create a Platform Event subscription
3. Subscribe to events via CometD or Pub/Sub API

### CDC Event Format

```json
{
  "schema": "TIOb-jG_qRKoEBEhAAAAog",
  "payload": {
    "ChangeEventHeader": {
      "entityName": "Account",
      "recordIds": ["001xx000003DGa1AAG"],
      "changeType": "UPDATE",
      "changedFields": ["Name", "Industry"],
      "changeOrigin": "com/salesforce/api/rest",
      "transactionKey": "00000174-4c85-c81c-0000-000000000001",
      "sequenceNumber": 1,
      "commitTimestamp": 1609459200000,
      "commitUser": "005xx000001Svrq",
      "commitNumber": 123456789
    },
    "Name": "Updated Account Name",
    "Industry": "Technology"
  },
  "event": {
    "replayId": 12345
  }
}
```

### Parsing CDC Events

```typescript
parseWebhookPayload(payload: SalesforceCDCEvent): ParsedWebhookEvent {
  const header = payload.payload.ChangeEventHeader;
  
  return {
    eventType: this.mapChangeType(header.changeType),
    entity: header.entityName,
    recordId: header.recordIds[0],
    data: payload.payload,
    timestamp: new Date(header.commitTimestamp)
  };
}

private mapChangeType(changeType: string): string {
  const mapping: Record<string, string> = {
    'CREATE': 'record.created',
    'UPDATE': 'record.updated',
    'DELETE': 'record.deleted',
    'UNDELETE': 'record.restored'
  };
  return mapping[changeType] || changeType.toLowerCase();
}
```

---

## Error Handling

### Salesforce Error Codes

| Code | Meaning | Retryable |
|------|---------|-----------|
| `INVALID_SESSION_ID` | Token expired | Yes (refresh) |
| `REQUEST_LIMIT_EXCEEDED` | Rate limit | Yes (backoff) |
| `UNABLE_TO_LOCK_ROW` | Record locked | Yes |
| `FIELD_INTEGRITY_EXCEPTION` | Validation error | No |
| `ENTITY_IS_DELETED` | Record deleted | No |
| `INSUFFICIENT_ACCESS` | Permission denied | No |

### Error Handler

```typescript
protected handleError(error: any): AdapterError {
  const sfError = error.response?.data?.[0];
  
  if (!sfError) {
    return new AdapterError(error.message, 'UNKNOWN_ERROR');
  }
  
  switch (sfError.errorCode) {
    case 'INVALID_SESSION_ID':
      return new AdapterError('Session expired', 'AUTHENTICATION_FAILED');
      
    case 'REQUEST_LIMIT_EXCEEDED':
      return new AdapterError('Rate limit exceeded', 'RATE_LIMIT', {
        retryable: true,
        retryAfterMs: 60000
      });
      
    case 'UNABLE_TO_LOCK_ROW':
      return new AdapterError('Record locked', 'SERVICE_UNAVAILABLE', {
        retryable: true,
        retryAfterMs: 5000
      });
      
    case 'FIELD_INTEGRITY_EXCEPTION':
    case 'REQUIRED_FIELD_MISSING':
      return new AdapterError(sfError.message, 'VALIDATION_ERROR');
      
    case 'INSUFFICIENT_ACCESS':
      return new AdapterError('Insufficient permissions', 'PERMISSION_DENIED');
      
    default:
      return new AdapterError(sfError.message, 'UNKNOWN_ERROR');
  }
}
```

---

## Testing

### Sandbox Testing

Always use a Salesforce Sandbox for testing:

1. Create a Developer Sandbox
2. Configure OAuth app in sandbox
3. Use `https://test.salesforce.com` for auth

### Test Data

```typescript
const testAccount = {
  Name: 'Castiel Test Account',
  Industry: 'Technology',
  Website: 'https://test.example.com',
  Type: 'Customer'
};

const testContact = {
  FirstName: 'Test',
  LastName: 'Contact',
  Email: 'test@example.com',
  AccountId: '<test_account_id>'
};
```

---

**Last Updated**: November 2025  
**Version**: 1.0.0

