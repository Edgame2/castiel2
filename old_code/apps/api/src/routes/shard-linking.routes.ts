// @ts-nocheck
/**
 * Shard Linking Routes
 * API endpoints for shard relationship management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseFilters,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ShardLinkingService } from '../services/shard-linking.service';
import {
  ShardLink,
  CreateLinkInput,
  UpdateLinkInput,
  BulkLinkInput,
  BulkLinkResult,
  MultiProjectBulkLinkInput,
  ShardWithLinks,
  LinkQueryParams,
  LinkPage,
  LinkStatistics,
  LinkValidationResult,
  LinkImpactAnalysis,
} from '../types/shard-linking.types';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import { UserJWT } from '../types/auth.types';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

@ApiTags('Shard Linking')
@ApiBearerAuth()
@Controller('api/v1/shards/links')
@UseGuards(AuthGuard, TenantGuard)
@UseFilters(AllExceptionsFilter)
export class ShardLinkingController {
  constructor(@Inject(ShardLinkingService) private shardLinkingService: ShardLinkingService) {}

  /**
   * POST /api/v1/shards/links
   * Create a single link between two shards
   */
  @Post()
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a link between two shards' })
  @ApiResponse({
    status: 201,
    description: 'Link created successfully',
    type: ShardLink,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation error',
  })
  async createLink(
    @Body() input: CreateLinkInput,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<ShardLink> {
    return this.shardLinkingService.createLink(tenantId, input.projectId, input, user.userId);
  }

  /**
   * POST /api/v1/shards/links/bulk
   * Create multiple links in bulk
   */
  @Post('bulk')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create links' })
  @ApiResponse({
    status: 201,
    description: 'Bulk operation completed',
    type: BulkLinkResult,
  })
  async bulkCreateLinks(
    @Body() input: BulkLinkInput,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<BulkLinkResult> {
    return this.shardLinkingService.bulkCreateLinks(tenantId, input, user.userId);
  }

  /**
   * POST /api/v1/shards/links/bulk-multi-project
   * Create links across multiple projects in bulk
   */
  @Post('bulk-multi-project')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create links across multiple projects' })
  @ApiResponse({
    status: 201,
    description: 'Multi-project bulk operation completed',
    type: BulkLinkResult,
  })
  async bulkCreateLinksMultiProject(
    @Body() input: MultiProjectBulkLinkInput,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<BulkLinkResult> {
    return this.shardLinkingService.bulkCreateLinksMultiProject(tenantId, input, user.userId);
  }

  /**
   * GET /api/v1/shards/links/validate
   * Validate a link before creation
   */
  @Get('validate')
  @ApiOperation({ summary: 'Validate link parameters' })
  @ApiQuery({ name: 'fromShardId', required: true })
  @ApiQuery({ name: 'toShardId', required: true })
  @ApiQuery({ name: 'relationshipType', required: true })
  @ApiResponse({
    status: 200,
    description: 'Link validation result',
    type: LinkValidationResult,
  })
  async validateLink(
    @Query('projectId') projectId: string,
    @Query('fromShardId') fromShardId: string,
    @Query('toShardId') toShardId: string,
    @Query('relationshipType') relationshipType: string,
    @CurrentTenant() tenantId: string,
  ): Promise<LinkValidationResult> {
    return this.shardLinkingService.validateLink(tenantId, projectId, {
      projectId,
      fromShardId,
      toShardId,
      relationshipType: relationshipType as any,
    } as any);
  }

  /**
   * GET /api/v1/shards/links/:linkId
   * Get a specific link by ID
   */
  @Get(':linkId')
  @ApiOperation({ summary: 'Get link by ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({
    status: 200,
    description: 'Link details',
    type: ShardLink,
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found',
  })
  async getLink(
    @Param('linkId') linkId: string,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<ShardLink | null> {
    return this.shardLinkingService.getLink(tenantId, projectId, linkId);
  }

  /**
   * GET /api/v1/shards/links
   * Query links with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Query links with filters' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fromShardId', required: false })
  @ApiQuery({ name: 'toShardId', required: false })
  @ApiQuery({ name: 'relationshipTypes', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortDirection', required: false })
  @ApiResponse({
    status: 200,
    description: 'Paginated link results',
    type: LinkPage,
  })
  async getLinks(
    @Query() params: LinkQueryParams & { projectId: string },
    @CurrentTenant() tenantId: string,
  ): Promise<LinkPage> {
    return this.shardLinkingService.getLinks(tenantId, params.projectId, params);
  }

  /**
   * GET /api/v1/shards/:shardId/with-links
   * Get a shard with all its incoming and outgoing links
   */
  @Get('shards/:shardId/with-links')
  @ApiOperation({ summary: 'Get shard with all its links' })
  @ApiParam({ name: 'shardId', description: 'Shard ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Shard with links',
    type: ShardWithLinks,
  })
  async getShardWithLinks(
    @Param('shardId') shardId: string,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<ShardWithLinks | null> {
    return this.shardLinkingService.getShardWithLinks(tenantId, projectId, shardId);
  }

  /**
   * GET /api/v1/shards/links/statistics
   * Get link statistics for a project
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get link statistics' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Link statistics',
    type: LinkStatistics,
  })
  async getLinkStatistics(
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<LinkStatistics> {
    return this.shardLinkingService.getLinkStatistics(tenantId, projectId);
  }

  /**
   * GET /api/v1/shards/links/:linkId/impact
   * Analyze impact of deleting a link
   */
  @Get(':linkId/impact')
  @ApiOperation({ summary: 'Analyze link deletion impact' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Impact analysis',
    type: LinkImpactAnalysis,
  })
  async analyzeLinkImpact(
    @Param('linkId') linkId: string,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<LinkImpactAnalysis> {
    return this.shardLinkingService.analyzeLinkImpact(tenantId, projectId, linkId);
  }

  /**
   * PATCH /api/v1/shards/links/:linkId
   * Update an existing link
   */
  @Patch(':linkId')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a link' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({
    status: 200,
    description: 'Link updated successfully',
    type: ShardLink,
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found',
  })
  async updateLink(
    @Param('linkId') linkId: string,
    @Body() input: UpdateLinkInput,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<ShardLink> {
    return this.shardLinkingService.updateLink(tenantId, projectId, linkId, input, user.userId);
  }

  /**
   * POST /api/v1/shards/links/:linkId/access
   * Record link access/usage
   */
  @Post(':linkId/access')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record link access' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 204,
    description: 'Access recorded',
  })
  async recordLinkAccess(
    @Param('linkId') linkId: string,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    return this.shardLinkingService.recordLinkAccess(tenantId, projectId, linkId);
  }

  /**
   * POST /api/v1/shards/links/:linkId/rate
   * Rate a link
   */
  @Post(':linkId/rate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rate a link' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'rating', required: true, type: Number })
  @ApiResponse({
    status: 204,
    description: 'Link rated',
  })
  async rateLink(
    @Param('linkId') linkId: string,
    @Query('projectId') projectId: string,
    @Query('rating') rating: number,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    return this.shardLinkingService.rateLink(tenantId, projectId, linkId, rating);
  }

  /**
   * DELETE /api/v1/shards/links/:linkId
   * Delete a link
   */
  @Delete(':linkId')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a link' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 204,
    description: 'Link deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Link not found',
  })
  async deleteLink(
    @Param('linkId') linkId: string,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<void> {
    return this.shardLinkingService.deleteLink(tenantId, projectId, linkId, user.userId);
  }
}

