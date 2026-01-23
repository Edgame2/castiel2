# AI Model Auto-Selection Configuration

## Overview

This document outlines recommendations for Super Admin configuration of the AI Model auto-selection feature. The configuration should allow fine-tuning of model selection behavior while maintaining sensible defaults.

---

## Configuration Schema

### 1. Model Selection Strategy Configuration

```typescript
interface ModelSelectionConfig {
  // Enable/disable auto-selection
  enabled: boolean;
  
  // Default quality preference when not specified
  defaultQualityPreference: 'economy' | 'standard' | 'premium' | 'auto';
  
  // Scoring weights (must sum to 100)
  scoringWeights: {
    complexityMatching: number;    // How much to weight complexity fit (default: 40)
    costOptimization: number;      // How much to weight cost (default: 30)
    capabilityMatching: number;    // How much to weight capabilities (default: 30)
    performanceHistory?: number;   // How much to weight past performance (default: 0, optional)
  };
  
  // Complexity thresholds
  complexityThresholds: {
    economyMax: number;            // Below this = economy tier (default: 30)
    premiumMin: number;            // Above this = premium tier (default: 70)
  };
  
  // Cost optimization strategy
  costOptimization: {
    strategy: 'aggressive' | 'balanced' | 'quality-first';
    maxCostMultiplier: number;     // Max cost vs cheapest option (default: 2.0)
    preferTenantModels: boolean;   // Prefer tenant BYOK models (default: true)
  };
  
  // Fallback behavior
  fallback: {
    allowFallback: boolean;        // Allow fallback to different tier (default: true)
    fallbackOrder: ('economy' | 'standard' | 'premium')[]; // Fallback priority
    maxFallbackAttempts: number;   // Max attempts before error (default: 2)
  };
  
  // Performance-based selection
  performanceBasedSelection: {
    enabled: boolean;              // Use historical performance (default: false)
    minSampleSize: number;         // Min requests before using performance (default: 10)
    performanceWeight: number;     // Weight for performance in scoring (0-1)
    considerLatency: boolean;      // Factor in latency (default: true)
    considerSuccessRate: boolean;  // Factor in success rate (default: true)
    considerUserSatisfaction: boolean; // Factor in user feedback (default: false)
  };
  
  // Model preferences by insight type
  insightTypePreferences: {
    [insightType: string]: {
      preferredTier?: 'economy' | 'standard' | 'premium';
      preferredModels?: string[];  // Model IDs in priority order
      minTier?: 'economy' | 'standard' | 'premium';
    };
  };
  
  // Tenant override capabilities
  tenantOverrides: {
    allowQualityPreference: boolean;  // Allow tenants to set default quality (default: true)
    allowModelBlacklist: boolean;      // Allow tenants to blacklist models (default: true)
    allowModelWhitelist: boolean;      // Allow tenants to whitelist models (default: false)
    maxCustomPreferences: number;      // Max custom insight type preferences (default: 5)
  };
}
```

---

## Recommended Configuration Options

### 1. **Scoring Weights** (Priority: HIGH)

**Purpose**: Control how models are scored and ranked

**Current Implementation**: Hardcoded in `AIModelSelectionService.scoreConnections()`
- Complexity matching: 40 points
- Cost optimization: 30 points  
- Capability matching: 30 points

**Recommendation**:
```typescript
scoringWeights: {
  complexityMatching: 40,    // How well model matches query complexity
  costOptimization: 30,      // Cost efficiency
  capabilityMatching: 30,   // Required capabilities (vision, functions, etc.)
  performanceHistory: 0,    // Historical performance (optional, disabled by default)
}
```

**UI Controls**:
- Sliders for each weight (must sum to 100)
- Preset profiles: "Cost Optimized", "Quality First", "Balanced"
- Validation: Sum must equal 100

**Use Cases**:
- **Cost Optimized**: `{ complexityMatching: 30, costOptimization: 50, capabilityMatching: 20 }`
- **Quality First**: `{ complexityMatching: 50, costOptimization: 20, capabilityMatching: 30 }`
- **Balanced**: `{ complexityMatching: 40, costOptimization: 30, capabilityMatching: 30 }`

---

### 2. **Complexity Thresholds** (Priority: HIGH)

