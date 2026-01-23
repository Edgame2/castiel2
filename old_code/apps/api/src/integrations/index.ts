/**
 * Integrations Module
 * Export all integration adapters and utilities
 */

// Base adapter
export * from './base-adapter.js';

// Constants
export * from './constants.js';

// Adapters
export * from './adapters/salesforce.adapter.js';
export * from './adapters/google-news.adapter.js';
export * from './adapters/notion.adapter.js';
export * from './adapters/google-workspace.adapter.js';
export * from './adapters/microsoft-graph.adapter.js';
export * from './adapters/hubspot.adapter.js';
export * from './adapters/dynamics-365.adapter.js';
export * from './adapters/zoom.adapter.js';
export * from './adapters/gong.adapter.js';

// Import adapters to trigger registration
import './adapters/salesforce.adapter.js';
import './adapters/google-news.adapter.js';
import './adapters/notion.adapter.js';
import './adapters/google-workspace.adapter.js';
import './adapters/microsoft-graph.adapter.js';
import './adapters/hubspot.adapter.js';
import './adapters/dynamics-365.adapter.js';
import './adapters/zoom.adapter.js';
import './adapters/gong.adapter.js';

// Re-export registry
import { adapterRegistry } from './base-adapter.js';
export { adapterRegistry };

/**
 * Get all registered integration definitions
 */
export function getRegisteredIntegrations() {
  return adapterRegistry.list();
}




