/**
 * Integrations Module
 * Export all integration adapters and utilities
 */
export * from './base-adapter.js';
export * from './constants.js';
export * from './adapters/salesforce.adapter.js';
export * from './adapters/google-news.adapter.js';
export * from './adapters/notion.adapter.js';
export * from './adapters/google-workspace.adapter.js';
export * from './adapters/microsoft-graph.adapter.js';
export * from './adapters/hubspot.adapter.js';
import './adapters/salesforce.adapter.js';
import './adapters/google-news.adapter.js';
import './adapters/notion.adapter.js';
import './adapters/google-workspace.adapter.js';
import './adapters/microsoft-graph.adapter.js';
import './adapters/hubspot.adapter.js';
import { adapterRegistry } from './base-adapter.js';
export { adapterRegistry };
/**
 * Get all registered integration definitions
 */
export declare function getRegisteredIntegrations(): string[];
//# sourceMappingURL=index.d.ts.map