**Purpose**: Define when to use economy vs standard vs premium models

**Current Implementation**: Hardcoded in `ModelRouterService`
- Economy threshold: 30
- Premium threshold: 70

**Recommendation**:
```typescript
complexityThresholds: {
  economyMax: 30,    // Complexity score ≤ 30 → economy tier
  premiumMin: 70,    // Complexity score ≥ 70 → premium tier
  // 30 < score < 70 → standard tier
}
```

**UI Controls**:
- Number inputs with validation (economyMax < premiumMin)
- Visual slider showing threshold ranges
- Preview of example queries for each tier

**Use Cases**:
- **Aggressive Cost Saving**: `{ economyMax: 50, premiumMin: 90 }` (more economy usage)
- **Quality Focus**: `{ economyMax: 20, premiumMin: 60 }` (more premium usage)
- **Balanced**: `{ economyMax: 30, premiumMin: 70 }` (default)

---

### 3. **Cost Optimization Strategy** (Priority: MEDIUM)

**Purpose**: Control how aggressively to optimize for cost

**Current Implementation**: Uses `preferQuality` parameter from request

**Recommendation**:
```typescript
costOptimization: {
  strategy: 'balanced',           // 'aggressive' | 'balanced' | 'quality-first'
  maxCostMultiplier: 2.0,         // Max cost vs cheapest (e.g., 2.0 = can be 2x more expensive)
  preferTenantModels: true,       // Prefer tenant BYOK over system models
  costWeightByTier: {            // Cost weight adjustment by tier
    economy: 1.0,                 // Full weight for economy
    standard: 0.8,                // 80% weight for standard
    premium: 0.5,                 // 50% weight for premium
  }
}
```

**UI Controls**:
- Dropdown for strategy
- Slider for maxCostMultiplier (1.0 - 5.0)
- Toggle for preferTenantModels
- Advanced: Per-tier cost weights

**Use Cases**:
- **Aggressive**: `{ strategy: 'aggressive', maxCostMultiplier: 1.5 }` (strict cost control)
- **Balanced**: `{ strategy: 'balanced', maxCostMultiplier: 2.0 }` (default)
- **Quality First**: `{ strategy: 'quality-first', maxCostMultiplier: 5.0 }` (cost less important)

---

### 4. **Fallback Behavior** (Priority: MEDIUM)

**Purpose**: Define what happens when preferred model is unavailable

**Current Implementation**: Basic fallback to alternative models

**Recommendation**:
```typescript
fallback: {
  allowFallback: true,
  fallbackOrder: ['standard', 'economy', 'premium'], // Try standard first, then economy, then premium
  maxFallbackAttempts: 2,
  allowCrossProviderFallback: true,  // Allow fallback to different provider
  fallbackTimeoutMs: 5000,           // Max time to wait for fallback
}
```

**UI Controls**:
- Toggle for allowFallback
- Drag-and-drop list for fallbackOrder
- Number input for maxFallbackAttempts
- Toggle for allowCrossProviderFallback

**Use Cases**:
- **Strict**: `{ allowFallback: false }` (fail if preferred unavailable)
- **Flexible**: `{ allowFallback: true, fallbackOrder: ['standard', 'economy', 'premium'] }`
- **Cost-Conscious**: `{ allowFallback: true, fallbackOrder: ['economy', 'standard', 'premium'] }`

---

### 5. **Performance-Based Selection** (Priority: LOW - Future Enhancement)

**Purpose**: Learn from past model performance to improve selections

**Current Implementation**: Not implemented (tracked but not used)

**Recommendation**:
```typescript
performanceBasedSelection: {
  enabled: false,                  // Disabled by default (requires data)
  minSampleSize: 10,              // Min requests before using performance data
  performanceWeight: 0.2,         // 20% weight in scoring
  considerLatency: true,
  considerSuccessRate: true,
  considerUserSatisfaction: false, // Requires feedback system
  decayFactor: 0.95,              // Weight older data less (0.95 = 5% decay per period)
  updateInterval: 'daily',         // How often to recalculate performance
}
```

**UI Controls**:
- Toggle to enable/disable
- Sliders for weights
- Checkboxes for what to consider
- Preview of current performance data

