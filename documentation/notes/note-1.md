1. ML service – CAIS integration (like risk-analytics/forecasting)
Reference:
containers/risk-analytics/src/services/RiskEvaluationService.ts (lines 126–173, 255–256, 289–291, 406–421)
containers/forecasting/src/services/ForecastingService.ts (getLearnedWeights, getModelSelection, record-prediction)
Current state:
PredictionService already has adaptiveLearningClient, and calls record-prediction after predict() and exposes recordOutcome().
It does not call getLearnedWeights or getModelSelection before prediction.
Steps:
Add config
Ensure config/default.yaml has services.adaptive_learning.url (it already does).
Add getLearnedWeights(tenantId, component) in PredictionService (or a small CAIS helper):
Call GET /api/v1/adaptive-learning/weights/${tenantId}?component=<component> with the same ServiceClient + JWT + X-Tenant-ID pattern as risk-analytics.
Use a component name like 'ml-prediction' or per-context (e.g. 'risk-scoring', 'forecasting').
Return a typed object (e.g. LearnedWeights) and use a default object (e.g. default weights) on failure, like risk-analytics.
Add getModelSelection(tenantId, context) in PredictionService:
Call GET /api/v1/adaptive-learning/model-selection/${tenantId}?context=<context> (same auth/headers).
Return e.g. { modelId, confidence } with a fallback when the call fails.
Use model selection in prediction flows
In predictRiskScore: before calling Azure ML or heuristic, call getModelSelection(tenantId, 'risk-scoring') and use modelId to choose endpoint or heuristic (mirror risk-analytics’ performMLRiskScoring).
In predictForecast: call getModelSelection(tenantId, 'forecasting') and use it to choose which model/endpoint to call when you have multiple options.
Use getLearnedWeights only if ml-service starts combining several sub-models (e.g. blending multiple scores); otherwise this step can be “add the method and use defaults until you have a use case.”
Outcome recording
Keep calling record-prediction after each prediction (already there).
Ensure recordOutcome is invoked when ground truth is available (e.g. opportunity closed/won) so CAIS can learn; document or add the call sites (e.g. from risk-analytics or from an outcome-sync job).
Tests
Unit tests: mock adaptiveLearningClient and assert getWeights/getModelSelection are called with the right tenantId/component/context and that fallbacks are used on client errors.
Note: If adaptive-learning does not yet expose GET weights and GET model-selection in code, add those routes (and any backing services) in adaptive-learning first, matching the README and the way risk-analytics/forecasting call them.
2. ML service – Placeholder predictions vs real model calls
Current state:
The generic predict() method (single entry that takes CreatePredictionInput) still uses generatePlaceholderPrediction() and does not call Azure ML.
Specialized methods (predictWinProbability, predictRiskScore, predictAnomaly, predictRevenueForecastPeriod, predictLstmTrajectory, etc.) already use Azure ML when endpoints are configured and fall back to heuristics or errors.
Option A – Prefer real model path (recommended for production):
Route generic predict() by model type
In predict(), after resolving the model (e.g. via modelService.getById), check model.type (and optionally tenant/config).
If there is a mapped Azure ML endpoint for that type (e.g. risk-scoring, win-probability, forecasting, anomaly), call the same logic as the existing specialized methods (e.g. build features via featureService.buildVectorForOpportunity where applicable, then call azureMlClient.predict(...)).
Reuse the same caching/invalidation and CAIS record-prediction/recordOutcome as in the specialized methods.
Only call generatePlaceholderPrediction() when there is no deployed endpoint and no heuristic (e.g. unknown model type or explicitly “demo” mode).
Align with existing specialized methods
Ensure the generic path uses the same feature-building and normalization as predictRiskScore / predictWinProbability / etc. so behavior is consistent.
Document
In code and in VERIFICATION_RESULTS (or your production-readiness doc): which model types use Azure ML, which use heuristics, and which still use placeholders (if any).
Option B – Document MVP = placeholders:
Document
In README and/or VERIFICATION_RESULTS: “Generic predict() is MVP placeholder only; production predictions must use the specialized endpoints (risk-scoring, win-probability, forecast, anomaly, etc.) which already use Azure ML when configured.”
Add a short comment in predict(): e.g. “Placeholder when no Azure ML endpoint is used; for production use POST /risk-scoring, /win-probability, etc.”
Plan
In a backlog item: “Replace generic predict() with routing to Azure ML by model type (see Option A).”
3. Embedding templates – Wire EmbeddingService to template system
Current state:
data-enrichment has a full template system: EmbeddingTemplateService + ShardEmbeddingService (templates, field weights, preprocessing, normalization, model choice).
embeddings container’s EmbeddingService is a separate service: it stores code/document embeddings (e.g. projectId, filePath, content, vector) and has no reference to templates.
Interpretation of “EmbeddingService does not use template system”:
Either the embeddings container should use templates when producing embeddings for shard-like entities, or another service that produces “embeddings” (e.g. data-enrichment or ml-service feature vectors) should use templates. VERIFICATION_RESULTS calls out “EmbeddingService,” which in-repo is the one in embeddings.
Steps (if production flows need template-driven embeddings in the embeddings container):
Decide where templates live
Option A: Reuse data-enrichment’s EmbeddingTemplateService (or a shared lib): templates define fields, weights, preprocessing, normalization.
Option B: Call template-service (e.g. integration-manager’s TemplateService) if templates are stored there and you only need variable substitution.
For shard-style embeddings (which fields, how to combine), Option A / data-enrichment-style templates are the right fit.
Add a template-aware entrypoint in embeddings
Add an API (or extend an existing one) that accepts a template id (or type) + entity payload (e.g. shard or document).
Resolve the template (from config, from template-service, or from an in-embeddings copy of EmbeddingTemplateService).
Use the template to: select fields, apply weights, run preprocessing (chunking, normalization) to get the text to embed.
Call your existing embedding model to get the vector, then store via existing EmbeddingService.storeEmbedding() (or equivalent) and return the result.
Keep backward compatibility
Existing “store raw content + vector” APIs stay as-is; the new behavior is additive (e.g. “generate embedding from shard using template X”).
If production does not need it
Document: “Embedding templates are implemented in data-enrichment (ShardEmbeddingService + EmbeddingTemplateService). The embeddings container is for code/document embeddings without template-based field selection; no change required for current production flows.”
Steps (if “embedding templates” means data-enrichment only):
No change in the embeddings container.
Ensure ml-service (e.g. FeatureService.buildVectorForOpportunity) and any other consumers that need “template-based” shard embeddings call data-enrichment (or the service that hosts ShardEmbeddingService) for those embeddings, and document that in VERIFICATION_RESULTS.
Summary
Area	Next steps
CAIS in ml-service	Add getLearnedWeights + getModelSelection; use getModelSelection in predictRiskScore/predictForecast; keep record-prediction/recordOutcome; add tests and, if missing, the adaptive-learning GET routes.
Placeholder predictions	Either route generic predict() by model type to Azure ML (Option A) or document MVP placeholders and use only specialized endpoints in production (Option B).
Embedding templates	If production needs template-based embeddings in the embeddings container: add a template-aware API that uses EmbeddingTemplateService (or template-service) to build text then embed and store. Otherwise, document that data-enrichment owns template-based shard embeddings and no change is required in EmbeddingService.
