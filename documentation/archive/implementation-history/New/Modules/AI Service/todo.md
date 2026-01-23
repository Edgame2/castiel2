# AI Service Module Todo List

## Architecture

- **Type**: Container (Docker)
- **Database**: Shared PostgreSQL (`coder_ide`) with `ai_` table prefix
- **Communication**: REST API + RabbitMQ (publisher)

## Dependencies

- Secret Management (API keys for providers)
- Usage Tracking (sends usage events)
- Prompt Management (fetches prompt templates)

---

## Specification

- [x] Create AI Service Module specification

## Implementation

### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Database schema and migrations (`ai_*` tables)
- [ ] Provider interface and factory pattern
- [ ] OpenAI provider implementation
- [ ] Basic completion endpoint

### Phase 2: Multi-Provider Support (Weeks 3-4)
- [ ] Anthropic provider
- [ ] Azure OpenAI provider
- [ ] Google Gemini provider
- [ ] Ollama provider
- [ ] Chutes provider

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Model router implementation
- [ ] Fallback handling
- [ ] Context manager (truncation)
- [ ] Streaming support

### Phase 4: Operational Features (Weeks 7-8)
- [ ] Rate limiting (Redis-based)
- [ ] Request caching
- [ ] Health checks
- [ ] Logging and monitoring
- [ ] RabbitMQ event publishing

### Phase 5: Admin UI (Weeks 9-10)
- [ ] Model management UI
- [ ] Provider configuration UI
- [ ] Routing rules UI

## Integration

- [ ] Integrate with Secret Management for API keys
- [ ] Integrate with Prompt Management for templates
- [ ] Publish usage events to Usage Tracking
- [ ] Publish events to Notification Manager (failures, rate limits)

## Testing

- [ ] Unit tests for providers
- [ ] Unit tests for router/fallback logic
- [ ] Integration tests for API endpoints
- [ ] Load tests for rate limiting

