// @ts-nocheck
/**
 * Recommendation Routes
 * API endpoints for the multi-factor recommendation engine
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseFilters,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RecommendationsService } from '../services/recommendation.service';
import {
  Recommendation,
  RecommendationRequest,
  RecommendationBatch,
  RecommendationExplanation,
  RecommendationStatistics,
  RecommendationQueryParams,
  RecommendationPage,
  UpdateRecommendationWeights,
  BulkRecommendationFeedback,
} from '../types/recommendation.types';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import { UserJWT } from '../types/auth.types';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('api/v1/recommendations')
@UseGuards(AuthGuard, TenantGuard)
@UseFilters(AllExceptionsFilter)
export class RecommendationsController {
  constructor(@Inject(RecommendationsService) private recommendationsService: RecommendationsService) {}

  /**
   * POST /api/v1/recommendations/generate
   * Get multi-factor recommendations for a user in a project
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate multi-factor recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Recommendations generated successfully',
    type: RecommendationBatch,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async generateRecommendations(
    @Body() input: RecommendationRequest,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<RecommendationBatch> {
    const request = {
      ...input,
      userId: input.userId || user.userId,
    };

    return this.recommendationsService.getRecommendations(tenantId, request);
  }

  /**
   * GET /api/v1/recommendations
   * Query recommendations with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Query recommendations' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['confidence', 'createdAt', 'relevance'] })
  @ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Paginated recommendations',
    type: RecommendationPage,
  })
  async queryRecommendations(
    @Query() params: RecommendationQueryParams,
    @CurrentTenant() tenantId: string,
  ): Promise<RecommendationPage> {
    return this.recommendationsService.queryRecommendations(tenantId, params);
  }

  /**
   * GET /api/v1/recommendations/:recommendationId
   * Get a specific recommendation with details
   */
  @Get(':recommendationId')
  @ApiOperation({ summary: 'Get recommendation details' })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Recommendation details',
    type: Recommendation,
  })
  @ApiResponse({
    status: 404,
    description: 'Recommendation not found',
  })
  async getRecommendation(
    @Param('recommendationId') recommendationId: string,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<any> {
    // In production, would fetch from database
    // For now, returning placeholder
    return {
      id: recommendationId,
      projectId,
      message: 'Recommendation details',
    };
  }

  /**
   * GET /api/v1/recommendations/:recommendationId/explain
   * Get detailed explanation for a recommendation
   */
  @Get(':recommendationId/explain')
  @ApiOperation({ summary: 'Explain recommendation' })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Detailed recommendation explanation',
    type: RecommendationExplanation,
  })
  async explainRecommendation(
    @Param('recommendationId') recommendationId: string,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<RecommendationExplanation> {
    return this.recommendationsService.explainRecommendation(tenantId, projectId, recommendationId);
  }

  /**
   * POST /api/v1/recommendations/:recommendationId/feedback
   * Provide feedback on a recommendation (for learning)
   */
  @Post(':recommendationId/feedback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Provide feedback on recommendation' })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation ID' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'feedback', required: true, enum: ['positive', 'negative', 'irrelevant'] })
  @ApiResponse({
    status: 204,
    description: 'Feedback recorded',
  })
  async provideFeedback(
    @Param('recommendationId') recommendationId: string,
    @Query('projectId') projectId: string,
    @Query('feedback') feedback: 'positive' | 'negative' | 'irrelevant',
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    return this.recommendationsService.provideFeedback(tenantId, projectId, recommendationId, feedback);
  }

  /**
   * POST /api/v1/recommendations/feedback/bulk
   * Bulk provide feedback on multiple recommendations
   */
  @Post('feedback/bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk provide feedback' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 204,
    description: 'Feedback recorded for all recommendations',
  })
  async bulkProvideFeedback(
    @Body() input: BulkRecommendationFeedback,
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    for (const rec of input.recommendations) {
      await this.recommendationsService.provideFeedback(tenantId, projectId, rec.id, rec.feedback);
    }
  }

  /**
   * GET /api/v1/recommendations/statistics
   * Get recommendation statistics for a project
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get recommendation statistics' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Recommendation statistics',
    type: RecommendationStatistics,
  })
  async getStatistics(
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<RecommendationStatistics> {
    return this.recommendationsService.getStatistics(tenantId, projectId);
  }
}

/**
 * Admin Routes for Recommendations (super admin only)
 */
