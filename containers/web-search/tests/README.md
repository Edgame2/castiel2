# web-search Module - Test Suite

## Overview

This directory contains the test suite for the web-search module, covering unit tests, integration tests, and test fixtures.

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

### c_search flow (E2E, optional)
Runs only when `RUN_C_SEARCH_E2E=1` and `SHARD_MANAGER_URL` is set (dataflow Phase 3.5):
```bash
RUN_C_SEARCH_E2E=1 SHARD_MANAGER_URL=http://localhost:3023 pnpm test tests/integration/c-search-flow
```

## Test Coverage Requirements

Per ModuleImplementationGuide.md Section 12:
- Unit Tests: ≥ 80% coverage (mandatory)
- Integration Tests: Critical paths (mandatory)
- API Contract Tests: All endpoints (mandatory)
