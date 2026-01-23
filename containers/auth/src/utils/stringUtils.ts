/**
 * String Utilities
 * 
 * Common string manipulation functions.
 */

/**
 * Convert a string to a URL-friendly slug
 * 
 * @param text - Text to slugify
 * @returns URL-friendly slug (lowercase, hyphens, alphanumeric)
 * 
 * @example
 * slugify("My Organization Name") // "my-organization-name"
 * slugify("Test & Development") // "test-development"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with a single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate that a slug is valid format
 * 
 * @param slug - Slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  // Slug should be lowercase, alphanumeric with hyphens, 1-100 chars
  const slugPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return slugPattern.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * Generate a username from email or name
 * 
 * @param email - Email address
 * @param name - Optional name
 * @returns URL-friendly username (3-39 chars, alphanumeric + hyphens)
 */
export function generateUsername(email: string, name?: string): string {
  // Try to use name first if provided
  let base = name ? slugify(name) : email.split('@')[0].toLowerCase();
  
  // Remove non-alphanumeric except hyphens
  base = base.replace(/[^a-z0-9-]/g, '');
  
  // Ensure minimum length of 3
  if (base.length < 3) {
    base = base + 'user';
  }
  
  // Truncate to max 39 chars (GitHub limit)
  if (base.length > 39) {
    base = base.substring(0, 39);
  }
  
  // Remove trailing hyphens
  base = base.replace(/-+$/, '');
  
  return base;
}

/**
 * Validate username format
 * 
 * @param username - Username to validate
 * @returns true if valid, false otherwise
 */
export function isValidUsername(username: string): boolean {
  // Username should be 3-39 chars, alphanumeric + hyphens, not starting/ending with hyphen
  const usernamePattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return usernamePattern.test(username.toLowerCase()) && username.length >= 3 && username.length <= 39;
}
