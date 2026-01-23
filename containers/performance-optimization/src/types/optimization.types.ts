/**
 * Performance Optimization types
 * Core data model for code performance optimization
 */

export enum OptimizationType {
  CODE = 'code',
  BUNDLE_SIZE = 'bundle_size',
  DATABASE_QUERY = 'database_query',
  ALGORITHM = 'algorithm',
  MEMORY = 'memory',
  NETWORK = 'network',
  RENDER = 'render',
  CUSTOM = 'custom',
}

export enum OptimizationStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  OPTIMIZING = 'optimizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum OptimizationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Performance Optimization
 */
export interface PerformanceOptimization {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  type: OptimizationType;
  status: OptimizationStatus;
  target: {
    type: 'file' | 'directory' | 'module' | 'project' | 'query' | 'function';
    path: string;
    identifier?: string; // Function name, query ID, etc.
  };
  baseline: {
    metrics: {
      executionTime?: number; // in milliseconds
      memoryUsage?: number; // in bytes
      bundleSize?: number; // in bytes
      queryTime?: number; // in milliseconds
      throughput?: number; // requests per second
      cpuUsage?: number; // percentage
    };
    measuredAt: Date;
  };
  optimized?: {
    metrics: {
      executionTime?: number;
      memoryUsage?: number;
      bundleSize?: number;
      queryTime?: number;
      throughput?: number;
      cpuUsage?: number;
    };
    improvements: {
      executionTime?: number; // percentage improvement
      memoryUsage?: number;
      bundleSize?: number;
      queryTime?: number;
      throughput?: number;
      cpuUsage?: number;
    };
    changes?: Array<{
      file: string;
      line?: number;
      original: string;
      optimized: string;
      reason: string;
    }>;
  };
  priority: OptimizationPriority;
  recommendations?: Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    estimatedImprovement?: number; // percentage
  }>;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
  createdAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Optimization Plan
 */
export interface OptimizationPlan {
  id: string;
  tenantId: string; // Partition key
  optimizationId: string;
  analysis: {
    bottlenecks: Array<{
      type: string;
      location: string;
      impact: number; // 0-1
      description: string;
    }>;
    opportunities: Array<{
      type: string;
      description: string;
      estimatedGain: number; // percentage
      effort: 'low' | 'medium' | 'high';
    }>;
  };
  steps: Array<{
    order: number;
    type: OptimizationType;
    description: string;
    target: string;
    estimatedImprovement: number;
  }>;
  estimatedTotalImprovement: number; // percentage
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create optimization input
 */
export interface CreateOptimizationInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  type: OptimizationType;
  target: {
    type: 'file' | 'directory' | 'module' | 'project' | 'query' | 'function';
    path: string;
    identifier?: string;
  };
  priority?: OptimizationPriority;
}

/**
 * Update optimization input
 */
export interface UpdateOptimizationInput {
  name?: string;
  description?: string;
  status?: OptimizationStatus;
  optimized?: PerformanceOptimization['optimized'];
  recommendations?: PerformanceOptimization['recommendations'];
  error?: string;
}

/**
 * Run optimization input
 */
export interface RunOptimizationInput {
  tenantId: string;
  userId: string;
  optimizationId: string;
  applyChanges?: boolean; // If false, only analyze and recommend
}

