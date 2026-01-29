# LLM Service – Events (Plan W5 Layer 5)

RabbitMQ only. Events include tenantId (preferred), id, type, version, timestamp, source, data per ModuleImplementationGuide §9.

## Published

### llm.reasoning.requested

**When:** At start of POST /api/v1/llm/explain, /recommendations, /scenarios, /summary, /playbook.

**Payload (data):**

- `requestId`: string (UUID)
- `reasoningType`: "explain" | "recommendations" | "scenarios" | "summary" | "playbook"
- `opportunityId`: string
- `predictionId?`: string
- `correlationId?`: string (request id)

### llm.reasoning.completed

**When:** LLM reasoning completed successfully.

**Payload (data):**

- `requestId`: string
- `output`: object (text?, recommendations?, scenarios?)
- `latency`: number (ms)
- `correlationId?`: string

### llm.reasoning.failed

**When:** LLM reasoning failed (error thrown).

**Payload (data):**

- `requestId`: string
- `error`: string
- `correlationId?`: string

## Consumed

- (None configured; optional bindings can be added for async triggers.)
