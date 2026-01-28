# Integration Data Flow Plan - Final Questions

## Questions Remaining After All Answers Reviewed

After reviewing all answer files (`INTEGRATION_QUESTIONS_ANSWERS_PART1.md`, `INTEGRATION_QUESTIONS_ANSWERS_PART2.md`, `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md`), the following questions remain to finalize the implementation plan:

---

## Question 1: Processor Container Location

**Question**: Where should the integration processors (CRMDataMappingConsumer, DocumentProcessorConsumer, etc.) be located?

**Context**: 
- The plan mentions `containers/integration-processors` as a new container
- The existing codebase has `containers/integration-sync` which currently handles sync logic
- The answers specify a single container image with `CONSUMER_TYPE` environment variable

**Options:**
- **A)** Add all processors to existing `containers/integration-sync` container
  - Pros: Keeps all integration logic together, simpler structure
  - Cons: Larger container, mixes sync and processing concerns
- **B)** Create new `containers/integration-processors` container (separate from integration-sync)
  - Pros: Clear separation of concerns, independent scaling
  - Cons: More containers to manage
- **C)** Split: CRM processors in `integration-sync`, multi-modal processors in new `integration-processors`
  - Pros: Logical grouping, CRM stays with sync
  - Cons: More complex, two containers to manage

**Recommendation Needed**: Which option should we use?

---

## Question 2: Service Structure for Processors Container

**Question**: If creating a new `integration-processors` container, what should its structure be?

**Context**: 
- The container will run RabbitMQ consumers (no HTTP routes needed for processing)
- But may need health checks, metrics endpoints

**Options:**
- **A)** Consumer-only service (no HTTP server, just RabbitMQ consumers)
  - Pros: Simpler, lighter weight
  - Cons: No health check endpoint, harder to monitor
- **B)** Minimal HTTP server (health checks, metrics only, no business routes)
  - Pros: Standard health check pattern, Prometheus metrics endpoint
  - Cons: Slightly more complex
- **C)** Full service structure (HTTP server + consumers, like other containers)
  - Pros: Consistent with other containers, can add API routes later
  - Cons: More overhead if not needed

**Recommendation Needed**: Should processors container have HTTP server for health/metrics, or be consumer-only?

---

## Question 3: Docker Compose Configuration

**Question**: How should the `CONSUMER_TYPE` deployment be configured in Docker Compose?

**Context**: 
- Single container image with `CONSUMER_TYPE` environment variable
- Need separate service definitions for light and heavy processors

**Options:**
- **A)** Two separate services in docker-compose.yml:
  ```yaml
  integration-processors-light:
    build: ./containers/integration-processors
    environment:
      CONSUMER_TYPE: light
    resources:
      cpus: 0.5
      memory: 1G
  
  integration-processors-heavy:
    build: ./containers/integration-processors
    environment:
      CONSUMER_TYPE: heavy
    resources:
      cpus: 2
      memory: 4G
  ```
- **B)** Single service with environment variable override:
  ```yaml
  integration-processors:
    build: ./containers/integration-processors
    environment:
      CONSUMER_TYPE: ${CONSUMER_TYPE:-all}
  ```
  (Run multiple instances with different env vars)
- **C)** Use docker-compose profiles:
  ```yaml
  integration-processors-light:
    profiles: ["light"]
    ...
  integration-processors-heavy:
    profiles: ["heavy"]
    ...
  ```

**Recommendation Needed**: Which Docker Compose pattern should we use?

---

## Question 4: Periodic ML Field Recalculation

**Question**: How should the periodic ML field recalculation (every 24 hours) be implemented?

**Context**: 
- Answers mention "periodic recalculation every 24 hours for active opportunities"
- Need to trigger `ml_field_aggregation.recalculate` events

**Options:**
- **A)** Scheduled batch job in `workflow-orchestrator` (using node-cron)
  - Publishes `workflow.job.trigger` event with job type `ml-field-recalculation`
  - BatchJobWorker in integration-sync consumes and publishes `ml_field_aggregation.recalculate` events
  - Pros: Consistent with existing batch job pattern
- **B)** Cron job directly in `integration-sync` or `integration-processors`
  - Directly queries active opportunities and publishes `ml_field_aggregation.recalculate` events
  - Pros: Simpler, no workflow-orchestrator dependency
- **C)** Separate background worker service
  - Dedicated service for periodic jobs
  - Pros: Isolated, can scale independently
  - Cons: Another service to manage

**Recommendation Needed**: Which approach should we use for periodic recalculation?

---

## Question 5: Suggested Links API Location

**Question**: Where should the suggested links API endpoints be located?

