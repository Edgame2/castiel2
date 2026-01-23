#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 *
 * Validates all required and optional environment variables for the API service.
 * Can be run independently before starting the service to catch configuration errors early.
 *
 * Usage:
 *   pnpm --filter @castiel/api run validate:env
 *   tsx src/scripts/validate-env.ts
 */
interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    info: string[];
}
/**
 * Validate environment variables
 */
declare function validateEnvironment(): ValidationResult;
export { validateEnvironment };
//# sourceMappingURL=validate-env.d.ts.map