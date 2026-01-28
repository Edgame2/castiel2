2. Add Event Schema Validation 🛡️
You're missing explicit schema validation for events. Add this task:
yaml- id: implement-event-schema-validation
  content: Add JSON schema validation for all RabbitMQ events (integration.data.raw, integration.opportunity.updated, etc.) with schema registry
  status: pending
  phase: 2
This prevents downstream consumer failures from malformed events.
3. Correlation ID Strategy 🔗
Your plan mentions correlation IDs but lacks implementation details. Add:
yaml- id: implement-correlation-tracking
  content: Implement correlation ID propagation across all services (integration-sync → mapping consumer → risk → forecast → recommendations) with logging and tracing
  status: pending
  phase: 2
Pattern to use:
typescriptcorrelationId = `sync-${syncTaskId}-${timestamp}`
// Propagate through: headers, event payloads, logs, traces
4. Graceful Degradation Strategy 🔄
Add fallback behavior if async flow fails:
yaml- id: implement-fallback-sync-flow
  content: Add fallback to synchronous flow if RabbitMQ is unavailable or queue depth exceeds threshold (10,000+ messages)
  status: pending
  phase: 7
5. Queue Depth Alerting 📊
Your monitoring section mentions queue depth but doesn't specify thresholds:
Add to Phase 8 (Monitoring):
yaml- id: configure-queue-depth-alerts
  content: |
    Configure alerts for queue depth:
    - Warning: 1,000+ messages
    - Critical: 5,000+ messages
    - Auto-scale: Trigger additional consumer instances at 2,500+ messages
  status: pending
  phase: 8
6. Integration Testing Gaps 🧪
Your integration tests should explicitly cover:
yaml- id: write-failure-scenario-tests
  content: |
    Write integration tests for failure scenarios:
    - RabbitMQ unavailable (fallback to sync)
    - Shard-manager API errors (retry + circuit breaker)
    - Mapping failures (DLQ routing)
    - Idempotency key collisions
  status: pending
  phase: 8
7. Missing: Data Consistency Checks ✓
Add validation that all records are processed:
yaml- id: implement-reconciliation-job
  content: |
    Create daily reconciliation job that compares:
    - integration.data.raw events published vs integration.data.mapped events received
    - Opportunity shards created vs risk evaluations triggered
    - Report discrepancies to monitoring dashboard
  status: pending
  phase: 8
8. Message Size Limits 📦
RabbitMQ has message size limits. Add:
yaml- id: implement-message-size-handling
  content: |
    Handle large messages:
    - Set RabbitMQ max message size: 10MB
    - For rawData > 5MB: Store in blob storage, publish reference
    - Add config: mapping.max_inline_size_mb (default: 5)
  status: pending
  phase: 6
9. Observability Enhancement 👁️
Enhance your metrics with business KPIs:
yaml- id: add-business-metrics
  content: |
    Add business-level Prometheus metrics:
    - integration_sync_records_per_second (by integration type)
    - integration_mapping_success_rate_sla (target: 99.5%)
    - integration_end_to_end_latency_p95 (target: < 30s)
    - integration_pipeline_throughput (records/hour)
  status: pending
  phase: 8
10. Documentation Additions 📚
Enhance your documentation plan:
yaml- id: create-runbook
  content: |
    Create operational runbook:
    - Common failure scenarios and resolutions
    - Queue management procedures
    - DLQ message replay procedures
    - Emergency rollback procedures
    - Performance tuning guide
  status: pending
  phase: 9 (Post-launch)
```

## Architecture Recommendations

### Event Flow Diagram Enhancement

Your ASCII diagram is good, but consider adding **error paths**:
```
[Integration Sync] 
    ↓ (success)
[RabbitMQ Queue]
    ↓ (success)         ↓ (3 failures)
[Mapping Consumer] → [DLQ]
    ↓ (success)         ↓ (manual review)
[Shard Manager]     [DLQ Handler]
    ↓
[Risk Analytics]
Configuration Management
Your mapping config is comprehensive, but consider tenant-level overrides:
typescript// Global defaults in config
mapping: {
  batch_threshold: 100,
  prefetch: 20
}

// Tenant overrides in Cosmos DB
tenantConfig: {
  tenantId: "tenant-123",
  integrationConfig: {
    mapping: {
      batch_threshold: 500,  // Higher threshold for high-volume tenant
      prefetch: 50
    }
  }
}
Risk Mitigation Updates
Add these risks:

Risk: Consumer Lag

Mitigation: Auto-scaling based on queue depth + prefetch tuning
Monitoring: Alert if lag > 5 minutes


Risk: Message Ordering Requirements (currently "no ordering guarantees")

Mitigation: Document which integrations need ordering, use routing keys if needed
Example: Salesforce opportunity updates might need ordering per opportunity


Risk: Schema Evolution

Mitigation: Versioned event schemas + backward-compatible consumers
Strategy: Support N-1 schema versions



Performance Recommendations
Batch Processing Optimization
Your batch size of 50 is reasonable, but consider dynamic batching:
typescript// Adjust batch size based on processing time
if (avgProcessingTime < 100ms) {
  batchSize = 100  // Increase for fast processing
} else if (avgProcessingTime > 500ms) {
  batchSize = 25   // Decrease for slow processing
}
Redis Caching Strategy
Your 10-minute TTL for integration configs is good, but add:

Warm-up cache: Pre-populate cache for active integrations on startup
Cache stampede prevention: Use locks to prevent multiple cache misses

Testing Strategy Enhancement
Add chaos engineering tests:
yaml- id: write-chaos-tests
  content: |
    Write chaos engineering tests:
    - Simulate RabbitMQ connection loss
    - Simulate random consumer crashes
    - Simulate shard-manager API timeouts
    - Verify system recovers gracefully
  status: pending
  phase: 8
Final Recommendations Summary
Must-Do (Critical):

✅ Run Secret Audit parallel with Phase 2
✅ Add event schema validation
✅ Implement correlation ID tracking
✅ Add graceful degradation/fallback
✅ Add data consistency checks
✅ Handle large message sizes


Excellent question! For an enterprise-grade system, you need much more comprehensive retry strategies and resilience patterns. Let me provide deep recommendations:
🔄 Enterprise-Grade Retry Strategy
1. Multi-Layer Retry Architecture (Critical Missing Piece)
Your plan mentions "exponential backoff retry" but lacks detail. Here's what you need:
yaml- id: implement-comprehensive-retry-strategy
  content: |
    Implement multi-layer retry strategy:
    
    LAYER 1: Network/Transport Layer
    - Automatic TCP retries (built into HTTP client)
    - Connection pooling with keep-alive
    - DNS caching and fallback
    
    LAYER 2: Application Layer (RabbitMQ Consumer)
    - Prefetch acknowledgment strategy
    - Message requeue on transient failures
    - Consumer-level retry before DLQ routing
    
    LAYER 3: Business Logic Layer (Mapping Consumer)
    - Per-operation retry configuration
    - Exponential backoff with jitter
    - Circuit breaker integration
    
    LAYER 4: Message Queue Layer
    - DLQ with TTL and replay mechanism
    - Poison message detection
    - Manual intervention queue
    
    Configuration per layer:
    - Layer 1: 3 retries, 1s timeout
    - Layer 2: 5 retries, no delay (requeue)
    - Layer 3: 3 retries, exponential backoff (1s, 2s, 4s) + jitter (±200ms)
    - Layer 4: Infinite retention, manual replay
  status: pending
  phase: 7
  priority: critical
2. Retry Decision Matrix (New Task)
yaml- id: implement-retry-decision-matrix
  content: |
    Implement intelligent retry decision logic:
    
    ERROR CLASSIFICATION:
    
    Transient Errors (ALWAYS RETRY):
    - Network timeout
    - Connection refused
    - 503 Service Unavailable
    - 504 Gateway Timeout
    - 429 Rate Limit (with backoff based on Retry-After header)
    - Temporary database unavailability
    - Lock timeout
    - Circuit breaker open (retry after cooldown)
    
    Permanent Errors (NEVER RETRY):
    - 400 Bad Request (invalid data)
    - 401 Unauthorized (auth failure)
    - 403 Forbidden (permission denied)
    - 404 Not Found (missing resource)
    - 422 Unprocessable Entity (validation error)
    - Invalid schema/data format
    - Business rule violation
    
    Ambiguous Errors (CONDITIONAL RETRY):
    - 500 Internal Server Error (retry up to 3 times)
    - 502 Bad Gateway (retry up to 5 times)
    - Database deadlock (retry with increasing delay)
    - Optimistic locking failure (retry immediately, max 3 times)
    
    Implementation:
    - ErrorClassifier service to categorize errors
    - Per-error-type retry configuration
    - Telemetry for retry patterns
  status: pending
  phase: 7
  priority: critical
