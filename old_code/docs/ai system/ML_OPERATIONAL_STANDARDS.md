# ML Operational Standards

**Date:** January 2025  
**Status:** Active Standards  
**Purpose:** Operational best practices and requirements for ML system production deployment

---

## Executive Summary

This document defines operational standards for the ML system, based on 10 critical recommendations to prevent common ML pitfalls, ensure production reliability, and maintain system quality. These standards are organized by priority: **Must-Do (High ROI)**, **Nice-to-Have**, and **Advisory**.

**Key Principle:** These standards balance operational excellence with practical implementation, recognizing that a small team needs simple maintenance while providing excellent outputs.

---

## Must-Do Standards (High ROI)

These standards are **required** for production deployments and provide the highest return on investment.

### 1. Feature Store: Versioning & Lineage ⭐

**Priority:** Must-Do (High ROI)  
**Status:** Required for Production

**Standard:**
- Explicit feature versioning with: `featureName`, `version`, `source`, `computationLogicHash`, `createdAt`
- Training pipeline **must** pin feature versions
- Inference uses latest compatible version
- Minimum viable versioning enforced in Phase 1 (simple versioning without full lineage graphs)

**Why It Matters:**
- Prevents silent training/serving skew
- Prevents "Why did model accuracy drop?" incidents
- One of the highest-ROI improvements you can make

**Implementation:**
- See: [FEATURE_ENGINEERING.md](FEATURE_ENGINEERING.md) - Feature Versioning section
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Feature Store Architecture
- See: [TRAINING_PIPELINE.md](TRAINING_PIPELINE.md) - Feature Version Pinning

---

### 2. Risk Scoring: Calibration Layer ⭐

**Priority:** Must-Do (High ROI)  
**Status:** Strongly Recommended for All Production Deployments

**Standard:**
- Post-model calibration required for all production risk scoring models
- Use Platt Scaling or Isotonic Regression
- Calibration parameters stored per model version
- Applied in ModelService as lightweight post-processing step

**Why It Matters:**
- XGBoost outputs are not naturally calibrated probabilities
- Risk scores become interpretable and statistically sound
- Aggregations make statistical sense
- Stakeholder trust increases dramatically

**Implementation:**
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Calibration Service
- See: [TRAINING_PIPELINE.md](TRAINING_PIPELINE.md) - Calibration Training
- See: [USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md](USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md) - Risk Scoring section

---

### 3. Revenue Forecasting: Separate Point Forecast & Uncertainty ⭐

**Priority:** Must-Do (High ROI)  
**Status:** Required for Production

**Standard:**
- Separate point forecast from uncertainty quantification
- **Default Approach:** Quantile loss (P10/P50/P90) - single model with quantile regression
- **Alternative:** Two-head approach (point forecast model + uncertainty model) - only if model interpretability or debugging requires separation
- Uncertainty must be explicitly tracked and communicated

**Why It Matters:**
- Cleaner monitoring (uncertainty drift ≠ mean drift)
- Better alerting
- Easier scenario generation
- Aligns with "best/base/worst case" scenarios

**Implementation:**
- See: [TRAINING_PIPELINE.md](TRAINING_PIPELINE.md) - Forecasting Model Training
- See: [USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md](USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md) - Revenue Forecasting section
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Forecasting Service

---

### 4. Model Selection: Shadow Evaluation ⭐

**Priority:** Must-Do (High ROI)  
**Status:** Strongly Recommended Best Practice

**Standard:**
- Always run global model in background (shadow mode) when using industry-specific models
- Shadow evaluation must be **async and non-blocking** to avoid latency impact
- Log both predictions (primary + shadow) for offline comparison
- Compare metrics offline to validate industry model benefit

**Why It Matters:**
- Safe industry rollout
- Easy rollback capability
- Continuous validation of industry model benefit
- Cost impact is minimal (async, non-blocking)

**Implementation:**
- See: [MODEL_REGISTRY.md](MODEL_REGISTRY.md) - Shadow Evaluation
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Model Selection with Shadow Mode
- See: [CONTINUOUS_LEARNING.md](CONTINUOUS_LEARNING.md) - Shadow Evaluation Tracking

