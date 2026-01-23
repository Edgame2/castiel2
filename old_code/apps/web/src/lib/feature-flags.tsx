/**
 * Feature Flags Configuration
 * 
 * Manages feature toggles for gradual rollout and A/B testing.
 * Environment-based flags enable safe deployment of new features.
 */

import { trackTrace } from '@/lib/monitoring/app-insights'

export enum FeatureFlag {
  // ShardType Feature Flags
  SHARD_TYPES_ENABLED = 'shard_types_enabled',
  SHARD_TYPES_VISUAL_BUILDER = 'shard_types_visual_builder',
  SHARD_TYPES_CODE_EDITOR = 'shard_types_code_editor',
  SHARD_TYPES_INHERITANCE = 'shard_types_inheritance',
  SHARD_TYPES_GLOBAL_TYPES = 'shard_types_global_types',
  SHARD_TYPES_BULK_ACTIONS = 'shard_types_bulk_actions',
  SHARD_TYPES_EXPORT_IMPORT = 'shard_types_export_import',
  
  // Future Features
  SHARD_TYPES_VERSION_HISTORY = 'shard_types_version_history',
  SHARD_TYPES_AI_ASSISTANT = 'shard_types_ai_assistant',
  SHARD_TYPES_REALTIME_COLLAB = 'shard_types_realtime_collab',
}

/**
 * Feature flag configuration with environment overrides
 */
interface FeatureFlagConfig {
  enabled: boolean
  description: string
  environments?: ('development' | 'staging' | 'production')[]
  roles?: string[]
  percentage?: number // Percentage rollout (0-100)
}

/**
 * Default feature flag configurations
 */
const defaultFeatureFlags: Record<FeatureFlag, FeatureFlagConfig> = {
  // Core ShardType features - enabled in all environments
  [FeatureFlag.SHARD_TYPES_ENABLED]: {
    enabled: true,
    description: 'Enable ShardType management features',
    environments: ['development', 'staging', 'production'],
  },
  [FeatureFlag.SHARD_TYPES_VISUAL_BUILDER]: {
    enabled: true,
    description: 'Visual schema builder with drag-and-drop',
    environments: ['development', 'staging', 'production'],
  },
  [FeatureFlag.SHARD_TYPES_CODE_EDITOR]: {
    enabled: true,
    description: 'Monaco code editor for JSON Schema',
    environments: ['development', 'staging', 'production'],
  },
  [FeatureFlag.SHARD_TYPES_INHERITANCE]: {
    enabled: true,
    description: 'Type inheritance and parent-child relationships',
    environments: ['development', 'staging', 'production'],
  },
  
  // Role-gated features
  [FeatureFlag.SHARD_TYPES_GLOBAL_TYPES]: {
    enabled: true,
    description: 'Global system-wide types (Super Admin only)',
    environments: ['development', 'staging', 'production'],
    roles: ['super_admin'],
  },
  
  // Beta features - development and staging only
  [FeatureFlag.SHARD_TYPES_BULK_ACTIONS]: {
    enabled: true,
    description: 'Bulk operations on multiple ShardTypes',
    environments: ['development', 'staging'],
    percentage: 50, // 50% rollout in staging
  },
  [FeatureFlag.SHARD_TYPES_EXPORT_IMPORT]: {
    enabled: true,
    description: 'Import/Export ShardTypes as JSON/YAML',
    environments: ['development', 'staging'],
  },
  
  // Future features - disabled by default
  [FeatureFlag.SHARD_TYPES_VERSION_HISTORY]: {
    enabled: false,
    description: 'Version history and rollback capabilities',
    environments: ['development'],
  },
  [FeatureFlag.SHARD_TYPES_AI_ASSISTANT]: {
    enabled: false,
    description: 'AI-assisted schema generation',
    environments: ['development'],
  },
  [FeatureFlag.SHARD_TYPES_REALTIME_COLLAB]: {
    enabled: false,
    description: 'Real-time collaborative editing',
    environments: ['development'],
  },
}

/**
 * Get current environment
 */
function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV
  if (env === 'production') return 'production'
  if (env === 'staging') return 'staging'
  return 'development'
}

/**
 * Get user ID for percentage-based rollout
 * Uses stable hash for consistent experience
 */
function getUserRolloutPercentage(userId?: string): number {
  if (!userId) return 0
  
  // Simple hash function for consistent percentage
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash % 100)
}

/**
 * Check if a feature flag is enabled
 * 
 * @param flag - Feature flag to check
 * @param context - Optional context (user role, ID)
 * @returns true if feature is enabled
 * 
 * @example
 * ```tsx
 * if (isFeatureEnabled(FeatureFlag.SHARD_TYPES_ENABLED)) {
 *   return <ShardTypesPage />
 * }
 * ```
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  context?: {
    userRole?: string
    userId?: string
  }
): boolean {
  const config = defaultFeatureFlags[flag]
  
  // Check if flag exists
  if (!config) {
    trackTrace(`Unknown feature flag: ${flag}`, 2)
    return false
  }
  
  // Check if feature is enabled globally
  if (!config.enabled) {
    return false
  }
  
  // Check environment restrictions
  const currentEnv = getEnvironment()
  if (config.environments && !config.environments.includes(currentEnv)) {
    return false
  }
  
  // Check role restrictions
  if (config.roles && context?.userRole) {
    if (!config.roles.includes(context.userRole)) {
      return false
    }
  }
  
  // Check percentage rollout
  if (config.percentage !== undefined && context?.userId) {
    const userPercentage = getUserRolloutPercentage(context.userId)
    if (userPercentage >= config.percentage) {
      return false
    }
  }
  
  // Check environment variable override
  const envKey = `NEXT_PUBLIC_FEATURE_${flag.toUpperCase()}`
  const envValue = process.env[envKey]
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1'
  }
  
  return true
}

/**
 * React hook for feature flags
 * 
 * @example
 * ```tsx
 * const { user } = useAuth()
 * const isEnabled = useFeatureFlag(FeatureFlag.SHARD_TYPES_ENABLED, {
 *   userRole: user.role,
 *   userId: user.id
 * })
 * ```
 */
export function useFeatureFlag(
  flag: FeatureFlag,
  context?: {
    userRole?: string
    userId?: string
  }
): boolean {
  return isFeatureEnabled(flag, context)
}

/**
 * Get all enabled feature flags for debugging
 */
export function getEnabledFeatures(context?: {
  userRole?: string
  userId?: string
}): FeatureFlag[] {
  return Object.values(FeatureFlag).filter((flag) =>
    isFeatureEnabled(flag, context)
  )
}

/**
 * Feature flag provider component for debugging
 * Shows active feature flags in development
 */
export function FeatureFlagDebugger({
  context,
}: {
  context?: { userRole?: string; userId?: string }
}) {
  if (getEnvironment() !== 'development') {
    return null
  }
  
  const enabledFeatures = getEnabledFeatures(context)
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-background p-4 shadow-lg">
      <h3 className="mb-2 font-semibold text-sm">Feature Flags ({enabledFeatures.length})</h3>
      <ul className="space-y-1 text-xs">
        {enabledFeatures.map((flag) => (
          <li key={flag} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-mono">{flag}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
