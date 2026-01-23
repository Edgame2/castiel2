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