**Use Cases**:
- **Learning Enabled**: `{ enabled: true, performanceWeight: 0.2 }` (20% based on history)
- **Conservative**: `{ enabled: true, performanceWeight: 0.1, minSampleSize: 50 }`
- **Disabled**: `{ enabled: false }` (use only static rules)

---

### 6. **Insight Type Preferences** (Priority: MEDIUM)

**Purpose**: Override default selection for specific insight types

**Current Implementation**: Not implemented

**Recommendation**:
```typescript
insightTypePreferences: {
  summary: {
    preferredTier: 'economy',      // Summaries are simple
    preferredModels: ['gpt-4o-mini', 'gpt-3.5-turbo'],
  },
  analysis: {
    preferredTier: 'premium',      // Analysis needs quality
    preferredModels: ['gpt-4o', 'claude-3-opus'],
  },
  recommendation: {
    preferredTier: 'standard',
    minTier: 'standard',           // Never use economy for recommendations
  },
  // ... other insight types
}
```

**UI Controls**:
- Table/grid with insight types as rows
- Dropdowns for preferredTier, minTier
- Multi-select for preferredModels
- "Reset to Default" button per row

**Use Cases**:
- **Cost Optimized**: All insight types use 'economy' or 'standard'
- **Quality Focus**: Complex types (analysis, prediction) use 'premium'
- **Custom**: Tenant-specific preferences for their use cases

---

### 7. **Tenant Override Capabilities** (Priority: HIGH)

**Purpose**: Control what tenants can customize

**Current Implementation**: Limited tenant customization

**Recommendation**:
```typescript
tenantOverrides: {
  allowQualityPreference: true,    // Tenants can set default quality
  allowModelBlacklist: true,       // Tenants can block specific models
  allowModelWhitelist: false,      // Tenants can restrict to specific models (restrictive)
  maxCustomPreferences: 5,         // Max custom insight type preferences
  requireApproval: false,          // Require Super Admin approval for overrides
}
```

**UI Controls**:
- Toggles for each capability
- Number input for maxCustomPreferences
- Toggle for requireApproval
- Preview of what tenants will see

**Use Cases**:
- **Open**: All overrides allowed, no approval needed
- **Controlled**: Overrides allowed but require approval
- **Restricted**: Only quality preference allowed, no model selection

---

## Implementation Recommendations

### 1. **Storage Location** ✅ **CONFIRMED - systemConfig Container**

**Storage**: `systemConfig` Cosmos DB container (existing)

**Document Structure**:
```typescript
// Extend existing SystemAIConfig interface
// File: apps/api/src/types/ai-provider.types.ts
export interface SystemAIConfig {
  id: string;                      // 'system-ai-config'
  partitionKey: string;            // 'system-ai-config' (used as partition key)
  
  // Existing fields
  defaultProvider: AIProviderName;
  defaultModel: string;
  defaultEmbeddingModel: string;
  allowedProviders: AIProviderName[];
  allowedModels: string[];
  globalRateLimits: { ... };
  costControls: { ... };
  features: { ... };
  
  // NEW: Model Selection Configuration
  modelSelection?: ModelSelectionConfig;
  
  // Metadata
  updatedAt: Date;
  updatedBy: string;
}
```

**Container Details**:
- **Container**: `systemConfig` (already exists)
- **Partition Key**: `/configType` (container level), but document uses `id` as partition key value
- **Document ID**: `system-ai-config` (constant: `SYSTEM_CONFIG_ID`)
- **Service**: `AIConfigService` (already handles this container)
- **Caching**: Redis cache with 5-minute TTL (already implemented)
- **Update Method**: `AIConfigService.updateSystemConfig()` (supports partial updates)

**Why This Approach**:
✅ Uses existing infrastructure (`AIConfigService`, caching, update methods)  
✅ Keeps all system AI config in one place  
✅ Follows established pattern  
✅ Single document = atomic updates  
✅ Already has audit trail (updatedAt, updatedBy)  
✅ No new containers or services needed  
✅ Leverages existing `UpdateSystemAIConfigInput` for partial updates

---

### 2. **API Endpoints** ✅ **Extend Existing Endpoints**

**Recommended Approach**: Extend existing `/api/v1/admin/ai/config` endpoint

