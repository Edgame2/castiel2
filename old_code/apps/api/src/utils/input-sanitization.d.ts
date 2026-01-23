/**
 * Input Sanitization Utilities
 *
 * Sanitizes user input to prevent prompt injection attacks and ensure
 * safe AI model interactions.
 */
/**
 * Sanitize user query to prevent prompt injection
 * Removes code blocks, system message markers, and limits length
 */
export declare function sanitizeUserInput(input: string): string;
/**
 * Sanitize context data before including in prompts
 * Removes sensitive identifiers and credentials
 */
export declare function sanitizeContextData(data: Record<string, any>): Record<string, any>;
/**
 * Detect potential credential leakage in text
 */
export declare function detectCredentials(text: string): boolean;
//# sourceMappingURL=input-sanitization.d.ts.map