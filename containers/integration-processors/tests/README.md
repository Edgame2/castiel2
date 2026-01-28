# Integration Processors Module - Test Suite

## Overview

This directory contains the test suite for the Integration Processors module, covering unit tests for all consumers and services. The test suite follows ModuleImplementationGuide.md Section 12 requirements with ≥80% coverage target.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup, mocks, and configuration
├── unit/                       # Unit tests for individual components
│   ├── consumers/             # Consumer tests
│   │   ├── ActivityAggregationConsumer.test.ts
│   │   ├── CRMDataMappingConsumer.test.ts
│   │   ├── DocumentProcessorConsumer.test.ts
│   │   ├── EmailProcessorConsumer.test.ts
│   │   └── MeetingProcessorConsumer.test.ts
│   └── services/              # Service tests
│       ├── ActivityAggregationService.test.ts
│       ├── BlobStorageService.test.ts
│       └── DocumentDownloadService.test.ts
└── integration/               # Integration tests (future)
    └── (to be implemented)
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
- **Unit Tests**: ≥ 80% coverage (mandatory)
- **Integration Tests**: Critical paths (mandatory)
- **API Contract Tests**: All endpoints (mandatory)

### Current Coverage

**Unit Tests:**
- ✅ ActivityAggregationConsumer: 8 test cases
- ✅ ActivityAggregationService: 7 test cases
- ✅ CRMDataMappingConsumer: 4 test cases (existing)
- ✅ DocumentProcessorConsumer: 7 test cases
- ✅ EmailProcessorConsumer: 7 test cases
- ✅ MeetingProcessorConsumer: 8 test cases
- ✅ BlobStorageService: 8 test cases
- ✅ DocumentDownloadService: 9 test cases

**Total Test Cases**: 58+ test cases covering:
- Happy path scenarios
- Error handling and failures
- Edge cases (missing fields, empty arrays, etc.)
- Graceful degradation
- Event publishing verification

## Test Patterns

### Mocking Strategy

All external dependencies are mocked:
- `@coder/shared` (ServiceClient, EventPublisher, EventConsumer)
- Azure SDK (BlobStorageService, Cognitive Services)
- HTTP clients (axios)
- Configuration loading

### Test Fixtures

Realistic test data structures matching production event schemas:
- Event payloads with all required fields
- Shard structured data
- Service responses

### Error Testing

Comprehensive error scenario coverage:
- Network failures
- Service unavailability
- Invalid data formats
- Timeout scenarios
- Partial failures (graceful degradation)

## Test Categories

### Consumer Tests

**ActivityAggregationConsumer**
- ✅ Skip non-Email/Meeting/Message shards
- ✅ Create Activity and Interaction shards from Email
- ✅ Create Activity and Interaction shards from Meeting
- ✅ Create Activity and Interaction shards from Message
- ✅ Handle aggregation failures
- ✅ Handle interaction creation failures gracefully

**DocumentProcessorConsumer**
- ✅ Process document successfully with text extraction
- ✅ Handle text extraction failures gracefully
- ✅ Handle download, blob upload, and shard creation failures
- ✅ Document type detection for various MIME types

**EmailProcessorConsumer**
- ✅ Process email without attachments
- ✅ Process email with HTML body and extract plain text
- ✅ Process email with attachments
- ✅ Generate snippet if not provided
- ✅ Handle email with CC and BCC
- ✅ Handle attachment processing failure gracefully
- ✅ Handle shard creation failure

**MeetingProcessorConsumer**
- ✅ Process meeting with transcript and analysis
- ✅ Process meeting with recording download
- ✅ Handle recording download failure gracefully
- ✅ Handle transcript download failure gracefully
- ✅ Handle meeting analysis failure gracefully
- ✅ Classify participants as internal or external
- ✅ Calculate duration if not provided
- ✅ Handle shard creation failure

### Service Tests

**ActivityAggregationService**
- ✅ Create Activity shard from Email, Meeting, Message shards
- ✅ Handle missing optional fields
- ✅ Create Interaction shards for participant pairs
- ✅ Skip participants without contactId
- ✅ Return empty array if no primary contactId
- ✅ Return empty array if no secondary participants

**BlobStorageService**
- ✅ Initialize with valid connection string
- ✅ Throw error if connection string missing
- ✅ Create container if it does not exist
- ✅ Upload file successfully
- ✅ Use default content type if not provided
- ✅ Generate SAS URL successfully
- ✅ Handle upload errors
- ✅ Handle invalid connection string

**DocumentDownloadService**
- ✅ Download document successfully
- ✅ Use custom timeout and maxSize
- ✅ Use default content type if not provided
- ✅ Throw error if file size exceeds maxSize
- ✅ Handle timeout errors
- ✅ Handle 404 errors
- ✅ Handle other HTTP errors
- ✅ Handle maxContentLength errors
- ✅ Pass custom headers

## Future Work

### Integration Tests

Integration tests should cover:
- End-to-end data flow per type:
  - Document: Fetch → Process → Store → Vectorize
  - Email: Receive → Process → Store → Link
  - Meeting: Complete → Transcribe → Analyze → Store
- Cross-service integration:
  - Integration-sync → Integration-processors → Shard-manager
  - Event publishing and consumption
  - Entity linking flow
- Performance tests:
  - Large document processing (50MB)
  - High-volume email processing (1000/hour)
  - Long meeting transcription (2 hours)
  - Concurrent processing (multiple consumers)

### Additional Service Tests

- TextExtractionService tests
- TranscriptionService tests
- MeetingAnalysisService tests

## Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Mocking**: All external dependencies are mocked
3. **Fixtures**: Use realistic test data matching production schemas
4. **Coverage**: Aim for ≥80% coverage on all critical paths
5. **Error Scenarios**: Test both happy paths and error cases
6. **Edge Cases**: Test missing fields, empty arrays, null values
7. **Event Verification**: Verify all events are published correctly

## Notes

- Tests use Vitest as the test framework
- Coverage is tracked using `@vitest/coverage-v8`
- Test timeout is set to 30 seconds for async operations
- All tests run in parallel by default (thread pool)
