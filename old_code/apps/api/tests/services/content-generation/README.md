# Content Generation Test Suite

## Overview

Comprehensive test suite for the Content Generation feature, covering:
- Template-based document generation
- Direct prompt-based content generation
- Variable resolution and substitution
- Format conversion (HTML, PDF, DOCX, PPTX)
- Input validation and sanitization
- Error handling

## Test Files

### Service Tests
- **`content-generation.service.test.ts`** - Unit tests for `ContentGenerationService`
  - Template-based document generation
  - Direct content generation
  - Variable resolution (manual, insight-based, defaults)
  - Format conversion
  - Error handling

### Controller Tests
- **`../unit/content-generation.controller.test.ts`** - Unit tests for `ContentGenerationController`
  - Input validation
  - Authentication and authorization
  - AI connection handling
  - Input sanitization
  - Response formatting

## Test Coverage

### Service Tests (25+ tests)
- ✅ Template-based document generation
- ✅ Manual variable substitution
- ✅ Insight-based variable generation
- ✅ Model unavailable handling
- ✅ Presentation template processing
- ✅ Error handling (template not found, service errors)
- ✅ Direct content generation (HTML)
- ✅ Format conversion (PDF, DOCX, PPTX)
- ✅ Variable substitution in generated content
- ✅ Missing dependencies handling
- ✅ Temperature and template ID passing

### Controller Tests (30+ tests)
- ✅ Input validation (prompt required, length limits, type checks)
- ✅ Temperature validation (0-2 range)
- ✅ Authentication checks
- ✅ AI connection handling (specified vs default)
- ✅ Input sanitization (XSS prevention, prompt injection)
- ✅ Response formatting (HTML JSON, binary formats with headers)
- ✅ Error handling (service errors, connection errors)

## Running Tests

```bash
# Run all content generation tests
pnpm --filter @castiel/api test content-generation

# Run service tests only
pnpm --filter @castiel/api test content-generation.service

# Run controller tests only
pnpm --filter @castiel/api test content-generation.controller

# Run with coverage
pnpm --filter @castiel/api test:coverage content-generation
```

## Test Structure

Tests follow the existing patterns:
- Use Vitest testing framework
- Mock all external dependencies
- Test happy paths, error cases, and edge cases
- Use descriptive test names
- Group related tests with `describe` blocks

## Dependencies Mocked

- `TemplateService` - Template retrieval and management
- `InsightService` - AI content generation
- `ShardRepository` - Document storage
- `ConversionService` - Format conversion (optional)
- `AIConnectionService` - AI connection management
- `IMonitoringProvider` - Monitoring and logging

## Notes

- Tests are isolated and don't require external services
- All dependencies are mocked for fast execution
- Tests verify both success and failure scenarios
- Input sanitization is tested to ensure security


