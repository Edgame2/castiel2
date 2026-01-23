# Remaining Questions for ML Implementation

**Date:** 2025-01-28  
**Status:** Non-Blocking Questions Only ✅

---

## Summary

All **critical decisions** have been made. The following questions are **non-blocking** and can be addressed during implementation.

---

## Non-Blocking Questions

### Q1: Team Azure ML Knowledge

**Question**: Does the team need training on Azure ML?

**Options**:
- [ x] Yes, Azure ML basics
- [ ] Yes, ML model operations
- [ ] No, team is already familiar

**Impact**: Low  
**Status**: Non-blocking - Can be handled during Phase 1 setup  
**Recommendation**: Assess during Week 1-2 foundation setup

---

### Q2: Opportunity Schema Field Implementation

**Question**: Should new opportunity fields be computed on-demand, stored in `structuredData`, or hybrid?

**Options**:
- [ ] Computed on-demand (during feature extraction)
- [ ] Stored in `structuredData` (persisted)
- [x] **Hybrid (computed + cached)** - **RECOMMENDED**

**Recommendation**: Hybrid approach
- **Phase 1**: Compute on-demand + Redis cache (fastest to implement)
- **Phase 2**: Evaluate which fields to persist based on usage patterns
- **Fields to Consider Persisting**: 
  - `daysInStage` (frequently used, expensive to compute)
  - `daysSinceLastActivity` (frequently used, expensive to compute)
  - `dealVelocity` (frequently used, expensive to compute)

**Impact**: Medium (affects feature extraction performance)  
**Status**: Non-blocking - Recommendation provided, can be refined during implementation

**Implementation Strategy**:
1. Start with on-demand computation + Redis cache
2. Monitor feature extraction performance
3. Persist fields that are:
   - Frequently accessed
   - Expensive to compute
   - Don't change frequently

---

## ✅ All Critical Questions Answered

The following critical questions have been answered:

1. ✅ **Azure ML Workspace Setup** - Create new workspace, subscription/resource group/region specified
2. ✅ **Training Strategy** - Full AutoML + Synthetic data augmentation
3. ✅ **Opportunity Schema** - Add all recommended fields
4. ✅ **Performance Thresholds** - Accept recommended thresholds
5. ✅ **Historical Data Strategy** - Start with ML using synthetic data
6. ✅ **Compute Infrastructure** - Azure ML Compute Clusters
7. ✅ **AutoML Usage** - Full AutoML
8. ✅ **Service Integration Priority** - RiskEvaluationService first
9. ✅ **Service Architecture** - Integrated services
10. ✅ **Cache Strategy** - Event-based invalidation

---

## 🚀 Ready for Implementation

**Status**: ✅ **All critical decisions made, ready to begin Phase 1**

**Remaining Questions**: 2 non-blocking questions (Q1, Q2) - Can be addressed during implementation

**Next Steps**:
1. Begin Phase 1: Foundation (Weeks 1-2)
2. Start with RiskEvaluationService integration (Weeks 3-4)
3. Address Q1 and Q2 during implementation as needed

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-28
