# AI Conversation Module - Test Suite

## Overview

This directory contains the test suite for the AI Conversation module, covering unit tests, integration tests, and test fixtures.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup, mocks, and configuration
├── fixtures/                   # Test data and fixtures
├── unit/                       # Unit tests for individual components
│   ├── utils/                 # Utility function tests
│   └── services/             # Service layer tests
└── integration/               # Integration tests
    └── routes/               # API endpoint tests
```

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm run test:coverage
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

## Test Coverage Requirements

Per ModuleImplementationGuide.md Section 12:
- Unit Tests: ≥ 80% coverage (mandatory)
- Integration Tests: Critical paths (mandatory)
- API Contract Tests: All endpoints (mandatory)

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/services/ConversationService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationService } from '../../../src/services/ConversationService';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    service = new ConversationService();
  });

  it('should create a conversation', async () => {
    // Test implementation
  });
});
```

### Integration Test Example

```typescript
// tests/integration/routes/conversations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../../src/server';

describe('POST /api/v1/conversations', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    app = await buildApp();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  it('should create conversation and return 201', async () => {
    // Test implementation
  });
});
```
