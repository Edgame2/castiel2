/**
 * Option List Types
 *
 * Types for managing reusable dropdown option lists.
 * Option lists can be system-wide (global) or tenant-specific.
 */
/**
 * Parse an options reference string
 * @param ref Reference string in format "scope:name"
 */
export function parseOptionsRef(ref) {
    const parts = ref.split(':');
    if (parts.length !== 2) {
        return null;
    }
    const scope = parts[0];
    if (scope !== 'system' && scope !== 'tenant') {
        return null;
    }
    return { scope, name: parts[1] };
}
/**
 * Build an options reference string
 */
export function buildOptionsRef(scope, name) {
    return `${scope}:${name}`;
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
};
/**
 * Priority options (built-in)
 */
export const PRIORITY_OPTIONS = [
    { value: 'critical', label: 'Critical', color: '#dc2626', icon: '🔴' },
    { value: 'high', label: 'High', color: '#f97316', icon: '🟠' },
    { value: 'medium', label: 'Medium', color: '#eab308', icon: '🟡' },
    { value: 'low', label: 'Low', color: '#22c55e', icon: '🟢' },
];
/**
 * Status options (built-in)
 */
export const STATUS_OPTIONS = [
    { value: 'active', label: 'Active', color: '#22c55e' },
    { value: 'pending', label: 'Pending', color: '#eab308' },
    { value: 'inactive', label: 'Inactive', color: '#6b7280' },
    { value: 'archived', label: 'Archived', color: '#9ca3af' },
];
/**
 * Common currency options (built-in)
 */
export const CURRENCY_OPTIONS = [
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
//# sourceMappingURL=option-list.types.js.map