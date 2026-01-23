// @ts-nocheck
/**
 * Project Versioning Routes
 * API endpoints for version management, comparison, and rollback
 */

import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  ProjectVersion,
  RollbackRequest,
  RollbackResult,
  VersionComparison,
  VersionHistoryEntry,
  VersionStatistics,
  PublishVersionRequest,
  PublishVersionResponse,
} from '../types/project-version.types';
import { ProjectVersionService } from '../services/project-version.service';
import { Logger } from '@nestjs/common';

interface UserContext {
  id: string;
  email: string;
  name: string;
  tenantId: string;
}

@Controller('api/v1/projects/:projectId/versions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Project Versioning')
export class ProjectVersionRoutes {
  private readonly logger = new Logger(ProjectVersionRoutes.name);

  constructor(
    @Inject(ProjectVersionService) private versionService: ProjectVersionService,
  ) {}

  /**
   * POST /
   * Create new version
   */
  @Post()
  @ApiOperation({
    summary: 'Create version',
    description: 'Creates a new version snapshot of the current project state',
  })
  @ApiResponse({
    status: 201,
    description: 'Version created successfully',
    type: ProjectVersion,
  })
  @ApiResponse({ status: 400, description: 'Invalid version data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createVersion(
    @Param('projectId') projectId: string,
    @Body() body: { versionName: string; description?: string },
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: string,
  ): Promise<ProjectVersion> {
    try {
      // Validation
      if (!body.versionName || body.versionName.trim().length === 0) {
        throw new Error('Version name is required');
      }

      if (body.versionName.length > 200) {
        throw new Error('Version name exceeds maximum length of 200 characters');
      }

      const version = await this.versionService.createVersion(
        tenantId,
        projectId,
        body.versionName,
        body.description || '',
        user.id,
        user.email,
        user.name,
      );

      this.logger.log(`Version created: ${version.versionNumber}`);

      return version;
    } catch (error) {
      this.logger.error(`Failed to create version: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /:versionId
   * Get version by ID
   */
  @Get(':versionId')
  @ApiOperation({
    summary: 'Get version',
    description: 'Retrieves a specific version of the project by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Version retrieved successfully',
    type: ProjectVersion,
  })
  @ApiResponse({ status: 404, description: 'Version not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getVersion(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<ProjectVersion> {
    try {
      const version = await this.versionService.getVersion(tenantId, versionId);

      // Verify project access
      if (version.projectId !== projectId) {
        throw new Error('Version does not belong to this project');
      }

      return version;
    } catch (error) {
      this.logger.error(`Failed to get version: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /
   * Get version history
   */
  @Get()
  @ApiOperation({
    summary: 'Get version history',
    description: 'Retrieves the version history timeline for a project',
  })
  @ApiResponse({
    status: 200,
    description: 'Version history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getVersionHistory(
    @Param('projectId') projectId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @CurrentTenant() tenantId: string,
  ): Promise<{
    entries: VersionHistoryEntry[];
    total: number;
  }> {
    try {
      // Validation
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      const history = await this.versionService.getVersionHistory(
        tenantId,
        projectId,
        limit,
        offset,
      );

      return history;
    } catch (error) {
      this.logger.error(`Failed to get version history: ${error.message}`);
      throw error;
    }
  }

  /**
   * POST /compare
   * Compare two versions
   */
  @Post('compare')
  @ApiOperation({
    summary: 'Compare versions',
    description: 'Compares two versions and returns detailed differences',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparison completed successfully',
    type: VersionComparison,
  })
  @ApiResponse({ status: 400, description: 'Invalid version IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async compareVersions(
    @Param('projectId') projectId: string,
    @Body() body: { version1Id: string; version2Id: string },
    @CurrentTenant() tenantId: string,
  ): Promise<VersionComparison> {
    try {
      // Validation
      if (!body.version1Id || !body.version2Id) {
        throw new Error('Both version IDs are required');
      }

      if (body.version1Id === body.version2Id) {
        throw new Error('Cannot compare a version with itself');
      }

      const comparison = await this.versionService.compareVersions(
        tenantId,
        body.version1Id,
        body.version2Id,
      );

      // Verify project
      if (comparison.version1Number && comparison.version2Number) {
        // Project access verified via service
      }

      return comparison;
    } catch (error) {
      this.logger.error(`Failed to compare versions: ${error.message}`);
      throw error;
    }
  }

  /**
   * POST /rollback
   * Rollback to previous version
   */
  @Post('rollback')
  @ApiOperation({
    summary: 'Rollback to version',
    description: 'Rolls back the project to a previous version state',
  })
  @ApiResponse({
    status: 200,
    description: 'Rollback completed successfully',
    type: RollbackResult,
  })
  @ApiResponse({ status: 400, description: 'Invalid rollback parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async rollback(
    @Param('projectId') projectId: string,
    @Body() body: RollbackRequest,
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: string,
  ): Promise<RollbackResult> {
    try {
      // Validation
      if (!body.sourceVersionId) {
        throw new Error('Source version ID is required');
      }

      const result = await this.versionService.rollback(
        tenantId,
        projectId,
        body,
        user.id,
      );

      this.logger.log(`Rollback completed: ${result.changesReverted} changes reverted`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to rollback: ${error.message}`);
      throw error;
    }
  }

  /**
   * POST /:versionId/publish
   * Publish version
   */
  @Post(':versionId/publish')
  @ApiOperation({
    summary: 'Publish version',
    description: 'Publishes a version as the current active version',
  })
  @ApiResponse({
    status: 200,
    description: 'Version published successfully',
    type: PublishVersionResponse,
  })
  @ApiResponse({ status: 404, description: 'Version not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async publishVersion(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Body() body: { releaseNotes?: string; tags?: string[] },
    @CurrentUser() user: UserContext,
    @CurrentTenant() tenantId: string,
  ): Promise<PublishVersionResponse> {
    try {
      const result = await this.versionService.publishVersion(
        tenantId,
        {
          versionId,
          releaseNotes: body.releaseNotes,
          tags: body.tags,
          notifyCollaborators: true,
          archivePrevious: true,
        },
        user.id,
      );

      this.logger.log(`Version published: ${result.versionNumber}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to publish version: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /statistics
   * Get version statistics
   */
  @Get(':versionId/statistics')
  @ApiOperation({
    summary: 'Get version statistics',
    description: 'Retrieves analytics and statistics for project versions',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: VersionStatistics,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatistics(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<VersionStatistics> {
    try {
      const stats = await this.versionService.getStatistics(tenantId, projectId);

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /:versionId/changelog
   * Get changelog between versions
   */
  @Get(':versionId/changelog')
  @ApiOperation({
    summary: 'Get changelog',
    description: 'Retrieves detailed changelog for a specific version',
  })
  @ApiResponse({
    status: 200,
    description: 'Changelog retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getChangelog(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Query('format') format: string = 'json',
    @CurrentTenant() tenantId: string,
  ): Promise<any> {
    try {
      // Validation
      if (!['json', 'markdown', 'html'].includes(format)) {
        throw new Error('Format must be json, markdown, or html');
      }

      const version = await this.versionService.getVersion(tenantId, versionId);

      if (version.projectId !== projectId) {
        throw new Error('Version does not belong to this project');
      }

      // Format changelog
      let changelog: any;

      switch (format) {
        case 'markdown':
          changelog = this.formatChangelogMarkdown(version);
          break;
        case 'html':
          changelog = this.formatChangelogHtml(version);
          break;
        default:
          changelog = {
            versionNumber: version.versionNumber,
            versionName: version.versionName,
            description: version.description,
            changes: version.changeSummary,
            timestamp: version.createdAt,
          };
      }

      return changelog;
    } catch (error) {
      this.logger.error(`Failed to get changelog: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /:versionId/diff
   * Get diff between two versions
   */
  @Get(':versionId/diff')
  @ApiOperation({
    summary: 'Get version diff',
    description: 'Gets detailed diff viewer output for a version',
  })
  @ApiResponse({
    status: 200,
    description: 'Diff retrieved successfully',
  })
  async getVersionDiff(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Query('compareWith') compareWith?: string,
    @Query('format') format: string = 'unified',
    @CurrentTenant() tenantId: string,
  ): Promise<any> {
    try {
      const version = await this.versionService.getVersion(tenantId, versionId);

      if (version.projectId !== projectId) {
        throw new Error('Version does not belong to this project');
      }

      if (!compareWith) {
        compareWith = version.parentVersionId;
      }

      if (!compareWith) {
        throw new Error('No version to compare with');
      }

      const comparison = await this.versionService.compareVersions(
        tenantId,
        compareWith,
        versionId,
      );

      return {
        format,
        comparison,
        statistics: comparison.statisticalDifferences,
      };
    } catch (error) {
      this.logger.error(`Failed to get diff: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Format changelog as Markdown
   */
  private formatChangelogMarkdown(version: ProjectVersion): string {
    let md = `# Version ${version.versionNumber}: ${version.versionName}\n\n`;

    if (version.description) {
      md += `${version.description}\n\n`;
    }

    md += `**Release Date:** ${version.createdAt.toLocaleDateString()}\n`;
    md += `**Author:** ${version.author.name}\n\n`;

    md += `## Changes\n\n`;
    md += `- **Shards Created:** ${version.changeSummary.shardsCreated}\n`;
    md += `- **Shards Updated:** ${version.changeSummary.shardsUpdated}\n`;
    md += `- **Shards Deleted:** ${version.changeSummary.shardsDeleted}\n`;
    md += `- **Links Created:** ${version.changeSummary.linksCreated}\n`;
    md += `- **Total Changes:** ${version.changeSummary.totalChanges}\n`;

    return md;
  }

  /**
   * Helper: Format changelog as HTML
   */
  private formatChangelogHtml(version: ProjectVersion): string {
    return `<div class="changelog">
      <h1>Version ${version.versionNumber}: ${version.versionName}</h1>
      <p>${version.description || 'No description'}</p>
      <dl>
        <dt>Release Date</dt>
        <dd>${version.createdAt.toLocaleDateString()}</dd>
        <dt>Author</dt>
        <dd>${version.author.name}</dd>
      </dl>
      <h2>Changes</h2>
      <ul>
        <li>Shards Created: ${version.changeSummary.shardsCreated}</li>
        <li>Shards Updated: ${version.changeSummary.shardsUpdated}</li>
        <li>Shards Deleted: ${version.changeSummary.shardsDeleted}</li>
        <li>Links Created: ${version.changeSummary.linksCreated}</li>
        <li>Total Changes: ${version.changeSummary.totalChanges}</li>
      </ul>
    </div>`;
  }
}
