/**
 * Feature Flag Types
 * 
 * Centralized feature flag system for runtime feature toggling
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environments?: ('development' | 'staging' | 'production')[];
  roles?: string[];
  percentage?: number; // Percentage rollout (0-100)
  tenantId: string; // 'global' for global flags, tenant ID for tenant-specific overrides
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface CreateFeatureFlagInput {
  name: string;
  description: string;
  enabled: boolean;
  environments?: ('development' | 'staging' | 'production')[];
  roles?: string[];
  percentage?: number;
  tenantId?: string;
}

export interface UpdateFeatureFlagInput {
  enabled?: boolean;
  description?: string;
  environments?: ('development' | 'staging' | 'production')[];
  roles?: string[];
  percentage?: number;
}

export interface FeatureFlagEvaluationContext {
  environment?: 'development' | 'staging' | 'production';
  userRole?: string;
  userId?: string;
  tenantId?: string;
}