@ApiTags('Admin - Recommendations')
@ApiBearerAuth()
@Controller('api/v1/admin/recommendations')
@UseGuards(AuthGuard, TenantGuard)
@UseFilters(AllExceptionsFilter)
export class AdminRecommendationsController {
  constructor(@Inject(RecommendationsService) private recommendationsService: RecommendationsService) {}

  /**
   * PATCH /api/v1/admin/recommendations/algorithm/weights
   * Update recommendation algorithm weights
   */
  @Patch('algorithm/weights')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update algorithm weights' })
  @ApiResponse({
    status: 200,
    description: 'Weights updated successfully',
  })
  async updateAlgorithmWeights(
    @Body() input: UpdateRecommendationWeights,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<{ success: boolean; message: string }> {
    await this.recommendationsService.updateAlgorithmWeights(input);

    return {
      success: true,
      message: 'Algorithm weights updated successfully',
    };
  }

  /**
   * GET /api/v1/admin/recommendations/algorithm/config
   * Get current algorithm configuration
   */
  @Get('algorithm/config')
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get algorithm configuration' })
  @ApiResponse({
    status: 200,
    description: 'Current algorithm configuration',
  })
  async getAlgorithmConfig(@CurrentTenant() tenantId: string): Promise<any> {
    // In production, would fetch from database
    return {
      vectorSearchWeight: 0.5,
      collaborativeWeight: 0.3,
      temporalWeight: 0.2,
      vectorSimilarityThreshold: 0.6,
      minCollaborativeDataPoints: 5,
      temporalDecayDays: 30,
      contentSimilarityThreshold: 0.5,
      batchGenerationFrequency: 6,
      maxRecommendationsPerUser: 20,
      recommendationTTLDays: 7,
      enableFeedbackLearning: true,
      feedbackWeightFactor: 0.1,
    };
  }

  /**
   * POST /api/v1/admin/recommendations/regenerate
   * Force regenerate recommendations for a project
   */
  @Post('regenerate')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Force regenerate all recommendations' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({
    status: 202,
    description: 'Regeneration started',
  })
  async forceRegenerateRecommendations(
    @Query('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserJWT,
  ): Promise<{
    success: boolean;
    jobId: string;
    message: string;
  }> {
    // In production, would queue background job
    return {
      success: true,
      jobId: `job-${projectId}-${Date.now()}`,
      message: 'Recommendation regeneration started',
    };
  }

  /**
   * GET /api/v1/admin/recommendations/metrics
   * Get recommendation system metrics
   */
  @Get('metrics')
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiQuery({ name: 'timeRangeHours', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'System metrics',
  })
  async getSystemMetrics(
    @Query('timeRangeHours') timeRangeHours: number = 24,
    @CurrentTenant() tenantId: string,
  ): Promise<any> {
    // In production, would aggregate from metrics collection
    return {
      averageResponseTimeMs: 245,
      totalRecommendationsGenerated: 5234,
      averageConfidenceScore: 0.72,
      acceptanceRate: 0.65,
      dismissalRate: 0.25,
      irrelevantRate: 0.1,
      cacheHitRate: 0.82,
      timeRange: {
        hours: timeRangeHours,
        from: new Date(Date.now() - timeRangeHours * 60 * 60 * 1000),
        to: new Date(),
      },
    };
  }

  /**
   * POST /api/v1/admin/recommendations/cache/clear
   * Clear recommendation cache
   */
  @Post('cache/clear')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear recommendation cache' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({
    status: 204,
    description: 'Cache cleared',
  })
  async clearCache(
    @Query('projectId') projectId: string | undefined,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    // In production, would clear specific or all cache keys
    // For now, placeholder implementation
  }
}
