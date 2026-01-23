/**
 * Option List Types
 * 
 * Types for managing reusable dropdown option lists.
 * Option lists can be system-wide (global) or tenant-specific.
 */

import type { SelectOption } from '@castiel/shared-types';

/**
 * Option list scope
 */
export type OptionListScope = 'system' | 'tenant';

/**
 * Option List document stored in Cosmos DB
 */
export interface OptionList {
  id: string;
  /** 'system' for global lists, tenant UUID for tenant-specific */
  tenantId: string;
  /** Unique name within scope (e.g., "countries", "currencies", "priorities") */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Description */
  description?: string;
  /** The options */
  options: SelectOption[];
  /** Is this a system-provided list */
  isSystem: boolean;
  /** Can tenants override this list */
  allowTenantOverride: boolean;
  /** Is this list active */
  isActive: boolean;
  /** Tags for categorization */
  tags: string[];
  /** Created by user ID */
  createdBy: string;
  /** Updated by user ID */
  updatedBy?: string;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  /** Cosmos DB system fields */
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}

/**
 * Reference to an option list
 * Format: "scope:name" e.g., "system:countries" or "tenant:custom-statuses"
 */
export interface OptionListRef {
  scope: OptionListScope;
  name: string;
}

/**
 * Parse an options reference string
 * @param ref Reference string in format "scope:name"
 */
export function parseOptionsRef(ref: string): OptionListRef | null {
  const parts = ref.split(':');
  if (parts.length !== 2) {return null;}
  
  const scope = parts[0] as OptionListScope;
  if (scope !== 'system' && scope !== 'tenant') {return null;}
  
  return { scope, name: parts[1] };
}

/**
 * Build an options reference string
 */
export function buildOptionsRef(scope: OptionListScope, name: string): string {
  return `${scope}:${name}`;
}

/**
 * Option List creation input
 */
export interface CreateOptionListInput {
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  options: SelectOption[];
  isSystem?: boolean;
  allowTenantOverride?: boolean;
  tags?: string[];
  createdBy: string;
}

/**
 * Option List update input
 */
export interface UpdateOptionListInput {
  displayName?: string;
  description?: string;
  options?: SelectOption[];
  allowTenantOverride?: boolean;
  isActive?: boolean;
  tags?: string[];
  updatedBy: string;
}

/**
 * Option List query filter
 */
export interface OptionListQueryFilter {
  tenantId?: string;
  name?: string;
  isSystem?: boolean;
  isActive?: boolean;
  tags?: string[];
  search?: string;
}

/**
 * Option List list options
 */
export interface OptionListListOptions {
  filter?: OptionListQueryFilter;
  limit?: number;
  continuationToken?: string;
  orderBy?: 'name' | 'displayName' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Option List list result
 */
export interface OptionListListResult {
  optionLists: OptionList[];
  continuationToken?: string;
  count: number;
}

/**
 * Built-in system option lists
 */
export const BUILT_IN_OPTION_LISTS = {
  COUNTRIES: 'countries',
  CURRENCIES: 'currencies',
  LANGUAGES: 'languages',
  TIMEZONES: 'timezones',
  PRIORITIES: 'priorities',
  STATUSES: 'statuses',
} as const;

/**
 * Priority options (built-in)
 */
export const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'critical', label: 'Critical', color: '#dc2626', icon: '🔴' },
  { value: 'high', label: 'High', color: '#f97316', icon: '🟠' },
  { value: 'medium', label: 'Medium', color: '#eab308', icon: '🟡' },
  { value: 'low', label: 'Low', color: '#22c55e', icon: '🟢' },
];

/**
 * Status options (built-in)
 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active', color: '#22c55e' },
  { value: 'pending', label: 'Pending', color: '#eab308' },
  { value: 'inactive', label: 'Inactive', color: '#6b7280' },
  { value: 'archived', label: 'Archived', color: '#9ca3af' },
];

/**
 * Common currency options (built-in)
 */
export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'USD', label: 'US Dollar ($)', description: 'United States Dollar' },
  { value: 'EUR', label: 'Euro (€)', description: 'European Union Euro' },
  { value: 'GBP', label: 'British Pound (£)', description: 'British Pound Sterling' },
  { value: 'CAD', label: 'Canadian Dollar (C$)', description: 'Canadian Dollar' },
  { value: 'AUD', label: 'Australian Dollar (A$)', description: 'Australian Dollar' },
  { value: 'JPY', label: 'Japanese Yen (¥)', description: 'Japanese Yen' },
  { value: 'CHF', label: 'Swiss Franc (CHF)', description: 'Swiss Franc' },
  { value: 'CNY', label: 'Chinese Yuan (¥)', description: 'Chinese Yuan Renminbi' },
  { value: 'INR', label: 'Indian Rupee (₹)', description: 'Indian Rupee' },
  { value: 'MXN', label: 'Mexican Peso (MX$)', description: 'Mexican Peso' },
  { value: 'BRL', label: 'Brazilian Real (R$)', description: 'Brazilian Real' },
  { value: 'KRW', label: 'South Korean Won (₩)', description: 'South Korean Won' },
];