---

### 5. Drift Detection: Explicit Categories ⭐

**Priority:** Must-Do (High ROI)  
**Status:** Required for Production

**Standard:**
- Track **three distinct drift types** separately:
  1. **Feature Distribution Drift:** Changes in feature distributions over time
  2. **Prediction Distribution Drift:** Changes in model output distributions
  3. **Outcome Drift:** Changes in actual outcomes vs. predictions (when labels arrive)
- Each drift type has:
  - Separate thresholds
  - Separate alerts
  - Separate implementation methods

**Why It Matters:**
- Avoids false retraining triggers
- Catches silent failures
- Prevents missing critical degradation signals

**Implementation:**
- See: [CONTINUOUS_LEARNING.md](CONTINUOUS_LEARNING.md) - Drift Detection section
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Evaluation Service
- See: [ML_SYSTEM_OVERVIEW.md](ML_SYSTEM_OVERVIEW.md) - Monitoring section

---

### 6. Monitoring: Business-Level ML Metrics ⭐

**Priority:** Must-Do (High ROI)  
**Status:** Required for Production Promotion

**Standard:**
- Define "ML Success KPIs" for each use case:
  - **Risk Scoring:** Calibration Error, Brier Score
  - **Forecasting:** Bias over 30/60/90 days
  - **Recommendations:** Incremental CTR vs non-ML baseline
- Business metrics are **required for promotion to production**
- Business metrics tracked alongside technical metrics in Application Insights

**Why It Matters:**
- Political protection (proves ML value to stakeholders)
- Technical protection (catches business-level issues)
- Ties metrics to governance, not just observability

**Implementation:**
- See: [ML_SYSTEM_OVERVIEW.md](ML_SYSTEM_OVERVIEW.md) - Success Criteria
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Monitoring section
- See: [CONTINUOUS_LEARNING.md](CONTINUOUS_LEARNING.md) - Business Metrics Tracking

---

## Nice-to-Have Standards (Best Practices)

These standards are recommended for operational optimization but not mandatory for initial production deployment.

### 7. Inference: Async Mode for Heavy Calls

**Priority:** Nice-to-Have  
**Status:** Phase 2 Enhancement

**Standard:**
- Support two inference modes:
  - **Sync:** UI, user-facing (<500ms target)
  - **Async:** Batch, dashboards, reports (queue-based)
- Async mode is **required for batch forecasts and dashboards**
- Async flow: Queue → Azure ML endpoint → store result → UI polls/loads later

**Why It Matters:**
- Prevents UI blocking
- Reduces latency pressure on models
- Enables batch processing for dashboards

**Implementation:**
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Async Inference
- See: [API_REFERENCE.md](API_REFERENCE.md) - Async Endpoints
- See: [IMPLEMENTATION_STATUS_AND_PLAN.md](IMPLEMENTATION_STATUS_AND_PLAN.md) - Phase 2

---

### 8. Cost Control: Explicit Idle Strategy

**Priority:** Nice-to-Have  
**Status:** Operational Optimization

**Standard:**
- **Mandatory Defaults (Phase 1):**
  - Min replicas = 0 (where possible) - scale to zero when idle
  - Autoscale configuration - scale based on traffic
- **Optional Optimizations (Phase 2):**
  - Scale-down cooldowns - prevent rapid scaling
  - Night/weekend schedules (if usage allows) - reduce capacity during low usage
  - ROI-based retraining frequency - tie retraining to business value
- Log cost per model version
- Monitor cost vs. performance trade-offs

**Why It Matters:**
- Managed endpoints can silently cost money
- Prevents unnecessary costs during idle periods
- Enables cost-aware model management
- Keeps Phase 1 lean while providing optimization paths

**Implementation:**
- See: [ARCHITECTURE.md](ARCHITECTURE.md) - Cost Control section
- See: [DEPLOYMENT.md](DEPLOYMENT.md) - Cost-Aware Deployment

**Cost Monitoring:**
- Track cost per model version in Application Insights
- Alert on unexpected cost increases
- Review cost vs. performance monthly

---

## Advisory Standards (Warnings)

