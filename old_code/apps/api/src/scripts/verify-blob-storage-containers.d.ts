#!/usr/bin/env tsx
/**
 * Verify Azure Blob Storage Containers
 *
 * Verifies that required Azure Blob Storage containers exist and are accessible
 * for document management.
 *
 * Usage:
 *   pnpm --filter @castiel/api run verify:blob-storage
 *
 * Prerequisites:
 *   - AZURE_STORAGE_CONNECTION_STRING environment variable set
 *   - Azure Storage account accessible
 */
interface VerificationResult {
    container: string;
    exists: boolean;
    accessible: boolean;
    properties?: {
        publicAccess: string;
        metadata: Record<string, string>;
    };
    error?: string;
}
interface OverallResult {
    success: boolean;
    containers: VerificationResult[];
    summary: {
        total: number;
        exists: number;
        missing: number;
        errors: number;
    };
}
/**
 * Main verification function
 */
declare function verifyBlobStorageContainers(): Promise<OverallResult>;
export { verifyBlobStorageContainers, VerificationResult, OverallResult };
//# sourceMappingURL=verify-blob-storage-containers.d.ts.map