3. Advanced Circuit Breaker Configuration (Enhanced)
yaml- id: implement-advanced-circuit-breaker
  content: |
    Implement sophisticated circuit breaker with multiple states:
    
    STATES:
    1. CLOSED (normal operation)
       - Track success/failure rate
       - Threshold: 50% failure rate over 10 requests
       - Time window: 60 seconds
    
    2. OPEN (failing, don't attempt)
       - Reject all requests immediately
       - Duration: 30 seconds initial, exponential increase
       - Max duration: 5 minutes
       - Emit circuit_breaker_open event
    
    3. HALF-OPEN (testing recovery)
       - Allow limited requests (3 probe requests)
       - If all succeed → CLOSED
       - If any fail → OPEN (increase duration)
    
    PER-DEPENDENCY CONFIGURATION:
    
    Shard-Manager API:
    - Failure threshold: 50% over 10 requests
    - Open duration: 30s → 60s → 120s → 300s (max)
    - Half-open probes: 3 requests
    - Fallback: Store in local queue for later retry
    
    Integration-Manager API:
    - Failure threshold: 30% over 20 requests (more tolerant)
    - Open duration: 60s (fixed, config service is critical)
    - Half-open probes: 5 requests
    - Fallback: Use cached config (10-min TTL)
    
    Secret Management Service:
    - Failure threshold: 20% over 5 requests (very critical)
    - Open duration: 15s (quick recovery attempt)
    - Half-open probes: 1 request
    - Fallback: Fail fast, alert immediately
    
    MONITORING:
    - circuit_breaker_state_change (CLOSED→OPEN→HALF_OPEN)
    - circuit_breaker_rejection_count
    - circuit_breaker_recovery_time
    - Alert on: OPEN state > 2 minutes
  status: pending
  phase: 7
  priority: critical
4. Rate Limiting and Backpressure (Missing)
yaml- id: implement-backpressure-mechanism
  content: |
    Implement comprehensive backpressure and rate limiting:
    
    CONSUMER-LEVEL BACKPRESSURE:
    - Dynamic prefetch adjustment based on processing time
    - If processing time > 500ms: reduce prefetch to 10
    - If processing time < 100ms: increase prefetch to 50
    - Monitor queue depth and adjust consumer count
    
    API-LEVEL RATE LIMITING:
    
    Shard-Manager API (outbound):
    - Rate limit: 100 requests/second per consumer instance
    - Token bucket algorithm with burst capacity
    - Burst capacity: 150 requests (50% over limit)
    - Wait time on limit: Block up to 5s, then fail
    
    Integration APIs (inbound):
    - Per-integration rate limits from config
    - Salesforce: 10 requests/second (typical API limit)
    - HubSpot: 100 requests/10 seconds (burst limit)
    - Respect Retry-After headers
    
    QUEUE BACKPRESSURE:
    - If queue depth > 10,000: publish flow control event
    - Integration-sync pauses publishing until depth < 5,000
    - Alert on backpressure events
    - Auto-scale consumers if backpressure > 5 minutes
    
    ADAPTIVE THROTTLING:
    - Monitor error rates per integration
    - If error rate > 10%: reduce request rate by 50%
    - If error rate > 25%: pause for 60 seconds
    - Gradually increase rate after recovery
  status: pending
  phase: 7
  priority: critical
5. Retry Budget Pattern (Enterprise Best Practice)
yaml- id: implement-retry-budget
  content: |
    Implement retry budget to prevent retry storms:
    
    CONCEPT:
    - Set maximum retry "budget" per time window
    - Once budget exhausted, fail fast
    - Prevents cascading failures from excessive retries
    
    CONFIGURATION:
    
    Mapping Consumer:
    - Budget: 1000 retries per minute
    - If exceeded: Fail remaining requests immediately
    - Reset: Every minute
    - Alert: Budget usage > 80%
    
    Per-Integration Budget:
    - Track retry budget per integration
    - Salesforce: 200 retries/minute
    - HubSpot: 300 retries/minute
    - Prevent one bad integration from consuming all retries
    
    ADAPTIVE BUDGET:
    - During normal operation: 100% of budget available
    - During degraded state: Reduce budget by 50%
    - During recovery: Gradually increase budget
    
    MONITORING:
    - retry_budget_usage (percentage)
    - retry_budget_exhausted_count
    - retry_budget_per_integration
  status: pending
  phase: 7
  priority: high
🛡️ Additional Enterprise Requirements
6. Distributed Tracing with Retry Context
yaml- id: implement-distributed-tracing-retries
  content: |
    Enhanced distributed tracing for retry scenarios:
    
    TRACE CONTEXT PROPAGATION:
    - Propagate trace context across all retry attempts
    - Add retry attempt number to span attributes
    - Track retry decision (transient/permanent/conditional)
    - Link parent span to all retry spans
    
    SPAN ATTRIBUTES:
    - retry.attempt: 1, 2, 3, ...
    - retry.reason: "timeout", "503", "circuit_open"
    - retry.decision: "retry", "dlq", "fail_fast"
    - retry.backoff_ms: 1000, 2000, 4000
    - retry.final_outcome: "success", "exhausted", "permanent_error"
    
    TRACE ANALYSIS:
    - Query traces with >3 retry attempts
    - Identify patterns in failed retries
    - Calculate retry success rate by error type
    
    IMPLEMENTATION:
    - OpenTelemetry with Application Insights
    - Custom retry span processor
    - Retry trace dashboard in Application Insights
  status: pending
  phase: 8
  priority: high
7. Bulkhead Pattern for Resource Isolation
yaml- id: implement-bulkhead-pattern
  content: |
    Implement bulkhead pattern to isolate failures:
    
    CONCEPT:
    - Separate connection pools and thread pools per dependency
    - Prevent one failing dependency from exhausting all resources
    
    CONFIGURATION:
    
    Shard-Manager API Pool:
    - Max connections: 50
    - Timeout: 10 seconds
    - Dedicated HTTP client instance
    
    Integration-Manager API Pool:
    - Max connections: 20
    - Timeout: 5 seconds
    - Dedicated HTTP client instance
    
    Secret Management Service Pool:
    - Max connections: 10
    - Timeout: 3 seconds (fast fail)
    - Dedicated HTTP client instance
    
    RabbitMQ Connection Pool:
    - Max connections: 5 per consumer
    - Channel pool: 10 channels per connection
    - Dedicated connection per consumer type
    
    BENEFITS:
    - Shard-manager failure doesn't block secret retrieval
    - Slow integration-manager doesn't exhaust all connections
    - Resource exhaustion contained to specific dependency
  status: pending
  phase: 7
  priority: high
8. Timeout Hierarchy (Missing Detail)
yaml- id: implement-timeout-hierarchy
  content: |
    Implement comprehensive timeout strategy at all levels:
    
    TIMEOUT LEVELS (from outer to inner):
    
    Level 1: Consumer Message Processing Timeout
    - Timeout: 60 seconds (total processing time per message)
    - Action: NACK message, requeue if under retry limit
    - Prevents indefinite message processing
    
    Level 2: Business Operation Timeout
    - Timeout: 30 seconds (mapping + storage operation)
    - Action: Throw timeout exception, trigger retry
    - Prevents slow operations from blocking consumer
    
    Level 3: External API Call Timeout
    - Connection timeout: 3 seconds
    - Read timeout: 7 seconds
    - Total timeout: 10 seconds
    - Action: Retry with exponential backoff
    
    Level 4: Database Operation Timeout
    - Query timeout: 5 seconds
    - Transaction timeout: 10 seconds
    - Action: Rollback, retry with backoff
    
    TIMEOUT PROPAGATION:
    - Pass remaining timeout to downstream calls
    - Example: If 45s remains, pass 30s to API call
    - Prevents cascade of timeouts
    
    CONFIGURATION:
    mapping:
      timeouts:
        message_processing: 60000  # ms
        business_operation: 30000
        api_call_connect: 3000
        api_call_read: 7000
        database_query: 5000
        database_transaction: 10000
  status: pending
  phase: 6
  priority: critical
9. Saga Pattern for Distributed Transactions (Advanced)
yaml- id: implement-saga-pattern
  content: |
    Implement saga pattern for complex multi-step operations:
    
    USE CASE: Opportunity sync with multiple related entities
    
    SAGA STEPS:
    1. Store opportunity shard (compensate: delete shard)
    2. Store related account shard (compensate: delete account)
    3. Store related contacts (compensate: delete contacts)
    4. Publish opportunity.updated event (compensate: N/A, idempotent)
    
    IMPLEMENTATION:
    
    Saga Coordinator:
    - Track saga execution state in Cosmos DB
    - Each step has: forward action + compensation action
    - If step fails: execute compensations in reverse order
    
    Saga State Machine:
    - PENDING → STEP_1 → STEP_2 → STEP_3 → COMPLETED
    - FAILED → COMPENSATING → STEP_3_COMP → STEP_2_COMP → STEP_1_COMP → COMPENSATED
    
    Compensation Actions:
    - Delete created shards
    - Rollback relationship updates
    - Mark saga as failed for manual review
    
    MONITORING:
    - saga_started
    - saga_step_completed
    - saga_failed
    - saga_compensated
    - Alert on: compensation rate > 5%
    
    Note: This is Phase 2 enhancement, not required for initial implementation
  status: pending
  phase: 10 (future enhancement)
  priority: medium
10. Poison Message Detection and Quarantine
yaml- id: implement-poison-message-detection
  content: |
    Implement poison message detection to prevent processing loops:
    
    DETECTION CRITERIA:
    - Message retried > 10 times (across all queues)
    - Message age > 24 hours
    - Message causes consistent crashes/errors
    - Message exceeds size limits after transformation
    
    QUARANTINE PROCESS:
    1. Detect poison message (via retry count or error pattern)
    2. Move to quarantine queue (separate from DLQ)
    3. Strip sensitive data, preserve metadata
    4. Create quarantine record in Cosmos DB
    5. Alert operations team
    6. Block similar messages (if pattern detected)
    
    QUARANTINE QUEUE STRUCTURE:
    - Queue: integration_data_quarantine
    - TTL: 30 days
    - Manual review required
    - Replay capability after fix
    
    POISON MESSAGE METADATA:
    - Original message ID
    - Retry history (timestamps, errors)
    - Error pattern signature
    - Quarantine reason
    - Suggested fix action
    
    REPLAY PROCESS:
    - Fix underlying issue (code, data, config)
    - Review quarantined messages
    - Replay individually or in batch
    - Monitor replay success rate
  status: pending
  phase: 7
  priority: high
11. Health Check and Readiness Probes
yaml- id: implement-comprehensive-health-checks
  content: |
    Implement comprehensive health checks for all components:
    
    MAPPING CONSUMER HEALTH CHECKS:
    
    Liveness Probe (am I alive?):
    - Check: Consumer process is running
    - Check: Event loop is not blocked
    - Check: Memory usage < 80%
    - Interval: 10 seconds
    - Failure action: Restart consumer
    
    Readiness Probe (am I ready to work?):
    - Check: RabbitMQ connection active
    - Check: Can reach shard-manager API
    - Check: Can reach integration-manager API
    - Check: Can reach secret management service
    - Check: Redis cache available
    - Check: Cosmos DB reachable
    - Interval: 5 seconds
    - Failure action: Stop accepting messages
    
    Dependency Health Checks:
    - RabbitMQ: Connection status, queue depth < 10k
    - Shard-Manager API: /health endpoint, response time < 200ms
    - Integration-Manager: /health endpoint, config cache hit rate > 80%
    - Secret Management: /health endpoint, response time < 100ms
    - Redis: Ping response < 10ms
    - Cosmos DB: Query response < 100ms
    
    STARTUP PROBE (for gradual rollout):
    - Check: All dependencies healthy
    - Check: Config loaded successfully
    - Check: Consumer registered with RabbitMQ
    - Timeout: 120 seconds
    - Failure action: Don't route traffic to this instance
    
    HEALTH DASHBOARD:
    - Real-time health status per consumer instance
    - Dependency health matrix
    - Historical health trends
    - Alert on: Any check fails for > 1 minute
  status: pending
  phase: 8
  priority: critical
12. Graceful Shutdown and Drain
yaml- id: implement-graceful-shutdown
  content: |
    Implement graceful shutdown to prevent message loss:
    
    SHUTDOWN SEQUENCE:
    
    1. STOP ACCEPTING NEW MESSAGES (0-5s)
       - Stop consuming from RabbitMQ
       - Mark instance as "draining" in service registry
       - Continue processing in-flight messages
    
    2. DRAIN IN-FLIGHT MESSAGES (5-60s)
       - Complete processing of current messages
       - Maximum drain time: 60 seconds
       - Track drain progress (X of Y messages remaining)
    
    3. CLOSE CONNECTIONS (60-65s)
       - Close RabbitMQ connections gracefully
       - Close HTTP client connections
       - Close database connections
       - Flush logs and metrics
    
    4. EXIT PROCESS (65-70s)
       - Exit with code 0 (clean shutdown)
       - K8s/Container Apps will start new instance
    
    FORCE SHUTDOWN (after 70s):
       - If messages still in-flight after 70s:
       - NACK remaining messages (will be requeued)
       - Force close all connections
       - Exit with code 1 (unclean shutdown)
       - Alert on forced shutdown
    
    SIGNALS HANDLING:
       - SIGTERM: Start graceful shutdown
       - SIGINT: Start graceful shutdown
       - SIGKILL: Immediate termination (no cleanup)
    
    KUBERNETES/CONTAINER APPS CONFIG:
       - terminationGracePeriodSeconds: 75
       - preStop hook: SIGTERM
       - postStart hook: Health check
    
    MONITORING:
       - consumer_drain_started
       - consumer_drain_completed
       - consumer_drain_duration
       - consumer_forced_shutdown (alert)
  status: pending
  phase: 8
  priority: critical
📊 Enhanced Monitoring and Alerting
13. SLA-Based Alerting
yaml- id: implement-sla-based-alerting
  content: |
    Implement SLA-based alerting with multiple severity levels:
    
    SLA DEFINITIONS:
    
    Mapping Success Rate SLA: 99.5%
    - Measurement: (successful mappings / total mappings) over 5-minute window
    - Warning: < 99.5% (notify team)
    - Critical: < 99.0% (page on-call)
    - Severe: < 95.0% (executive escalation)
    
    End-to-End Latency SLA: P95 < 30 seconds
    - Measurement: Time from integration.data.raw published to opportunity.updated published
    - Warning: P95 > 30s (notify team)
    - Critical: P95 > 60s (page on-call)
    - Severe: P95 > 120s (executive escalation)
    
    Queue Depth SLA: < 5,000 messages
    - Measurement: integration_data_raw queue depth
    - Warning: > 5,000 (auto-scale consumers)
    - Critical: > 10,000 (page on-call + pause publishing)
    - Severe: > 50,000 (executive escalation + incident)
    
    DLQ Rate SLA: < 0.5%
    - Measurement: (DLQ messages / total messages) over 1-hour window
    - Warning: > 0.5% (investigate)
    - Critical: > 1.0% (page on-call)
    - Severe: > 5.0% (executive escalation)
    
    ALERTING CHANNELS:
    - Warning: Slack #castiel-alerts
    - Critical: PagerDuty on-call
    - Severe: PagerDuty + email to leadership
    
    ALERT FATIGUE PREVENTION:
    - Suppress duplicate alerts within 30 minutes
    - Auto-resolve when SLA restored for 15 minutes
    - Daily SLA summary report (even if no breaches)
  status: pending
  phase: 8
  priority: critical
14. Error Budget Tracking
yaml- id: implement-error-budget-tracking
  content: |
    Implement error budget tracking for change management:
    
    CONCEPT:
    - SLA = 99.5% success rate
    - Error budget = 0.5% = 50 failures per 10,000 requests
    - Track error budget consumption over rolling 30-day window
    
    ERROR BUDGET POLICIES:
    
    Budget > 80% remaining:
    - Status: HEALTHY
    - Change policy: Normal deployments allowed
    - Frequency: Multiple deployments per day OK
    
    Budget 50-80% remaining:
    - Status: CAUTION
    - Change policy: Reduced deployment frequency
    - Action: Review recent changes, increase monitoring
    
    Budget 20-50% remaining:
    - Status: WARNING
    - Change policy: Only critical bug fixes
    - Action: Freeze feature deployments, focus on reliability
    
    Budget < 20% remaining:
    - Status: CRITICAL
    - Change policy: FREEZE all changes except emergency fixes
    - Action: Incident response, root cause analysis
    
    Budget exhausted (0%):
    - Status: SLA BREACH
    - Change policy: Complete freeze
    - Action: Full incident, executive review
    
    MONITORING:
    - error_budget_remaining (percentage)
    - error_budget_consumption_rate (per day)
    - projected_budget_exhaustion_date
    - Alert: Budget < 50%, < 20%, exhausted
  status: pending
  phase: 9 (post-launch)
  priority: medium
Summary of Critical Missing Pieces
Your plan is good but needs these enterprise-grade enhancements:
Must-Add (Critical) 🔴:

✅ Multi-layer retry architecture with decision matrix
✅ Advanced circuit breaker with state management
✅ Backpressure and adaptive rate limiting
✅ Timeout hierarchy at all levels
✅ Poison message detection and quarantine
✅ Comprehensive health checks (liveness/readiness)
✅ Graceful shutdown with message drain
✅ SLA-based alerting with escalation

Should-Add (Important) 🟡:

✅ Retry budget pattern to prevent retry storms
✅ Bulkhead pattern for resource isolation
✅ Distributed tracing with retry context
✅ Error budget tracking for change management


. Webhook Support & Real-Time Sync (Critical Missing)
yaml- id: implement-webhook-receiver
  content: |
    Implement webhook receiver for real-time integration updates:
    
    WEBHOOK ARCHITECTURE:
    
    New Service: integration-webhook-receiver
    - Dedicated Container App for webhook ingestion
    - Public endpoint: /webhooks/{integration}/{tenantId}
    - Signature verification for each integration type
    - Rate limiting per tenant
    - Immediate event publishing to RabbitMQ
    
    SUPPORTED WEBHOOK TYPES:
    
    Salesforce:
    - Outbound Messages (SOAP)
    - Platform Events (streaming API)
    - Change Data Capture (CDC)
    - Workflow Rules
    
    HubSpot:
    - Webhooks API
    - Contact/Deal/Company updates
    - Timeline events
    
    Slack:
    - Events API
    - Message events
    - Channel events
    
    WEBHOOK FLOW:
    1. External system sends webhook POST
    2. Verify signature (HMAC-SHA256)
    3. Validate payload schema
    4. Check idempotency (webhook IDs)
    5. Publish integration.webhook.received event
    6. Return 200 OK immediately (async processing)
    7. Mapping consumer processes webhook event
    
    WEBHOOK CONFIGURATION (per integration):
    - webhook_url: Auto-generated URL
    - webhook_secret: Stored in Secret Management
    - webhook_events: Array of event types to subscribe
    - webhook_retry_policy: Retry configuration
    - webhook_signature_algorithm: HMAC-SHA256, etc.
    
    BENEFITS:
    - Real-time updates (no polling)
    - Reduced API quota consumption
    - Lower latency for CRM updates
    - Better user experience
    
    WEBHOOK-SPECIFIC EVENTS:
    - integration.webhook.received
    - integration.webhook.verified
    - integration.webhook.verification_failed
    
    SECURITY:
    - IP whitelist per integration
    - Request signature verification
    - Request size limits (10MB max)
    - Rate limiting per tenant (1000 req/min)
  status: pending
  phase: 10 (post-MVP)
  priority: high
2. Incremental Sync & Change Detection (Efficiency)
yaml- id: implement-incremental-sync
  content: |
    Implement incremental sync to reduce API calls and processing:
    
    CHANGE DETECTION STRATEGIES:
    
    Strategy 1: Timestamp-Based (Most Common)
    - Track lastSyncTimestamp per integration
    - Query: WHERE ModifiedDate > lastSyncTimestamp
    - Works for: Salesforce, HubSpot, Dynamics
    - Store in: integration.syncState.lastSyncTimestamp
    
    Strategy 2: Change Token-Based (Preferred)
    - Use integration's native change tracking
    - Salesforce: getUpdated() API with dateRange
    - HubSpot: after parameter in pagination
    - Store in: integration.syncState.changeToken
    
    Strategy 3: CDC (Change Data Capture)
    - Subscribe to integration's CDC stream
    - Salesforce: Change Data Capture events
    - Dynamics: Change Tracking
    - Store in: integration.syncState.cdcPosition
    
    Strategy 4: Webhook + Incremental Fallback
    - Primary: Webhooks for real-time updates
    - Fallback: Incremental sync every 15 minutes
    - Catches missed webhooks
    
    SYNC STATE MANAGEMENT:
    
    Cosmos DB Schema:
    {
      id: "sync-state-{integrationId}",
      integrationId: string,
      tenantId: string,
      entityType: string,
      lastSyncTimestamp: Date,
      changeToken: string,
      cdcPosition: string,
      lastFullSyncTimestamp: Date,  // For validation
      syncMethod: "incremental" | "full",
      recordsProcessedSinceLastFull: number
    }
    
    FULL SYNC SCHEDULE:
    - Weekly full sync (validation)
    - Daily incremental syncs
    - Webhook for real-time updates
    - Reconciliation after full sync
    
    IMPLEMENTATION:
    
    IntegrationSyncService.executeSyncTask():
    1. Load sync state from Cosmos DB
    2. Determine sync method (incremental vs full)
    3. Build query with incremental filters
    4. Execute sync (smaller dataset)
    5. Update sync state with new timestamp/token
    6. Publish events (same as before)
    
    BENEFITS:
    - 90%+ reduction in API calls
    - Faster sync execution
    - Lower API quota consumption
    - Reduced processing cost
    
    METRICS:
    - integration_incremental_sync_records
    - integration_full_sync_records
    - integration_sync_duration_by_method
  status: pending
  phase: 9 (post-MVP)
  priority: high
3. Bidirectional Sync & Conflict Resolution (Advanced)
yaml- id: implement-bidirectional-sync
  content: |
    Implement bidirectional sync with sophisticated conflict resolution:
    
    BIDIRECTIONAL SYNC ARCHITECTURE:
    
    Current State: One-way (CRM → Castiel)
    Target State: Two-way (CRM ↔ Castiel)
    
    USE CASES:
    - Update opportunity stage in Castiel → Sync to Salesforce
    - Add notes in Castiel → Create Salesforce task
    - Mark account as "Hot" → Update Salesforce field
    - Generate recommendations → Create Salesforce tasks
    
    CONFLICT DETECTION:
    
    Scenario 1: Concurrent Updates
    - User updates opportunity in Salesforce
    - User updates same opportunity in Castiel
    - Both changes occur within 5-second window
    - Conflict: Which update wins?
    
    Scenario 2: Stale Data
    - Castiel has cached data (last synced 1 hour ago)
    - User makes change based on stale data
    - Meanwhile, Salesforce data changed
    - Conflict: Overwrite or merge?
    
    Scenario 3: Field-Level Conflicts
    - User updates Amount in Salesforce: $100k → $150k
    - User updates Stage in Castiel: Qualify → Propose
    - No conflict: Different fields
    - Auto-merge: Both changes applied
    
    CONFLICT RESOLUTION STRATEGIES:
    
    Strategy 1: Last-Write-Wins (LWW)
    - Simple, fast
    - Use modification timestamps
    - Risk: Data loss if not careful
    
    Strategy 2: Source-Priority
    - CRM (Salesforce) always wins
    - Castiel is read-only or secondary
    - Safe but limits functionality
    
    Strategy 3: Field-Level Merging
    - Track changed fields per update
    - Merge non-conflicting fields
    - Flag field-level conflicts for manual resolution
    - Best for most use cases
    
    Strategy 4: User-Driven Resolution
    - Detect conflict
    - Present conflict to user
    - User chooses winning version
    - Highest quality but manual
    
    IMPLEMENTATION:
    
    Conflict Detection Service:
```typescript
    interface ConflictDetection {
      detectConflict(
        castielVersion: Shard,
        crmVersion: Record<string, any>,
        syncState: SyncState
      ): Conflict | null;
      
      resolveConflict(
        conflict: Conflict,
        strategy: ConflictResolutionStrategy
      ): ResolvedData;
    }
    
    interface Conflict {
      conflictType: "concurrent" | "stale" | "field_level";
      castielFields: Record<string, any>;
      crmFields: Record<string, any>;
      conflictingFields: string[];
      castielModifiedAt: Date;
      crmModifiedAt: Date;
    }
```
    
    Bidirectional Sync Flow:
    1. Castiel change triggers outbound sync event
    2. Outbound sync service validates change
    3. Check for concurrent CRM changes (conflict detection)
    4. If no conflict: Push to CRM API
    5. If conflict: Apply resolution strategy
    6. Track sync status and failures
    
    SYNC STATE TRACKING:
    
    Add to Cosmos DB:
    {
      lastModifiedInCastiel: Date,
      lastModifiedInCRM: Date,
      lastSyncedToCRM: Date,
      lastSyncedFromCRM: Date,
      pendingCastielChanges: string[],  // Field names
      pendingCRMChanges: string[],
      conflictStatus: "none" | "detected" | "resolved",
      conflictHistory: ConflictRecord[]
    }
    
    RECOMMENDED APPROACH FOR MVP:
    - Start with one-way sync (CRM → Castiel)
    - Phase 2: Add write-back for specific fields (stage, status)
    - Phase 3: Add field-level conflict resolution
    - Phase 4: Add user-driven conflict resolution UI
  status: pending
  phase: 11 (future)
  priority: medium
4. Integration Health Monitoring & Auto-Recovery (Reliability)
yaml- id: implement-integration-health-monitoring
  content: |
    Implement comprehensive integration health monitoring:
    
    HEALTH DIMENSIONS:
    
    1. Connectivity Health
       - Can we reach the integration API?
       - Is authentication working?
       - What's the API response time?
       - Probe: Every 5 minutes
    
    2. Sync Health
       - When was last successful sync?
       - How many consecutive failures?
       - What's the sync latency?
       - Probe: Every sync execution
    
    3. Data Quality Health
       - Are we getting expected data?
       - Any schema changes detected?
       - Any validation failures?
       - Probe: Every sync, random sampling
    
    4. Quota Health
       - API quota usage (%)
       - Rate limit encounters
       - Projected quota exhaustion time
       - Probe: After each API call
    
    5. Webhook Health (if applicable)
       - Last webhook received time
       - Webhook delivery success rate
       - Webhook signature failures
       - Probe: Continuous monitoring
    
    HEALTH STATUS CALCULATION:
    
    enum HealthStatus {
      HEALTHY = "healthy",           // All checks passing
      DEGRADED = "degraded",         // Some checks failing
      UNHEALTHY = "unhealthy",       // Critical checks failing
      DISCONNECTED = "disconnected"  // Cannot reach API
    }
    
    Health Score Algorithm:
    - Connectivity: 40% weight
    - Sync success rate: 30% weight
    - Data quality: 20% weight
    - Quota availability: 10% weight
    
    Score > 90%: HEALTHY
    Score 70-90%: DEGRADED
    Score < 70%: UNHEALTHY
    Cannot connect: DISCONNECTED
    
    AUTO-RECOVERY ACTIONS:
    
    Action 1: Automatic Token Refresh
    - Trigger: 401 Unauthorized
    - Action: Refresh OAuth token
    - Retry original request
    - Alert if refresh fails
    
    Action 2: Circuit Breaker Reset
    - Trigger: Circuit breaker OPEN for > 5 minutes
    - Action: Probe endpoint health
    - If healthy: Reset circuit breaker
    - If unhealthy: Keep OPEN, alert
    
    Action 3: Sync Retry with Backoff
    - Trigger: Sync failure
    - Action: Retry with exponential backoff
    - Max retries: 5
    - Alert after max retries
    
    Action 4: Incremental → Full Sync Fallback
    - Trigger: Incremental sync failures > 3
    - Action: Switch to full sync
    - Alert: "Integration X in fallback mode"
    - Auto-revert after successful full sync
    
    Action 5: Auto-Disable Integration
    - Trigger: Health status UNHEALTHY for > 1 hour
    - Action: Disable integration, stop sync
    - Alert: "Integration X auto-disabled"
    - Manual re-enable required
    
    HEALTH DASHBOARD:
    
    Integration Health View (per tenant):
    - Integration name and type
    - Current health status (color-coded)
    - Last successful sync time
    - Sync success rate (24h, 7d, 30d)
    - API quota usage (%)
    - Recent errors (last 10)
    - Auto-recovery attempts
    
    Tenant Integration Overview:
    - Total integrations
    - Healthy count
    - Degraded count
    - Unhealthy count
    - Disconnected count
    - Recommendations for fixes
    
    ALERTING:
    
    Alert Levels:
    - INFO: Integration degraded (Slack notification)
    - WARNING: Integration unhealthy (Slack + email)
    - CRITICAL: Integration disconnected (PagerDuty)
    - CRITICAL: Auto-disabled integration (PagerDuty + email)
    
    Alert Suppression:
    - Suppress duplicates within 30 minutes
    - Daily summary for non-critical issues
    - Immediate escalation for critical issues
  status: pending
  phase: 9 (post-MVP)
  priority: critical
5. Integration Testing & Sandbox Support (Quality)
yaml- id: implement-integration-testing-framework
  content: |
    Implement comprehensive integration testing framework:
    
    TESTING LAYERS:
    
    Layer 1: Unit Tests (Adapter Logic)
    - Test field mapping logic
    - Test data transformation
    - Test error handling
    - Mock external API calls
    - Coverage target: 90%+
    
    Layer 2: Integration Tests (External API)
    - Test against sandbox environments
    - Test authentication flows
    - Test data fetching
    - Test rate limiting behavior
    - Test error scenarios
    
    Layer 3: End-to-End Tests (Full Flow)
    - Test complete sync flow
    - Test webhook processing
    - Test bidirectional sync
    - Test conflict resolution
    - Test auto-recovery
    
    SANDBOX ENVIRONMENT SUPPORT:
    
    Per-Integration Sandbox Config:
    {
      integrationId: string,
      isSandbox: boolean,
      sandboxBaseUrl: string,
      sandboxCredentials: {
        clientId: string,
        clientSecret: string,  // In Secret Management
        accessToken: string
      },
      sandboxLimits: {
        maxRecords: 100,  // Limit for sandbox
        maxAPICalls: 1000
      }
    }
    
    TESTING APPROACH:
    
    Development Environment:
    - All integrations use sandbox
    - Developers can test freely
    - No production data risk
    
    Staging Environment:
    - Mix of sandbox and production
    - Test production configs in isolation
    - Validate before production
    
    Production Environment:
    - Only production integrations
    - Sandbox configs disabled
    - Full monitoring enabled
    
    INTEGRATION TEST SUITE:
    
    Test Categories:
    
    1. Authentication Tests
       - OAuth flow (authorization code)
       - Token refresh
       - API key validation
       - Multi-tenant isolation
    
    2. Data Sync Tests
       - Full sync
       - Incremental sync
       - Webhook processing
       - Batch processing
       - Large dataset handling (10k+ records)
    
    3. Error Handling Tests
       - Network timeouts
       - API rate limits (429)
       - Invalid credentials (401)
       - Missing permissions (403)
       - Server errors (500, 503)
       - Malformed responses
    
    4. Data Quality Tests
       - Field mapping accuracy
       - Data type conversions
       - Null/undefined handling
       - Schema validation
       - PII detection and redaction
    
    5. Performance Tests
       - Sync latency
       - API call efficiency
       - Queue processing speed
       - Memory usage
       - Concurrent sync handling
    
    AUTOMATED TESTING:
    
    CI/CD Pipeline Integration:
    - Run unit tests on every commit
    - Run integration tests on PR
    - Run E2E tests nightly
    - Alert on test failures
    
    Sandbox Data Setup:
    - Seed sandbox with test data
    - Use consistent test datasets
    - Reset sandbox after tests
    - Parallel test execution
    
    TEST REPORTING:
    
    Integration Test Report:
    - Test execution time
    - Pass/fail rate per integration
    - Coverage metrics
    - Performance benchmarks
    - Flaky test detection
  status: pending
  phase: 8 (pre-production)
  priority: high
6. Multi-Tenant Isolation & Data Segregation (Security)
yaml- id: enhance-multi-tenant-isolation
  content: |
    Enhance multi-tenant isolation for integration system:
    
    ISOLATION LAYERS:
    
    Layer 1: Credential Isolation
    - Each tenant's credentials in separate Secret Management keys
    - Key format: /secrets/{tenantId}/integrations/{integrationId}
    - No cross-tenant credential access
    - Audit all credential access
    
    Layer 2: Data Isolation
    - All shards have tenantId
    - All queries filtered by tenantId
    - No cross-tenant data leakage
    - Partition key: tenantId
    
    Layer 3: Queue Isolation (Advanced)
    - Option: Dedicated queues per tenant
    - Format: integration_data_raw_{tenantId}
    - Benefits: Noisy neighbor isolation
    - Trade-off: More infrastructure complexity
    
    Layer 4: Rate Limit Isolation
    - Per-tenant rate limits
    - Per-integration-per-tenant rate limits
    - Prevent tenant A from exhausting tenant B's quota
    - Track and enforce separately
    
    TENANT-SPECIFIC CONFIGURATIONS:
    
    Per-Tenant Integration Config:
    {
      tenantId: string,
      integrationId: string,
      enabled: boolean,
      syncFrequency: "real-time" | "hourly" | "daily",
      rateLimits: {
        requestsPerMinute: number,
        requestsPerHour: number
      },
      features: {
        webhooks: boolean,
        bidirectionalSync: boolean,
        incrementalSync: boolean
      },
      dataRetention: {
        retainRawData: boolean,
        retentionDays: number
      },
      notifications: {
        syncFailures: boolean,
        quotaAlerts: boolean,
        healthStatus: boolean
      }
    }
    
    COMPLIANCE FEATURES:
    
    1. Data Residency
       - Cosmos DB geo-replication config per tenant
       - Some tenants: EU only
       - Some tenants: Global
       - Enforce in integration configs
    
    2. Data Retention
       - Per-tenant retention policies
       - Auto-delete after retention period
       - Support GDPR "right to be forgotten"
    
    3. Audit Logging
       - Log all integration access per tenant
       - Log all credential access
       - Log all data sync operations
       - Searchable audit trail
    
    4. PII Handling
       - Detect PII in integration data
       - Redact based on tenant policy
       - Some tenants: Full PII storage
       - Some tenants: PII redacted
    
    TENANT ONBOARDING:
    
    New Tenant Integration Setup:
    1. Create tenant in Cosmos DB
    2. Provision Secret Management namespace
    3. Configure default rate limits
    4. Enable default integrations
    5. Set up monitoring dashboards
    6. Configure alerting
    7. Run health checks
    
    CROSS-TENANT ANALYTICS (Anonymous):
    - Aggregate metrics across tenants
    - Remove tenant identifiers
    - Usage patterns (which integrations most popular)
    - Error rates by integration type
    - Performance benchmarks
    - NO tenant-specific data shared
  status: pending
  phase: 7 (pre-production)
  priority: critical
7. Integration Adapter Framework & Plugin System (Extensibility)
yaml- id: implement-adapter-framework
  content: |
    Implement standardized adapter framework for easy integration additions:
    
    ADAPTER INTERFACE:
```typescript
    interface IntegrationAdapter {
      // Metadata
      name: string;
      version: string;
      supportedEntities: EntityType[];
      capabilities: AdapterCapabilities;
      
      // Authentication
      authenticate(credentials: Credentials): Promise<AuthResult>;
      refreshToken(refreshToken: string): Promise<AuthResult>;
      validateCredentials(credentials: Credentials): Promise<boolean>;
      
      // Data Operations
      fetchRecords(
        entityType: EntityType,
        options: FetchOptions
      ): Promise<Record[]>;
      
      fetchRecord(
        entityType: EntityType,
        recordId: string
      ): Promise<Record>;
      
      createRecord(
        entityType: EntityType,
        data: Record<string, any>
      ): Promise<string>;
      
      updateRecord(
        entityType: EntityType,
        recordId: string,
        data: Record<string, any>
      ): Promise<void>;
      
      deleteRecord(
        entityType: EntityType,
        recordId: string
      ): Promise<void>;
      
      // Sync Operations
      getChangedRecords(
        entityType: EntityType,
        since: Date
      ): Promise<Record[]>;
      
      supportsWebhooks(): boolean;
      getWebhookConfig(): WebhookConfig | null;
      verifyWebhookSignature(
        payload: string,
        signature: string,
        secret: string
      ): boolean;
      
      // Metadata Operations
      describeEntity(entityType: EntityType): Promise<EntitySchema>;
      listAvailableEntities(): Promise<EntityType[]>;
      
      // Rate Limiting
      getRateLimits(): RateLimitInfo;
      handleRateLimit(retryAfter: number): Promise<void>;
    }
    
    interface AdapterCapabilities {
      incrementalSync: boolean;
      webhooks: boolean;
      bidirectionalSync: boolean;
      bulkOperations: boolean;
      changeDataCapture: boolean;
      fieldLevelSecurity: boolean;
    }
```
    
    ADAPTER REGISTRATION:
    
    Adapter Registry Pattern:
```typescript
    class IntegrationAdapterRegistry {
      private adapters: Map<string, IntegrationAdapter> = new Map();
      
      register(type: string, adapter: IntegrationAdapter): void {
        this.adapters.set(type, adapter);
      }
      
      get(type: string): IntegrationAdapter | undefined {
        return this.adapters.get(type);
      }
      
      listAdapters(): string[] {
        return Array.from(this.adapters.keys());
      }
    }
    
    // Registration in service initialization
    adapterRegistry.register('salesforce', new SalesforceAdapter());
    adapterRegistry.register('hubspot', new HubSpotAdapter());
    adapterRegistry.register('dynamics', new DynamicsAdapter());
```
    
    BASE ADAPTER CLASS:
```typescript
    abstract class BaseIntegrationAdapter implements IntegrationAdapter {
      protected httpClient: HttpClient;
      protected rateLimiter: RateLimiter;
      protected logger: Logger;
      
      constructor(config: AdapterConfig) {
        this.httpClient = new HttpClient(config);
        this.rateLimiter = new RateLimiter(config.rateLimits);
        this.logger = new Logger({ context: this.name });
      }
      
      // Common implementations
      async fetchWithRateLimit<T>(
        url: string,
        options?: RequestOptions
      ): Promise<T> {
        await this.rateLimiter.acquire();
        try {
          return await this.httpClient.get<T>(url, options);
        } catch (error) {
          if (error.statusCode === 429) {
            await this.handleRateLimit(error.retryAfter);
            return this.fetchWithRateLimit(url, options);
          }
          throw error;
        }
      }
      
      // Common error handling
      protected handleError(error: any): never {
        if (error.statusCode === 401) {
          throw new AuthenticationError('Invalid credentials');
        } else if (error.statusCode === 403) {
          throw new AuthorizationError('Insufficient permissions');
        }
        throw new IntegrationError('Integration error', error);
      }
      
      // Abstract methods (must implement)
      abstract authenticate(credentials: Credentials): Promise<AuthResult>;
      abstract fetchRecords(
        entityType: EntityType,
        options: FetchOptions
      ): Promise<Record[]>;
    }
```
    
    PLUGIN SYSTEM FOR CUSTOM TRANSFORMERS:
```typescript
    interface TransformerPlugin {
      name: string;
      version: string;
      transform(value: any, options?: any): any;
      validate(value: any): boolean;
    }
    
    class TransformerRegistry {
      private transformers: Map<string, TransformerPlugin> = new Map();
      
      register(name: string, transformer: TransformerPlugin): void {
        this.transformers.set(name, transformer);
      }
      
      get(name: string): TransformerPlugin | undefined {
        return this.transformers.get(name);
      }
    }
    
    // Example custom transformer
    class CurrencyConverterTransformer implements TransformerPlugin {
      name = 'currency-converter';
      version = '1.0.0';
      
      transform(value: number, options: { from: string; to: string }): number {
        // Currency conversion logic
        return convertCurrency(value, options.from, options.to);
      }
      
      validate(value: any): boolean {
        return typeof value === 'number' && value >= 0;
      }
    }
```
    
    BENEFITS:
    - Easy to add new integrations
    - Consistent behavior across adapters
    - Reusable code (base class)
    - Plugin system for custom transformations
    - Type-safe adapter implementations
  status: pending
  phase: 6 (architecture)
  priority: high
8. Integration Marketplace & Templates (User Experience)
yaml- id: implement-integration-marketplace
  content: |
    Implement integration marketplace for easy setup:
    
    MARKETPLACE FEATURES:
    
    1. Integration Catalog
       - Browse available integrations
       - Search and filter
       - Category grouping (CRM, Productivity, Communication)
       - Popularity ranking
       - Setup difficulty rating
    
    2. Integration Templates
       - Pre-configured field mappings
       - Common sync configurations
       - Industry-specific templates
       - Use case templates (e.g., "Sales Pipeline Sync")
    
    3. One-Click Setup
       - OAuth flow initiated from UI
       - Auto-detect entities
       - Suggest field mappings
       - Test connection
       - Enable integration
    
    4. Integration Health Dashboard
       - Visual health indicators
       - Sync history and stats
       - Error logs with fixes
       - Quota usage
       - Performance metrics
    
    TEMPLATE STRUCTURE:
```typescript
    interface IntegrationTemplate {
      id: string;
      name: string;
      description: string;
      integrationType: string;
      category: string;
      difficulty: "easy" | "medium" | "advanced";
      estimatedSetupTime: number;  // minutes
      
      defaultConfig: {
        syncFrequency: string;
        enabledEntities: EntityType[];
        fieldMappings: FieldMapping[];
        webhooks: boolean;
        bidirectionalSync: boolean;
      };
      
      requirements: {
        permissions: string[];
        apiVersion: string;
        prerequisites: string[];
      };
      
      setupGuide: {
        steps: SetupStep[];
        troubleshooting: TroubleshootingGuide[];
        faq: FAQ[];
      };
    }
```
    
    TEMPLATE EXAMPLES:
    
    1. "Salesforce Sales Pipeline"
       - Sync: Opportunities, Accounts, Contacts
       - Frequency: Real-time (webhooks)
       - Field mappings: Standard CRM fields
       - Difficulty: Easy
       - Setup time: 5 minutes
    
    2. "HubSpot Marketing Automation"
       - Sync: Deals, Companies, Contacts, Emails
       - Frequency: Hourly incremental
       - Field mappings: Marketing-specific
       - Difficulty: Medium
       - Setup time: 15 minutes
    
    3. "Multi-CRM Consolidation"
       - Sync: Multiple CRMs → Castiel
       - Frequency: Daily full sync
       - Field mappings: Normalized fields
       - Difficulty: Advanced
       - Setup time: 30 minutes
    
    GUIDED SETUP WIZARD:
    
    Step 1: Select Integration
    - Choose from marketplace
    - Or enter custom integration details
    
    Step 2: Authenticate
    - OAuth flow or API key
    - Test connection
    - Validate permissions
    
    Step 3: Configure Entities
    - Select which entities to sync
    - Configure sync frequency
    - Enable webhooks (if available)
    
    Step 4: Map Fields
    - Auto-suggest mappings
    - Review and customize
    - Add custom transformations
    
    Step 5: Test & Enable
    - Run test sync (10 records)
    - Review synced data
    - Enable integration
    
    INTEGRATION SCORING:
    
    Quality Score (0-100):
    - Setup completeness: 30%
    - Sync success rate: 40%
    - Data quality: 20%
    - Performance: 10%
    
    Display to users:
    - 90-100: Excellent setup
    - 70-89: Good setup
    - 50-69: Needs attention
    - <50: Poor setup, action required
  status: pending
  phase: 12 (UI/UX enhancement)
  priority: medium
Summary of Critical Integration System Enhancements
Must-Implement (Enterprise-Grade) 🔴:

✅ Webhook support - Real-time updates, reduced API calls
✅ Incremental sync - 90%+ API call reduction
✅ Integration health monitoring - Auto-recovery, reliability
✅ Multi-tenant isolation - Security, compliance
✅ Integration testing framework - Quality assurance

Should-Implement (High Value) 🟡:

✅ Bidirectional sync with conflict resolution - Two-way data flow
✅ Adapter framework - Extensibility, maintainability
✅ Integration marketplace - Better UX, faster onboarding

Nice-to-Have (Future) 🟢:

✅ Field-level change tracking - Granular sync control
✅ Integration analytics - Usage insights, optimization

1. Multi-Modal Data Processing Pipeline (Critical Change)
yaml- id: implement-multi-modal-integration-architecture
  content: |
    Refactor integration architecture for multi-modal data processing:
    
    DATA SOURCE CATEGORIES:
    
    Category 1: STRUCTURED CRM DATA
    - Sources: Salesforce, HubSpot, Dynamics, Pipedrive
    - Data: Opportunities, Accounts, Contacts, Deals
    - Processing: Field mapping → Shard storage → Risk/Forecast
    - Flow: integration.data.raw → mapping consumer → shard.created
    
    Category 2: DOCUMENTS & FILES
    - Sources: Google Drive, SharePoint, Dropbox, OneDrive
    - Data: PDFs, Word docs, Presentations, Spreadsheets
    - Processing: Download → Text extraction → Vectorization → Entity linking
    - Flow: integration.document.detected → document processor → document.processed → vectorization
    
    Category 3: COMMUNICATION & COLLABORATION
    - Sources: Gmail, Outlook, Slack, Teams
    - Data: Emails, Messages, Threads, Reactions
    - Processing: Text extraction → Sentiment analysis → Entity extraction → Relationship mapping
    - Flow: integration.message.received → message processor → message.processed → entity linking
    
    Category 4: MEETINGS & CALLS
    - Sources: Zoom, Teams, Google Meet, Gong
    - Data: Recordings, Transcripts, Participants, Metadata
    - Processing: Transcription → Speaker diarization → Key point extraction → Action items
    - Flow: integration.meeting.completed → meeting processor → meeting.processed → action items
    
    Category 5: CALENDAR & SCHEDULING
    - Sources: Google Calendar, Outlook Calendar
    - Data: Events, Attendees, Locations, Recurrence
    - Processing: Event classification → Relationship mapping → Time tracking
    - Flow: integration.event.created → event processor → event.processed → time analytics
    
    ARCHITECTURE REFACTORING:
    
    Current: Single mapping consumer for all data types
    New: Specialized processors per data category
    
    ┌─────────────────────────────────────────────────────────┐
    │           Integration Sync Service                      │
    │  (Publishes category-specific events)                   │
    └─────────────┬───────────────────────────────────────────┘
                  │
                  ├─→ integration.data.raw (CRM)
                  ├─→ integration.document.detected (Files)
                  ├─→ integration.message.received (Comms)
                  ├─→ integration.meeting.completed (Meetings)
                  └─→ integration.event.created (Calendar)
                  │
    ┌─────────────┴───────────────────────────────────────────┐
    │                  RabbitMQ Queues                         │
    │  - integration_data_raw (CRM)                           │
    │  - integration_documents (Documents)                     │
    │  - integration_messages (Messages)                       │
    │  - integration_meetings (Meetings)                       │
    │  - integration_events (Events)                           │
    └─────────────┬───────────────────────────────────────────┘
                  │
                  ├─→ CRM Mapping Consumer
                  ├─→ Document Processing Consumer
                  ├─→ Message Processing Consumer
                  ├─→ Meeting Processing Consumer
                  └─→ Event Processing Consumer
    
    BENEFITS:
    - Independent scaling per data type
    - Specialized processing logic
    - Different retry strategies
    - Category-specific error handling
    - Easier to add new categories
  status: pending
  phase: 1 (architecture refactoring)
  priority: critical
2. Document Processing Pipeline (New Component)
yaml- id: implement-document-processing-pipeline
  content: |
    Implement specialized document processing pipeline:
    
    DOCUMENT PROCESSING FLOW:
    
    Step 1: Document Detection
    - Integration adapter detects new/updated document
    - Publish integration.document.detected event
    - Payload: { integrationId, tenantId, documentId, url, mimeType, size, metadata }
    
    Step 2: Document Download & Storage
    - Download document from integration
    - Store in Azure Blob Storage
    - Generate blob URL with SAS token
    - Virus scan (Azure Defender)
    
    Step 3: Text Extraction
    - PDF: Extract text, images, tables
    - Word/Excel: Extract text, preserve structure
    - Images: OCR (Azure Computer Vision)
    - HTML: Strip tags, extract content
    
    Step 4: Content Analysis
    - Entity extraction (LLM-based)
    - Key phrase extraction
    - Sentiment analysis
    - Topic classification
    - PII detection and redaction
    
    Step 5: Document Linking
    - Auto-attach to opportunities
    - Link to accounts, contacts
    - Create relationships
    - Update opportunity context
    
    Step 6: Vectorization
    - Generate embeddings (per chunk)
    - Store in vector database
    - Enable semantic search
    
    Step 7: Event Publishing
    - Publish document.processed event
    - Publish shard.created for document shard
    - Publish opportunity.updated if linked
    
    DOCUMENT METADATA SCHEMA:
    
    {
      id: string,
      tenantId: string,
      integrationId: string,
      externalId: string,
      documentType: "pdf" | "docx" | "xlsx" | "pptx" | "txt" | "image",
      title: string,
      url: string,
      blobUrl: string,  // Azure Blob Storage
      size: number,
      mimeType: string,
      extractedText: string,
      extractedEntities: Entity[],
      keyPhrases: string[],
      sentiment: number,
      topics: string[],
      linkedOpportunities: string[],
      linkedAccounts: string[],
      linkedContacts: string[],
      createdAt: Date,
      modifiedAt: Date,
      createdBy: string,
      modifiedBy: string,
      source: {
        integration: string,
        path: string,
        parentFolder: string
      }
    }
    
    DOCUMENT PROCESSING CONSUMER:
    
    class DocumentProcessingConsumer {
      async processDocument(event: DocumentDetectedEvent) {
        // 1. Download document
        const blob = await this.downloadDocument(event.url);
        
        // 2. Store in Blob Storage
        const blobUrl = await this.storeBlobStorage(blob);
        
        // 3. Extract text
        const text = await this.extractText(blob, event.mimeType);
        
        // 4. Analyze content
        const analysis = await this.analyzeContent(text);
        
        // 5. Link to entities
        const links = await this.linkToEntities(analysis, event.tenantId);
        
        // 6. Create document shard
        await this.createDocumentShard({
          ...event,
          blobUrl,
          extractedText: text,
          ...analysis,
          ...links
        });
        
        // 7. Vectorize
        await this.publishVectorizationEvent({
          documentId: event.documentId,
          text: text
        });
        
        // 8. Publish completion
        await this.publishDocumentProcessed(event);
      }
    }
    
    SPECIAL HANDLING:
    
    Large Documents (> 10MB):
    - Chunk into smaller pieces
    - Process chunks in parallel
    - Combine results
    
    Images in PDFs:
    - Extract images
    - Run OCR separately
    - Merge with text
    
    Spreadsheets:
    - Extract tables
    - Preserve structure
    - Process as structured data
    
    Presentations:
    - Extract slides separately
    - Preserve slide order
    - Include speaker notes
  status: pending
  phase: 2
  priority: critical
3. Communication Processing Pipeline (New Component)
yaml- id: implement-communication-processing-pipeline
  content: |
    Implement email and messaging processing pipeline:
    
    COMMUNICATION TYPES:
    
    Type 1: EMAIL (Gmail, Outlook)
    - Threads and replies
    - Attachments
    - CC/BCC participants
    - Read receipts
    
    Type 2: INSTANT MESSAGES (Slack, Teams)
    - Messages and threads
    - Reactions and mentions
    - Channel context
    - DMs vs channels
    
    Type 3: COMMENTS (Salesforce Chatter, etc.)
    - Contextual comments
    - @mentions
    - Attachments
    
    EMAIL PROCESSING FLOW:
    
    Step 1: Email Detection
    - Integration webhook receives new email
    - Publish integration.email.received event
    - Payload: { integrationId, tenantId, emailId, threadId, from, to, cc, subject, body, attachments[] }
    
    Step 2: Email Analysis
    - Extract participants
    - Detect sentiment
    - Extract action items
    - Identify key topics
    - Classify email type (intro, proposal, negotiation, etc.)
    
    Step 3: Entity Linking
    - Match email addresses to contacts
    - Link to opportunities (by subject, thread, participants)
    - Link to accounts
    - Create activity records
    
    Step 4: Relationship Mapping
    - Update communication graph
    - Track interaction frequency
    - Calculate relationship strength
    - Identify stakeholders
    
    Step 5: Attachment Processing
    - Download attachments
    - Process as documents (see document pipeline)
    - Link attachments to email
    
    Step 6: Action Item Extraction
    - Detect deadlines ("by Friday")
    - Extract tasks ("please send the proposal")
    - Identify owners ("John will follow up")
    - Create task records
    
    MESSAGE PROCESSING FLOW (Slack/Teams):
    
    Step 1: Message Detection
    - Real-time webhook or polling
    - Publish integration.message.received event
    - Include channel/thread context
    
    Step 2: Message Analysis
    - Detect @mentions (stakeholder engagement)
    - Extract reactions (sentiment)
    - Identify threads (context)
    - Classify importance
    
    Step 3: Channel Classification
    - Is it a deal-specific channel?
    - Is it a team channel?
    - Is it a DM?
    - Link to opportunities accordingly
    
    Step 4: Entity Extraction
    - Extract company names
    - Extract deal amounts
    - Extract dates and deadlines
    - Extract action items
    
    COMMUNICATION METADATA SCHEMA:
    
    {
      id: string,
      tenantId: string,
      integrationId: string,
      externalId: string,
      communicationType: "email" | "slack_message" | "teams_message" | "comment",
      threadId: string,
      parentMessageId: string,
      from: { email: string, name: string, contactId?: string },
      to: Array<{ email: string, name: string, contactId?: string }>,
      cc: Array<{ email: string, name: string, contactId?: string }>,
      subject: string,
      body: string,
      bodyPlainText: string,
      sentiment: number,
      topics: string[],
      actionItems: ActionItem[],
      attachments: Attachment[],
      linkedOpportunities: string[],
      linkedAccounts: string[],
      linkedContacts: string[],
      channel: {
        id: string,
        name: string,
        type: "dm" | "channel" | "group"
      },
      metadata: {
        hasAttachments: boolean,
        isReply: boolean,
        replyCount: number,
        reactionCount: number,
        importance: "low" | "normal" | "high"
      },
      sentAt: Date,
      receivedAt: Date
    }
    
    SPECIAL CONSIDERATIONS:
    
    Email Threading:
    - Track conversation threads
    - Link replies to original
    - Calculate thread depth
    - Identify thread participants
    
    Privacy & Compliance:
    - PII redaction
    - Sensitive content detection
    - User consent management
    - Data retention policies
    
    Spam Filtering:
    - Filter marketing emails
    - Filter automated notifications
    - Only process human conversations
    - Configurable filters
  status: pending
  phase: 2
  priority: high
4. Meeting & Call Processing Pipeline (New Component)
yaml- id: implement-meeting-call-processing-pipeline
  content: |
    Implement meeting and call recording processing:
    
    MEETING PROCESSING FLOW:
    
    Step 1: Meeting Detection
    - Integration detects completed meeting
    - Publish integration.meeting.completed event
    - Payload: { integrationId, tenantId, meetingId, title, startTime, endTime, participants[], recordingUrl?, transcriptUrl? }
    
    Step 2: Recording Download (if available)
    - Download recording from Zoom/Teams/Gong
    - Store in Azure Blob Storage
    - Generate SAS token for access
    
    Step 3: Transcription
    - If transcript available: Download
    - If not: Transcribe recording (Azure Speech)
    - Speaker diarization (identify speakers)
    - Timestamp alignment
    
    Step 4: Content Analysis
    - Extract key topics
    - Identify action items
    - Detect commitments
    - Extract objections
    - Sentiment per speaker
    - Talk time ratio
    
    Step 5: Meeting Intelligence
    - Classify meeting type (discovery, demo, negotiation, etc.)
    - Identify deal stage signals
    - Extract next steps
    - Calculate engagement score
    - Detect red flags
    
    Step 6: Participant Mapping
    - Match participants to contacts
    - Identify new stakeholders
    - Update relationship graph
    - Track interaction history
    
    Step 7: Entity Linking
    - Link to opportunities
    - Link to accounts
    - Create activity records
    - Update opportunity notes
    
    Step 8: Recommendation Generation
    - Suggest follow-up actions
    - Identify coaching opportunities
    - Flag risks detected in call
    - Recommend content to share
    
    MEETING METADATA SCHEMA:
    
    {
      id: string,
      tenantId: string,
      integrationId: string,
      externalId: string,
      meetingType: "zoom" | "teams" | "google_meet" | "gong" | "chorus",
      title: string,
      startTime: Date,
      endTime: Date,
      duration: number,  // minutes
      participants: Array<{
        email: string,
        name: string,
        contactId?: string,
        isInternal: boolean,
        talkTime: number,  // seconds
        sentiment: number
      }>,
      recording: {
        url: string,
        blobUrl: string,
        duration: number,
        size: number
      },
      transcript: {
        url: string,
        fullText: string,
        segments: Array<{
          speaker: string,
          startTime: number,
          endTime: number,
          text: string,
          sentiment: number
        }>
      },
      analysis: {
        meetingType: "discovery" | "demo" | "negotiation" | "follow_up" | "closing",
        topics: string[],
        keyMoments: Array<{
          timestamp: number,
          type: "action_item" | "objection" | "commitment" | "question",
          text: string,
          speaker: string
        }>,
        actionItems: ActionItem[],
        commitments: Commitment[],
        objections: Objection[],
        nextSteps: string[],
        sentiment: {
          overall: number,
          perSpeaker: Record<string, number>
        },
        engagement: {
          score: number,  // 0-100
          talkTimeRatio: number,  // customer/rep talk time
          questionCount: number,
          interruptionCount: number
        },
        dealSignals: {
          positive: string[],
          negative: string[],
          neutral: string[]
        }
      },
      linkedOpportunities: string[],
      linkedAccounts: string[],
      recommendations: Recommendation[]
    }
    
    GONG-SPECIFIC FEATURES:
    
    Gong provides rich analytics:
    - Pre-computed talk ratios
    - Pre-identified moments
    - Competitor mentions
    - Pricing discussions
    - Deal progression signals
    
    Leverage Gong's native analytics:
    - Import Gong scores directly
    - Use Gong topic detection
    - Sync Gong action items
    - Import Gong insights
    
    SPECIAL HANDLING:
    
    Large Recordings:
    - Process in chunks
    - Parallel transcription
    - Progressive analysis
    
    No Recording Available:
    - Process calendar event only
    - Extract participants
    - Use meeting title/notes
    - Request recording if policy allows
    
    Multi-Language Support:
    - Detect language
    - Transcribe in native language
    - Optional translation
  status: pending
  phase: 3
  priority: high
5. Unified Entity Linking Service (Critical New Service)
yaml- id: implement-unified-entity-linking-service
  content: |
    Implement centralized entity linking service for all data types:
    
    PURPOSE:
    Link documents, emails, messages, meetings to CRM entities
    (opportunities, accounts, contacts) automatically
    
    LINKING STRATEGIES:
    
    Strategy 1: Explicit Reference
    - Document/email contains opportunity ID
    - Message @mentions deal name
    - Calendar event has deal in title
    - Confidence: 100%
    
    Strategy 2: Participant Matching
    - Email to/from contact in opportunity
    - Meeting participants match stakeholders
    - Message in channel with stakeholder
    - Confidence: 80-90%
    
    Strategy 3: Content Analysis (LLM-based)
    - Extract company names from content
    - Match company to accounts
    - Extract deal amounts
    - Match to opportunity value
    - Confidence: 60-80%
    
    Strategy 4: Temporal Correlation
    - Activity near opportunity close date
    - Activity during active stage
    - Activity with same participants
    - Confidence: 40-60%
    
    Strategy 5: Vector Similarity
    - Semantic similarity to opportunity
    - Similar topics/keywords
    - Similar context
    - Confidence: 30-50%
    
    ENTITY LINKING SERVICE:
```typescript
    interface EntityLinkingService {
      async linkDocument(
        document: Document,
        tenantId: string
      ): Promise<EntityLinks>;
      
      async linkEmail(
        email: Email,
        tenantId: string
      ): Promise<EntityLinks>;
      
      async linkMeeting(
        meeting: Meeting,
        tenantId: string
      ): Promise<EntityLinks>;
      
      async linkMessage(
        message: Message,
        tenantId: string
      ): Promise<EntityLinks>;
    }
    
    interface EntityLinks {
      opportunities: Array<{
        id: string,
        confidence: number,
        reason: string,
        strategy: LinkingStrategy
      }>,
      accounts: Array<{
        id: string,
        confidence: number,
        reason: string,
        strategy: LinkingStrategy
      }>,
      contacts: Array<{
        id: string,
        confidence: number,
        reason: string,
        strategy: LinkingStrategy
      }>
    }
```
    
    LINKING WORKFLOW:
    
    1. Apply all strategies in parallel
    2. Collect candidate links from each
    3. Deduplicate and merge
    4. Sort by confidence
    5. Apply confidence threshold (> 60%)
    6. Create relationship records
    7. Update entity context
    
    AUTO-ATTACHMENT RULES:
    
    Auto-attach if:
    - Confidence > 80%
    - Only one candidate
    - Explicit reference found
    
    Suggest if:
    - Confidence 60-80%
    - Multiple candidates
    - Ambiguous reference
    
    Ignore if:
    - Confidence < 60%
    - No clear candidates
    
    USER REVIEW:
    
    For suggested links:
    - Show in UI for user review
    - User can approve/reject
    - User can select correct entity
    - Learn from user feedback
    
    RELATIONSHIP TRACKING:
    
    Create relationship records:
    - Document → Opportunity
    - Email → Opportunity
    - Meeting → Opportunity
    - Message → Opportunity
    
    Track relationship metadata:
    - Link confidence
    - Link strategy
    - Created at
    - Created by (auto vs manual)
    - Last verified
  status: pending
  phase: 2
  priority: critical
6. Revised Event Schema (Updated)
yaml- id: update-event-schemas-for-multi-modal
  content: |
    Update event schemas to support all data types:
    
    NEW EVENT TYPES:
    
    1. integration.document.detected
       - Payload: { integrationId, tenantId, documentId, url, mimeType, size, title, modifiedAt, modifiedBy }
       - Consumer: DocumentProcessingConsumer
    
    2. integration.document.processed
       - Payload: { documentId, tenantId, extractedText, entities[], topics[], linkedOpportunities[] }
       - Consumer: VectorizationConsumer, OpportunityUpdateConsumer
    
    3. integration.email.received
       - Payload: { integrationId, tenantId, emailId, threadId, from, to, subject, body, attachments[] }
       - Consumer: EmailProcessingConsumer
    
    4. integration.email.processed
       - Payload: { emailId, tenantId, sentiment, actionItems[], linkedOpportunities[], linkedContacts[] }
       - Consumer: ActivityTrackingConsumer, RelationshipConsumer
    
    5. integration.message.received
       - Payload: { integrationId, tenantId, messageId, channelId, from, text, mentions[], reactions[] }
       - Consumer: MessageProcessingConsumer
    
    6. integration.message.processed
       - Payload: { messageId, tenantId, sentiment, topics[], linkedOpportunities[] }
       - Consumer: ActivityTrackingConsumer
    
    7. integration.meeting.completed
       - Payload: { integrationId, tenantId, meetingId, title, participants[], duration, recordingUrl?, transcriptUrl? }
       - Consumer: MeetingProcessingConsumer
    
    8. integration.meeting.processed
       - Payload: { meetingId, tenantId, transcript, analysis, actionItems[], recommendations[], linkedOpportunities[] }
       - Consumer: ActivityTrackingConsumer, RecommendationConsumer
    
    9. integration.event.created (Calendar)
       - Payload: { integrationId, tenantId, eventId, title, startTime, endTime, attendees[], location }
       - Consumer: EventProcessingConsumer
    
    10. entity.linked
        - Payload: { sourceType, sourceId, targetType, targetId, confidence, strategy, tenantId }
        - Consumer: RelationshipConsumer, ContextUpdateConsumer
    
    QUEUE STRUCTURE:
    
    - integration_data_raw (CRM entities)
    - integration_documents (Documents)
    - integration_communications (Emails + Messages)
    - integration_meetings (Meetings + Calls)
    - integration_events (Calendar events)
    - entity_linking (Entity link requests)
  status: pending
  phase: 1
  priority: critical
📊 Impact on Original Plan
Major Changes Required:

✅ Split mapping consumer into specialized processors (documents, emails, meetings, etc.)
✅ Add document processing pipeline with text extraction and vectorization
✅ Add communication processing with sentiment analysis and action items
✅ Add meeting intelligence with transcription and analysis
✅ Add entity linking service for auto-attachment
✅ Update event schemas for all data types
✅ Add blob storage integration for large files
✅ Add Azure Cognitive Services for OCR, speech-to-text

Components That Stay The Same:

✅ Secret management approach
✅ RabbitMQ event-driven architecture
✅ Retry and circuit breaker patterns
✅ Idempotency and DLQ handling
✅ Monitoring and alerting
✅ Multi-tenant isolation

New Infrastructure Requirements:

✅ Azure Blob Storage for documents and recordings
✅ Azure Computer Vision for OCR
✅ Azure Speech Services for transcription
✅ Larger queues for document/media processing
✅ More consumer instances (5 types instead of 1)