These standards provide guidance on what to avoid or delay.

### 9. Recommendations: Start Simpler Than NCF

**Priority:** Advisory  
**Status:** Phase 1 Simplification

**Standard:**
- **Phase 1:** Use XGBoost Ranker only
  - Features: user×item interactions, recency, popularity, context signals
  - Faster to iterate, easier to debug, cheaper to train
- **Phase 2:** Add Neural Collaborative Filtering (NCF) only if CTR plateaus
  - NCF increases: infra complexity, data requirements, monitoring difficulty

**Why It Matters:**
- Prevents premature deep learning
- Matches small-team principle
- Keeps NCF visible but clearly marked as Phase 2

**Implementation:**
- See: [TRAINING_PIPELINE.md](TRAINING_PIPELINE.md) - Recommendations Model
- See: [USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md](USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md) - Recommendations section

---

### 10. LLM Fine-Tuning: Be Careful

**Priority:** Advisory  
**Status:** Phase 4 (Deferred)

**Standard:**
- **Delay fine-tuning** unless all of the following are true:
  - Prompt + RAG + rules are insufficient
  - You have high-quality labeled data
  - Current hybrid approach (Rule-based + LLM + ML) is insufficient
- Fine-tuning often adds cost with marginal gains
- Current hybrid approach (Rule-based + LLM + ML) is already very strong

**Why It Matters:**
- Prevents unnecessary complexity and cost
- Focuses effort on higher-ROI improvements
- Fine-tuning should be last resort, not first approach

**Implementation:**
- See: [TRAINING_PIPELINE.md](TRAINING_PIPELINE.md) - LLM Fine-Tuning (Phase 4)
- See: [IMPLEMENTATION_STATUS_AND_PLAN.md](IMPLEMENTATION_STATUS_AND_PLAN.md) - Phase 4
- See: [ML_SYSTEM_OVERVIEW.md](ML_SYSTEM_OVERVIEW.md) - LLM Integration

---

## Implementation Checklist

### Phase 1: Must-Do Standards (Weeks 1-8)

- [ ] Feature versioning & lineage (minimum viable for Phase 1)
- [ ] Risk score calibration (all production deployments)
- [ ] Forecast uncertainty separation (quantile loss default)
- [ ] Shadow evaluation (async, non-blocking)
- [ ] Explicit drift categories (three distinct types)
- [ ] Business-level ML metrics (required for production promotion)

### Phase 2: Nice-to-Have Standards (Weeks 9-16)

- [ ] Async inference mode (batch forecasts, dashboards)
- [ ] Cost control optimizations (schedules, ROI-based retraining)

### Phase 3: Advisory Standards

- [ ] Recommendations: XGBoost Ranker only (Phase 1)
- [ ] LLM fine-tuning: Move to Phase 4, add strong warnings

---

## Standards Governance

### Review Process

- Standards are reviewed quarterly
- New standards require team approval
- Standards can be updated based on operational learnings

### Compliance

- Must-Do standards are **required** for production deployments
- Nice-to-Have standards are **recommended** for operational excellence
- Advisory standards provide **guidance** on best practices

### Documentation

- All standards are documented in detail in referenced documents
- This document serves as the executive summary and quick reference
- Detailed implementation guides are in respective architecture and training documents

---

## Related Documentation

- [ML_SYSTEM_OVERVIEW.md](ML_SYSTEM_OVERVIEW.md) - High-level system overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and components
- [FEATURE_ENGINEERING.md](FEATURE_ENGINEERING.md) - Feature versioning details
- [TRAINING_PIPELINE.md](TRAINING_PIPELINE.md) - Training procedures
- [CONTINUOUS_LEARNING.md](CONTINUOUS_LEARNING.md) - Drift detection and monitoring
- [MODEL_REGISTRY.md](MODEL_REGISTRY.md) - Model management and shadow evaluation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures and cost control
- [USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md](USE_CASES_BEST_PRACTICES_AND_RECOMMENDATIONS.md) - Use case specific guidance

---

**Document Status:** Active Standards  
**Last Updated:** January 2025  
**Next Review:** April 2025
