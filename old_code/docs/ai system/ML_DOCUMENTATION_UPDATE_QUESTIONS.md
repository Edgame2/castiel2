# ML Documentation Update - Questions for Review

**Date:** January 2025  
**Purpose:** Questions to clarify implementation details for the 10 recommended documentation updates

---

## Overview

This document contains questions to clarify how to implement the 10 recommended improvements to the ML documentation. Your answers will guide how we document each recommendation.

---

## Questions by Recommendation

### 1. Feature Store: Add Versioning & Lineage

**Recommendation:** Add explicit feature versioning with:
- Feature name, version, source, computation logic hash
- Training pipeline pins feature version
- Inference uses latest compatible version

**Question:** How detailed should the implementation be?

**Options:**
- **Detailed implementation** - Code examples, schema, and enforcement logic
- **Conceptual overview** - Key principles and architecture
- **Both** - Conceptual in overview, detailed in FEATURE_ENGINEERING.md

**Recommendation:** Both (conceptual overview + detailed implementation)

**Additional Question:** What is the minimum viable versioning we enforce in Phase 1?

**Note:** This prevents over-engineering (e.g., full Feast-like lineage graphs). Phase 1 should focus on simple versioning without full lineage graphs.

---

### 2. Risk Scoring: Add Calibration Layer

**Recommendation:** Add post-model calibration (Platt Scaling or Isotonic Regression) for XGBoost outputs to make risk scores interpretable and statistically sound.

**Question:** Should calibration be required, optional, or strongly recommended?

**Options:**
- **Required component** - Always applied (mandatory)
- **Optional enhancement** - Can be added later
- **Strongly recommended** - Not mandatory but highly recommended

**Recommendation:** Strongly recommended for all production deployments (with clear explanation of why it matters)

**Note:** This signals that calibration is not optional once exposed to users, while still allowing early experiments without blocking.

---

### 3. Revenue Forecasting: Separate Point Forecast & Uncertainty

**Recommendation:** Use two-head approach or quantile regression to separate point forecast from uncertainty.

**Question:** Which approach do you prefer?

**Options:**
- **Two separate models** - Model A for point forecast, Model B for uncertainty
- **Quantile loss** - Single model with quantile loss (P10/P50/P90)
- **Both** - Document both approaches, recommend quantile loss for simplicity

**Recommendation:** Both (document both, recommend quantile loss for Phase 1)

**Clarification:** Quantile loss is the default unless model interpretability or debugging requires separation. This gives engineers a clear tie-breaker.

---

### 4. Recommendations: Start Simpler Than NCF

**Recommendation:** Use XGBoost Ranker only for Phase 1, add Neural Collaborative Filtering (NCF) later only if needed.

**Question:** How should we document this?

**Options:**
- **XGBoost only** - Document XGBoost Ranker only for Phase 1, mention NCF as future
- **Both phased** - Document both but clearly phase them (XGBoost first, NCF later)
- **Keep current** - Keep current approach but add note about starting simpler

**Recommendation:** Both phased (clear phase separation)

---

### 5. Model Selection Logic: Add Shadow Evaluation

**Recommendation:** Always run global model in background (shadow mode) when using industry model, log both predictions, compare offline.

**Question:** Should shadow evaluation be required, recommended, or optional?

**Options:**
- **Required** - Required for all industry model deployments
- **Strongly recommended** - Strongly recommended best practice
- **Optional** - Optional enhancement

**Recommendation:** Strongly recommended (with clear benefits explanation)

**Important Note:** Shadow evaluation can be async and non-blocking to avoid latency impact. This prevents pushback from backend engineers later.

---

### 6. Drift Detection: Split Data Drift vs Prediction Drift

**Recommendation:** Track three distinct drifts separately:
- Feature distribution drift
- Prediction distribution drift
- Outcome drift (when labels arrive)

**Question:** How detailed should the documentation be?

**Options:**
- **Detailed** - Add detailed section with implementation for all three drift types
- **Conceptual** - Add conceptual overview with key principles
- **Update existing** - Update existing drift detection mentions to be more explicit

**Recommendation:** Detailed (implementation details for all three types)

---

### 7. Monitoring: Add Business-Level Metrics

**Recommendation:** Define "ML Success KPIs":
- Risk: Calibration Error, Brier Score
- Forecast: Bias over 30/60/90 days
- Recommendations: Incremental CTR vs non-ML baseline

**Question:** Where should these be documented?

**Options:**
- **Monitoring section** - Add to ARCHITECTURE.md monitoring section
- **Success criteria** - Add to ML_SYSTEM_OVERVIEW.md success criteria
- **Both** - Both locations (overview in SYSTEM_OVERVIEW, details in ARCHITECTURE)