```typescript
// GET /api/v1/admin/ai/config
// Returns full SystemAIConfig including modelSelection field
// Already implemented via AIConfigService.getSystemConfig()

// PATCH /api/v1/admin/ai/config
// Update any part of SystemAIConfig, including modelSelection
// Already implemented via AIConfigService.updateSystemConfig()
// Example request body:
{
  modelSelection: {
    scoringWeights: {
      complexityMatching: 40,
      costOptimization: 30,
      capabilityMatching: 30
    },
    complexityThresholds: {
      economyMax: 30,
      premiumMin: 70
    },
    // ... other fields
  }
}
```

**Implementation**:
```typescript
// 1. Extend UpdateSystemAIConfigInput
// File: apps/api/src/types/ai-provider.types.ts
export interface UpdateSystemAIConfigInput {
  // ... existing fields
  modelSelection?: Partial<ModelSelectionConfig>;  // NEW
}

// 2. Update AIConfigService.updateSystemConfig()
// File: apps/api/src/services/ai-config.service.ts
async updateSystemConfig(
  input: UpdateSystemAIConfigInput,
  updatedBy: string
): Promise<SystemAIConfig> {
  const current = await this.getSystemConfig();
  
  const updated: SystemAIConfig = {
    ...current,
    ...input,
    globalRateLimits: { ...current.globalRateLimits, ...input.globalRateLimits },
    costControls: { ...current.costControls, ...input.costControls },
    features: { ...current.features, ...input.features },
    // NEW: Merge modelSelection
    modelSelection: input.modelSelection 
      ? { ...(current.modelSelection || DEFAULT_MODEL_SELECTION_CONFIG), ...input.modelSelection }
      : current.modelSelection,
    updatedAt: new Date(),
    updatedBy,
  };
  
  await this.saveSystemConfig(updated);
  return updated;
}
```

**Optional: Dedicated Preview/Test Endpoints** (Nice to have)
```typescript
// GET /api/v1/admin/ai/config/model-selection/preview
// Preview how configuration affects sample queries

// POST /api/v1/admin/ai/config/model-selection/test
// Test configuration with sample queries
```

---

### 3. **UI Components**

**Main Configuration Page**:
- Tabs: "Scoring", "Thresholds", "Cost", "Fallback", "Performance", "Insight Types", "Tenant Overrides"
- Each tab has:
  - Current values
  - Recommended presets
  - Advanced options (collapsible)
  - Preview/validation
  - Save/Cancel buttons

**Preview/Testing**:
- Sample queries with complexity scores
- Show which model would be selected
- Show scoring breakdown
- Compare different configurations

---

### 4. **Validation Rules**

```typescript
// Scoring weights must sum to 100
if (config.scoringWeights.complexityMatching + 
    config.scoringWeights.costOptimization + 
    config.scoringWeights.capabilityMatching + 
    (config.scoringWeights.performanceHistory || 0) !== 100) {
  throw new Error('Scoring weights must sum to 100');
}

// Complexity thresholds must be valid
if (config.complexityThresholds.economyMax >= 
    config.complexityThresholds.premiumMin) {
  throw new Error('economyMax must be less than premiumMin');
}

// Max cost multiplier must be reasonable
if (config.costOptimization.maxCostMultiplier < 1.0 || 
    config.costOptimization.maxCostMultiplier > 10.0) {
  throw new Error('maxCostMultiplier must be between 1.0 and 10.0');
}
```

---

### 5. **Default Configuration**

```typescript
const DEFAULT_MODEL_SELECTION_CONFIG: ModelSelectionConfig = {
  enabled: true,
  defaultQualityPreference: 'auto',
  
  scoringWeights: {
    complexityMatching: 40,
    costOptimization: 30,
    capabilityMatching: 30,
    performanceHistory: 0,
  },
  
  complexityThresholds: {
    economyMax: 30,
    premiumMin: 70,
  },
  
  costOptimization: {
    strategy: 'balanced',
    maxCostMultiplier: 2.0,
    preferTenantModels: true,
  },
  
  fallback: {
    allowFallback: true,
    fallbackOrder: ['standard', 'economy', 'premium'],
    maxFallbackAttempts: 2,
    allowCrossProviderFallback: true,
    fallbackTimeoutMs: 5000,
  },
  
  performanceBasedSelection: {
    enabled: false,
    minSampleSize: 10,
    performanceWeight: 0.2,
    considerLatency: true,
    considerSuccessRate: true,
    considerUserSatisfaction: false,
  },
  
  insightTypePreferences: {
    // Empty = use defaults
  },
  
  tenantOverrides: {
    allowQualityPreference: true,
    allowModelBlacklist: true,
    allowModelWhitelist: false,
    maxCustomPreferences: 5,
  },
};
```

