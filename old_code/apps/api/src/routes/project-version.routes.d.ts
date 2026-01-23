/**
 * Project Versioning Routes
 * API endpoints for version management, comparison, and rollback
 */
import { ProjectVersion, RollbackRequest, RollbackResult, VersionComparison, VersionHistoryEntry, VersionStatistics, PublishVersionResponse } from '../types/project-version.types';
import { ProjectVersionService } from '../services/project-version.service';
interface UserContext {
    id: string;
    email: string;
    name: string;
    tenantId: string;
}
export declare class ProjectVersionRoutes {
    private versionService;
    private readonly logger;
    constructor(versionService: ProjectVersionService);
    /**
     * POST /
     * Create new version
     */
    createVersion(projectId: string, body: {
        versionName: string;
        description?: string;
    }, user: UserContext, tenantId: string): Promise<ProjectVersion>;
    /**
     * GET /:versionId
     * Get version by ID
     */
    getVersion(projectId: string, versionId: string, tenantId: string): Promise<ProjectVersion>;
    /**
     * GET /
     * Get version history
     */
    getVersionHistory(projectId: string, limit: number | undefined, offset: number | undefined, tenantId: string): Promise<{
        entries: VersionHistoryEntry[];
        total: number;
    }>;
    /**
     * POST /compare
     * Compare two versions
     */
    compareVersions(projectId: string, body: {
        version1Id: string;
        version2Id: string;
    }, tenantId: string): Promise<VersionComparison>;
    /**
     * POST /rollback
     * Rollback to previous version
     */
    rollback(projectId: string, body: RollbackRequest, user: UserContext, tenantId: string): Promise<RollbackResult>;
    /**
     * POST /:versionId/publish
     * Publish version
     */
    publishVersion(projectId: string, versionId: string, body: {
        releaseNotes?: string;
        tags?: string[];
    }, user: UserContext, tenantId: string): Promise<PublishVersionResponse>;
    /**
     * GET /statistics
     * Get version statistics
     */
    getStatistics(projectId: string, tenantId: string): Promise<VersionStatistics>;
    /**
     * GET /:versionId/changelog
     * Get changelog between versions
     */
    getChangelog(projectId: string, versionId: string, format: string | undefined, tenantId: string): Promise<any>;
    /**
     * GET /:versionId/diff
     * Get diff between two versions
     */
    getVersionDiff(projectId: string, versionId: string, compareWith?: string, format: string | undefined, tenantId: string): Promise<any>;
    /**
     * Helper: Format changelog as Markdown
     */
    private formatChangelogMarkdown;
    /**
     * Helper: Format changelog as HTML
     */
    private formatChangelogHtml;
}
export {};
//# sourceMappingURL=project-version.routes.d.ts.map