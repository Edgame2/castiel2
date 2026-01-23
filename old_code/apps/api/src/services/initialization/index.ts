/**
 * Service Initialization Module
 * Centralized service initialization framework
 * 
 * This module provides a structured approach to initializing services
 * in the Castiel platform, replacing the monolithic routes/index.ts approach.
 */

export { initializeCoreServices, type CoreServicesResult } from './core-services.init.js';
export { registerAuthRoutesGroup } from './auth-services.init.js';
export { initializeAIServices, type AIServicesResult } from './ai-services.init.js';
export { initializeRiskServices, type RiskServicesResult } from './risk-services.init.js';
export { initializeDataServices, type DataServicesResult } from './data-services.init.js';
export { initializeIntegrationServices, type IntegrationServicesResult } from './integration-services.init.js';
export { initializeAnalyticsServices, type AnalyticsServicesResult } from './analytics-services.init.js';
export { initializeContentServices, type ContentServicesResult } from './content-services.init.js';
export { initializeCollaborationServices, type CollaborationServicesResult } from './collaboration-services.init.js';
export { initializeAdaptiveLearningServices, type AdaptiveLearningServicesResult } from './adaptive-learning-services.init.js';
export { ServiceInitializationRegistry } from './service-registry.init.js';