---

### 6. **Migration Path**

1. **Phase 1**: Add configuration schema, keep hardcoded defaults
2. **Phase 2**: Load configuration, use if present, fallback to hardcoded
3. **Phase 3**: Build UI for Super Admin
4. **Phase 4**: Remove hardcoded defaults, require configuration
5. **Phase 5**: Add tenant override UI (if enabled)

---

## Priority Recommendations

### **Must Have** (P0):
1. ✅ Scoring weights configuration
2. ✅ Complexity thresholds
3. ✅ Tenant override capabilities (basic)

### **Should Have** (P1):
4. ✅ Cost optimization strategy
5. ✅ Fallback behavior
6. ✅ Insight type preferences

### **Nice to Have** (P2):
7. ⚠️ Performance-based selection (requires data collection)
8. ⚠️ Advanced tenant overrides (whitelist, approval workflow)

---

## Example Use Cases

### Use Case 1: Cost-Conscious Organization
```typescript
{
  scoringWeights: { complexityMatching: 30, costOptimization: 50, capabilityMatching: 20 },
  complexityThresholds: { economyMax: 50, premiumMin: 90 },
  costOptimization: { strategy: 'aggressive', maxCostMultiplier: 1.5 },
  defaultQualityPreference: 'economy',
}
```
**Result**: Maximizes economy model usage, strict cost control

---

### Use Case 2: Quality-Focused Organization
```typescript
{
  scoringWeights: { complexityMatching: 50, costOptimization: 20, capabilityMatching: 30 },
  complexityThresholds: { economyMax: 20, premiumMin: 60 },
  costOptimization: { strategy: 'quality-first', maxCostMultiplier: 5.0 },
  defaultQualityPreference: 'premium',
  insightTypePreferences: {
    analysis: { preferredTier: 'premium' },
    recommendation: { preferredTier: 'premium' },
  }
}
```
**Result**: Prioritizes quality, uses premium models more often

---

### Use Case 3: Balanced Multi-Tenant SaaS
```typescript
{
  scoringWeights: { complexityMatching: 40, costOptimization: 30, capabilityMatching: 30 },
  complexityThresholds: { economyMax: 30, premiumMin: 70 },
  costOptimization: { strategy: 'balanced', maxCostMultiplier: 2.0 },
  tenantOverrides: {
    allowQualityPreference: true,
    allowModelBlacklist: true,
    maxCustomPreferences: 5,
  }
}
```
**Result**: Balanced defaults, tenants can customize within limits

---

## Security & Compliance Considerations

1. **Audit Trail**: Log all configuration changes with user, timestamp, before/after values
2. **Validation**: Prevent configurations that could cause excessive costs or poor quality
3. **Tenant Isolation**: Ensure tenant overrides don't affect other tenants
4. **Rate Limiting**: Prevent rapid configuration changes that could destabilize system
5. **Backup/Restore**: Allow exporting/importing configurations for disaster recovery

---

## Monitoring & Observability

Track these metrics:
- Model selection distribution (by tier, by model)
- Cost per selection (actual vs estimated)
- Selection accuracy (did selected model perform well?)
- Fallback frequency (how often fallback is used)
- Tenant override usage (which tenants customize)

---

## Conclusion

This configuration system provides Super Admins with comprehensive control over AI model selection while maintaining sensible defaults. The phased approach allows incremental implementation, and the tenant override capabilities provide flexibility for multi-tenant deployments.

**Next Steps**:
1. Review and approve configuration schema
2. Implement configuration storage (extend SystemAIConfig)
3. Update AIModelSelectionService to use configuration
4. Build Super Admin UI
5. Add monitoring and analytics

