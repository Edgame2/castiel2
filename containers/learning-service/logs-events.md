# Learning Service – Events (Plan W6 Layer 7)

## Published events

| Event | Description | Payload (data) |
|-------|-------------|----------------|
| `feedback.recorded` | User feedback was recorded | feedbackId, modelId, feedbackType, predictionId? |
| `outcome.recorded` | Outcome was recorded | outcomeId, modelId, outcomeType, success, predictionId? |
| `feedback.trend.alert` | Satisfaction below threshold for model | modelId, message, period { from, to } |

All events include: id, type, version, timestamp, tenantId, source (`learning-service`), data.

## Consumed events

None. APIs are the primary interface; optional consumers (e.g. Data Lake, analytics) can subscribe to the above.