/**
 * Admin Routes for Shard Linking (super admin only)
 */
@ApiTags('Admin - Shard Linking')
@ApiBearerAuth()
@Controller('api/v1/admin/shards/links')
@UseGuards(AuthGuard, TenantGuard)
@UseFilters(AllExceptionsFilter)
export class AdminShardLinkingController {
  constructor(@Inject(ShardLinkingService) private shardLinkingService: ShardLinkingService) {}

  /**
   * GET /api/v1/admin/shards/links/export
   * Export all links for a project (CSV/JSON)
   */
  @Get('export')
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Export links for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  @ApiResponse({
    status: 200,
    description: 'Links exported as file',
  })
  async exportLinks(
    @Query('projectId') projectId: string,
    @Query('format') format: 'csv' | 'json' = 'json',
    @CurrentTenant() tenantId: string,
  ): Promise<any> {
    const page = await this.shardLinkingService.getLinks(tenantId, projectId, { limit: 999999 });

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['linkId', 'fromShardId', 'toShardId', 'relationshipType', 'strength', 'bidirectional', 'createdAt'];
      const rows = page.items.map((link) => [
        link.id,
        link.fromShardId,
        link.toShardId,
        link.relationshipType,
        link.strength,
        link.isBidirectional,
        link.createdAt,
      ]);

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      return {
        filename: `links-${projectId}-${Date.now()}.csv`,
        content: csv,
        contentType: 'text/csv',
      };
    }

    return {
      filename: `links-${projectId}-${Date.now()}.json`,
      content: JSON.stringify(page.items, null, 2),
      contentType: 'application/json',
    };
  }

  /**
   * POST /api/v1/admin/shards/links/cleanup
   * Clean up orphaned or invalid links
   */
  @Post('cleanup')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up orphaned links' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed',
  })
  async cleanupOrphanedLinks(
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<{ cleanedUp: number; errors: string[] }> {
    // In production, would implement cleanup logic
    // For now, returning template response
    return {
      cleanedUp: 0,
      errors: [],
    };
  }

  /**
   * PATCH /api/v1/admin/shards/links/:linkId/force-update
   * Force update a link bypassing normal validation
   */
  @Patch(':linkId/force-update')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force update a link (admin)' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Link force updated',
    type: ShardLink,
  })
  async forceUpdateLink(
    @Param('linkId') linkId: string,
    @Body() input: Partial<ShardLink>,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<ShardLink> {
    // In production, would implement force update with audit logging
    return this.shardLinkingService.updateLink(
      tenantId,
      projectId,
      linkId,
      input as UpdateLinkInput,
      user.userId,
    );
  }
}