**Recommendation:** Both (comprehensive coverage)

---

### 8. Latency Target: Add Async Mode for Heavy Calls

**Recommendation:** Support two inference modes:
- Sync (UI, user-facing) - <500ms target
- Async (batch, dashboards, reports) - Queue-based

**Question:** Should async mode be required, Phase 2, or optional?

**Options:**
- **Required** - Required feature from the start
- **Phase 2** - Phase 2 enhancement (after initial implementation)
- **Optional** - Optional feature, document as best practice

**Recommendation:** Phase 2 (after initial sync implementation works)

**Note:** Async mode is required for batch forecasts and dashboards. This can be added as a clarification.

---

### 9. Cost Control: Explicit Idle Strategy

**Recommendation:** Define per-model:
- Min replicas = 0 (where possible)
- Scale-down cooldowns
- Night/weekend schedules (if usage allows)
- Log cost per model version
- Tie retraining frequency to ROI

**Question:** How detailed should the documentation be?

**Options:**
- **Detailed** - Detailed cost optimization strategies with specific configurations
- **Guidelines** - High-level guidelines and best practices
- **Both** - Guidelines in overview, detailed strategies in ARCHITECTURE.md

**Recommendation:** Both (practical cost control guidance)

**Refinement:** Split cost control into:
- **Mandatory Defaults (Phase 1):** Min replicas = 0 (where possible), autoscale configuration
- **Optional Optimizations (Phase 2):** Scale-down cooldowns, night/weekend schedules (if usage allows), ROI-based retraining frequency

This keeps Phase 1 lean while providing clear optimization paths.

---

### 10. LLM Fine-Tuning: Be Careful

**Recommendation:** Delay fine-tuning unless:
- Prompt + RAG + rules are insufficient
- You have high-quality labeled data
- Current hybrid approach (Rule-based + LLM + ML) is insufficient

**Question:** How should we handle LLM fine-tuning in documentation?

**Options:**
- **De-emphasize** - De-emphasize it, move to Phase 4 or later
- **Add warnings** - Keep it but add strong warnings about when to use it
- **Remove** - Remove from priority phases, keep as future enhancement only

**Recommendation:** De-emphasize + Add warnings (move to Phase 4, add clear criteria)

---

## Additional Questions

### Implementation Priority

**Question:** Should all 10 recommendations be implemented in documentation, or prioritize some?

**Considerations:**
- Must-Do (High ROI): 1, 2, 3, 5, 6, 7
- Nice-to-Have: 8, 9
- Advisory: 10

**Recommendation:** Document all, but clearly mark priority levels

---

### Documentation Structure

**Question:** Should we create a new document for these recommendations, or integrate into existing docs?

**Options:**
- **New document** - Create "ML_BEST_PRACTICES.md" or "ML_OPERATIONAL_STANDARDS.md"
- **Integrate** - Integrate into existing ARCHITECTURE.md, FEATURE_ENGINEERING.md, etc.
- **Both** - New summary document + integrate details into existing docs

**Recommendation:** Both (summary document + integration)

**Document Name:** Use "ML_OPERATIONAL_STANDARDS.md" - it sounds more authoritative and less optional than "best practices".

---

### Code Examples

**Question:** How detailed should code examples be?

**Options:**
- **Full implementation** - Complete code examples with error handling
- **Pseudo-code** - High-level pseudo-code showing logic
- **Both** - Pseudo-code in overview, full implementation in detailed sections

**Recommendation:** Both (practical examples)

---

## Summary of Recommendations

### Must-Do (High ROI) - Document as Required

1. ✅ **Feature Versioning & Lineage** - Prevent training/serving skew
2. ✅ **Risk Score Calibration** - Make scores interpretable
3. ✅ **Forecast Uncertainty Separation** - Cleaner monitoring
4. ✅ **Shadow Evaluation** - Safe industry rollout
5. ✅ **Explicit Drift Categories** - Better retraining triggers
6. ✅ **Business-Level ML KPIs** - Political and technical protection

### Nice-to-Have - Document as Best Practices

7. ⚠️ **Async Inference Mode** - Phase 2 enhancement
8. ⚠️ **Cost-Aware Endpoint Scheduling** - Operational optimization

### Advisory - Document with Warnings

9. ⚠️ **Delay NCF** - Start simpler, add complexity only if needed
10. ⚠️ **LLM Fine-Tuning Caution** - Move to Phase 4, add clear criteria

---

## Next Steps

1. **Review Questions** - Answer the questions above
2. **Prioritize** - Confirm which recommendations are must-do vs. nice-to-have
3. **Documentation Plan** - Create plan for updating documentation
4. **Implementation** - Update documentation based on answers

---

**Document Status:** Questions for Review  
**Last Updated:** January 2025
