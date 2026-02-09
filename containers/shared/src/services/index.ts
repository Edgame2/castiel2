/**
 * Service utilities
 * @module @coder/shared/services
 */

export * from './ServiceClient';
export * from './ServiceRegistry';
export * from './HttpClient';
export {
  FieldMapperService,
  type ValidationResult as FieldMapperValidationResult,
  type EntityMapping as FieldMapperEntityMapping,
  type FieldMapping as FieldMapperFieldMapping,
} from './FieldMapperService';
export * from './EntityLinkingService';
export {
  ShardValidator,
  type ValidationConfig,
  type ValidationResult as ShardValidationResult,
  type ValidationError as ShardValidationError,
} from './ShardValidator';
export * from './OpportunityEventDebouncer';
export {
  PolicyResolver,
  ACTIVATION_FLAG_NAMES,
  type PolicyResolverOptions,
  type ShardTypeAnalysisPolicyEntry,
} from './PolicyResolver';