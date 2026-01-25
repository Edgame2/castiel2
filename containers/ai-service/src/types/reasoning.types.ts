/**
 * Reasoning Engine types
 * Core data model for advanced reasoning capabilities
 */

export enum ReasoningType {
  CHAIN_OF_THOUGHT = 'chain_of_thought',
  TREE_OF_THOUGHT = 'tree_of_thought',
  ANALOGICAL = 'analogical',
  COUNTERFACTUAL = 'counterfactual',
  CAUSAL = 'causal',
  PROBABILISTIC = 'probabilistic',
  META_REASONING = 'meta_reasoning',
  CUSTOM = 'custom',
}

export enum ReasoningStatus {
  PENDING = 'pending',
  REASONING = 'reasoning',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Reasoning Task
 */
export interface ReasoningTask {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  type: ReasoningType;
  status: ReasoningStatus;
  input: {
    query: string; // The question or problem to reason about
    context?: string[]; // Context IDs or additional context
    constraints?: Record<string, any>; // Constraints or requirements
    examples?: string[]; // Example solutions or patterns
  };
  output?: {
    reasoning?: string; // The reasoning process
    conclusion?: string; // Final conclusion or answer
    steps?: ReasoningStep[];
    alternatives?: Array<{
      reasoning: string;
      conclusion: string;
      confidence: number; // 0-1
    }>;
    confidence?: number; // Overall confidence 0-1
  };
  metadata?: {
    depth?: number; // Reasoning depth
    branches?: number; // Number of branches explored
    tokensUsed?: number;
    duration?: number; // in milliseconds
  };
  startedAt?: Date;
  completedAt?: Date;
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
 * Reasoning Step
 */
export interface ReasoningStep {
  id: string;
  order: number;
  type: 'observation' | 'hypothesis' | 'inference' | 'validation' | 'conclusion';
  content: string;
  reasoning?: string;
  confidence?: number; // 0-1
  evidence?: string[];
  alternatives?: string[];
  parentStepId?: string; // For tree structures
  childrenStepIds?: string[]; // For tree structures
}

/**
 * Chain-of-Thought Reasoning
 */
export interface ChainOfThoughtReasoning {
  id: string;
  tenantId: string;
  taskId: string;
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  createdAt: Date;
}

/**
 * Tree-of-Thought Reasoning
 */
export interface TreeOfThoughtReasoning {
  id: string;
  tenantId: string;
  taskId: string;
  rootStep: ReasoningStep;
  branches: Array<{
    path: ReasoningStep[];
    conclusion: string;
    confidence: number;
    evaluation: number; // 0-1
  }>;
  bestPath?: ReasoningStep[];
  bestConclusion?: string;
  createdAt: Date;
}

/**
 * Analogical Reasoning
 */
export interface AnalogicalReasoning {
  id: string;
  tenantId: string;
  taskId: string;
  source: {
    domain: string;
    problem: string;
    solution: string;
  };
  target: {
    domain: string;
    problem: string;
  };
  mapping: Array<{
    sourceElement: string;
    targetElement: string;
    similarity: number; // 0-1
  }>;
  adaptedSolution: string;
  confidence: number;
  createdAt: Date;
}

/**
 * Counterfactual Reasoning
 */
export interface CounterfactualReasoning {
  id: string;
  tenantId: string;
  taskId: string;
  original: {
    scenario: string;
    outcome: string;
  };
  counterfactuals: Array<{
    modifiedScenario: string;
    predictedOutcome: string;
    difference: string;
    confidence: number;
  }>;
  insights: string[];
  createdAt: Date;
}

/**
 * Causal Reasoning
 */
export interface CausalReasoning {
  id: string;
  tenantId: string;
  taskId: string;
  causalGraph: {
    nodes: Array<{
      id: string;
      name: string;
      type: 'cause' | 'effect' | 'mediator';
    }>;
    edges: Array<{
      from: string;
      to: string;
      strength: number; // 0-1
      direction: 'direct' | 'indirect';
    }>;
  };
  analysis: {
    rootCauses: string[];
    effects: string[];
    mediators: string[];
    interventions: Array<{
      action: string;
      expectedOutcome: string;
      confidence: number;
    }>;
  };
  createdAt: Date;
}

/**
 * Create reasoning task input
 */
export interface CreateReasoningTaskInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  type: ReasoningType;
  input: {
    query: string;
    context?: string[];
    constraints?: Record<string, any>;
    examples?: string[];
  };
  options?: {
    maxDepth?: number;
    maxBranches?: number;
    includeAlternatives?: boolean;
    minConfidence?: number;
  };
}

/**
 * Update reasoning task input
 */
export interface UpdateReasoningTaskInput {
  name?: string;
  description?: string;
  status?: ReasoningStatus;
  output?: ReasoningTask['output'];
  metadata?: ReasoningTask['metadata'];
  error?: string;
}
