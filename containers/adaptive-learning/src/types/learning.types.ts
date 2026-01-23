/**
 * Adaptive Learning Service types
 * Core data model for learning paths and skill tracking
 */

export enum LearningPathStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  COMPLETED = 'completed',
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

/**
 * Learning Path
 */
export interface LearningPath {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  category?: string; // Category for grouping
  status: LearningPathStatus;
  skills: string[]; // Skill IDs covered in this path
  modules: LearningModule[]; // Modules in the path
  estimatedDuration?: number; // Estimated duration in hours
  difficulty: SkillLevel;
  prerequisites?: string[]; // Required skill IDs
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Learning Module
 */
export interface LearningModule {
  id: string;
  name: string;
  description?: string;
  content: string; // Module content (markdown, HTML, etc.)
  order: number; // Order in the learning path
  estimatedDuration?: number; // Estimated duration in minutes
  skills: string[]; // Skill IDs covered in this module
  resources?: LearningResource[]; // Additional resources
  assessments?: string[]; // Assessment IDs
}

/**
 * Learning Resource
 */
export interface LearningResource {
  id: string;
  type: 'video' | 'article' | 'tutorial' | 'documentation' | 'code_example' | 'exercise';
  title: string;
  url?: string;
  content?: string;
  description?: string;
}

/**
 * Skill
 */
export interface Skill {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  category?: string; // Category for grouping
  level: SkillLevel;
  parentSkillId?: string; // For skill hierarchies
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * User Progress
 */
export interface UserProgress {
  id: string;
  tenantId: string; // Partition key
  userId: string;
  learningPathId?: string;
  moduleId?: string;
  skillId?: string;
  status: ProgressStatus;
  progress: number; // 0-100 percentage
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Assessment
 */
export interface Assessment {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  skillId?: string; // Skill being assessed
  learningPathId?: string; // Associated learning path
  questions: AssessmentQuestion[];
  passingScore: number; // Minimum score to pass (0-100)
  timeLimit?: number; // Time limit in minutes
  attemptsAllowed?: number; // Maximum attempts allowed
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Assessment Question
 */
export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'code' | 'essay';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer?: any; // Correct answer (varies by type)
  points: number; // Points for this question
  explanation?: string; // Explanation of correct answer
}

/**
 * Assessment Result
 */
export interface AssessmentResult {
  id: string;
  tenantId: string; // Partition key
  userId: string;
  assessmentId: string;
  score: number; // 0-100
  passed: boolean;
  answers: Record<string, any>; // Question ID -> answer
  startedAt: Date;
  completedAt: Date;
  timeSpent?: number; // Time spent in minutes
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create learning path input
 */
export interface CreateLearningPathInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  skills?: string[];
  modules?: Array<{
    name: string;
    description?: string;
    content: string;
    order: number;
    estimatedDuration?: number;
    skills?: string[];
    resources?: Array<{
      type: string;
      title: string;
      url?: string;
      content?: string;
      description?: string;
    }>;
  }>;
  estimatedDuration?: number;
  difficulty: SkillLevel;
  prerequisites?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Update learning path input
 */
export interface UpdateLearningPathInput {
  name?: string;
  description?: string;
  category?: string;
  status?: LearningPathStatus;
  skills?: string[];
  modules?: LearningModule[];
  estimatedDuration?: number;
  difficulty?: SkillLevel;
  prerequisites?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Create skill input
 */
export interface CreateSkillInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  level: SkillLevel;
  parentSkillId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Update progress input
 */
export interface UpdateProgressInput {
  status?: ProgressStatus;
  progress?: number; // 0-100
  notes?: string;
  metadata?: Record<string, any>;
}