**Context**: 
- Need endpoints: `GET /api/v1/suggested-links`, `POST /api/v1/suggested-links/:id/approve`, `POST /api/v1/suggested-links/:id/reject`
- Entity linking logic is in `packages/shared/src/services/EntityLinkingService.ts`

**Options:**
- **A)** Add routes to `integration-sync` container
  - Pros: Entity linking is part of integration flow
  - Cons: Mixes sync and API concerns
- **B)** Add routes to new `integration-processors` container
  - Pros: Processors handle entity linking, makes sense
  - Cons: Processors container becomes more complex
- **C)** Add routes to `api-gateway` (proxies to appropriate service)
  - Pros: Centralized API, gateway handles routing
  - Cons: Gateway shouldn't have business logic
- **D)** Create separate `entity-linking` service
  - Pros: Clear separation, dedicated service
  - Cons: Overkill for current scale

**Recommendation Needed**: Where should suggested links API live?

---

## Question 6: Integration Processors Container Creation

**Question**: Should we create a new `integration-processors` container, or add processors to existing `integration-sync`?

**Context**: 
- Current structure: `containers/integration-sync` handles sync tasks
- Plan mentions: `containers/integration-processors` for all processors
- Need clarity on container structure

**If new container (`integration-processors`):**
- Should it be created from scratch or based on existing container template?
- Should it share code with `integration-sync` (via `@coder/shared`)?
- Should it have its own package.json, Dockerfile, config, etc.?

**If adding to `integration-sync`:**
- Should processors be in `src/events/consumers/` alongside existing consumers?
- Should we rename `integration-sync` to something more generic?

**Recommendation Needed**: Container structure decision.

---

## Question 7: Entity Linking Consumer Location

**Question**: Where should `EntityLinkingConsumer` (for deep linking) be located?

**Context**: 
- EntityLinkingService is in `packages/shared` (shared library)
- EntityLinkingConsumer listens to `shard.created` events for Document, Email, Message, Meeting

**Options:**
- **A)** In `integration-sync` or `integration-processors` container
  - Pros: Close to other processors
- **B)** In `data-enrichment` container (since it also processes shard events)
  - Pros: Groups all shard event consumers together
- **C)** Separate consumer in same container as processors
  - Pros: Clear separation

**Recommendation Needed**: Where should EntityLinkingConsumer live?

---

## Question 8: ML Field Aggregation Consumer Location

**Question**: Where should `MLFieldAggregationConsumer` be located?

**Context**: 
- Consumes `shard.created` events (filter: Opportunity)
- Calculates relationship counts
- Updates opportunity shards

**Options:**
- **A)** In `integration-sync` or `integration-processors` container
  - Pros: Part of integration data flow
- **B)** In `risk-analytics` container (since it's used for risk scoring)
  - Pros: Close to where ML fields are used
- **C)** In `data-enrichment` container (processes shard events)
  - Pros: Groups shard event consumers

**Recommendation Needed**: Where should MLFieldAggregationConsumer live?

---

## Question 9: Startup Order and Dependencies

**Question**: What is the startup order and dependency chain for processors?

**Context**: 
- Processors depend on: RabbitMQ, shard-manager, integration-manager, EntityLinkingService
- Shard types must be created before processors start
- Need to ensure all dependencies are available

**Clarification Needed**:
- Should `ensureShardTypes()` run before consumers start?
- Should processors wait for RabbitMQ to be ready?
- Should processors wait for shard-manager to be ready?
- What happens if dependencies aren't ready (retry, fail fast, etc.)?

---

## Question 10: Error Handling for Missing Shard Types

**Question**: What should happen if a shard type doesn't exist when a processor tries to create a shard?

**Context**: 
- `ensureShardTypes()` runs on startup, but what if it fails?
- What if a shard type is deleted after startup?
- What if a processor tries to create a shard with a non-existent shard type?

**Options:**
- **A)** Fail fast: Throw error, send message to DLQ
- **B)** Retry: Retry shard type creation, then retry shard creation
- **C)** Graceful degradation: Log error, skip shard creation, continue processing

**Recommendation Needed**: Error handling strategy for missing shard types.

---

## Priority

**High Priority** (affect implementation structure):
- Question 1: Processor container location
- Question 6: Integration processors container creation
- Question 2: Service structure

**Medium Priority** (affect implementation details):
- Question 3: Docker Compose configuration
- Question 4: Periodic ML field recalculation
- Question 5: Suggested links API location
- Question 7: Entity linking consumer location
- Question 8: ML field aggregation consumer location

**Low Priority** (affect error handling/edge cases):
- Question 9: Startup order
- Question 10: Error handling for missing shard types

---

## Notes

- All architectural decisions from previous answer files are incorporated
- These questions focus on implementation structure and deployment
- Once answered, the plan will be complete and ready for implementation
