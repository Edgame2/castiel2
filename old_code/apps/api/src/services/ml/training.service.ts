/**
 * Training Service
 * 
 * Orchestrates model training via Azure ML Workspace.
 * Handles dataset preparation, feature version pinning, job monitoring, and model registration.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { CosmosClient, Database } from '@azure/cosmos';
import { FeatureStoreService } from './feature-store.service.js';
import { SyntheticDataService } from './synthetic-data.service.js';
import type {
  ModelType,
  TrainingJob,
  TrainingJobOptions,
  MLModel,
} from '../../types/ml.types.js';

export class TrainingService {
  constructor(
    private monitoring: IMonitoringProvider,
    private cosmosClient: CosmosClient,
    private database: Database,
    private featureStoreService: FeatureStoreService,
    private syntheticDataService: SyntheticDataService,
    private azureMLWorkspaceUrl: string,
    private azureMLApiKey?: string
  ) {}

  /**
   * Schedule a training job
   */
  async scheduleTraining(
    tenantId: string,
    options: TrainingJobOptions
  ): Promise<TrainingJob> {
    const startTime = Date.now();

    try {
      // Pin feature versions for this training job
      const featureSchema = await this.featureStoreService.getFeatureSchema();
      const featureNames = Object.keys(featureSchema);
      const pinnedVersions = await this.featureStoreService.pinFeatureVersions(
        `job-${Date.now()}`,
        featureNames
      );

      // Prepare training dataset
      const dataset = await this.prepareTrainingData(tenantId, options.modelType);

      // Apply synthetic data augmentation if requested
      let finalDataset = dataset;
      if (options.useSyntheticData) {
        const syntheticResult = await this.syntheticDataService.generateSyntheticData(
          dataset,
          {
            method: 'smote',
            ratio: options.syntheticDataRatio || 0.3,
          }
        );
        finalDataset = syntheticResult.dataset;
      }

      // Export to Azure ML Datastore
      const datastorePath = await this.exportToAzureMLDatastore(
        finalDataset,
        options.modelType
      );

      // Submit Azure ML training job
      const azureMLJobId = await this.submitAzureMLTrainingJob(
        options,
        datastorePath,
        pinnedVersions
      );

      // Create training job record
      const trainingJob: TrainingJob = {
        id: `job-${Date.now()}`,
        tenantId,
        jobId: azureMLJobId,
        modelType: options.modelType,
        status: 'queued',
        pinnedFeatureVersions: pinnedVersions,
        trainingExamples: finalDataset.length,
        validationExamples: Math.floor(finalDataset.length * 0.2),
        syntheticDataRatio: options.useSyntheticData ? (options.syntheticDataRatio || 0.3) : undefined,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store training job in Cosmos DB
      await this.storeTrainingJob(trainingJob);

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('ml.training.job_scheduled', 1, {
        modelType: options.modelType,
        tenantId,
      });

      return trainingJob;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'training_service.schedule_training',
        tenantId,
        modelType: options.modelType,
      });
      throw error;
    }
  }

  /**
   * Get training job status
   */
  async getTrainingStatus(jobId: string, tenantId: string): Promise<TrainingJob> {
    try {
      const container = this.database.container('ml_training_jobs');
      const query = {
        query: 'SELECT * FROM c WHERE c.jobId = @jobId AND c.tenantId = @tenantId',
        parameters: [
          { name: '@jobId', value: jobId },
          { name: '@tenantId', value: tenantId },
        ],
      };

      const { resources } = await container.items.query(query).fetchAll();
      
      if (resources.length === 0) {
        throw new Error(`Training job not found: ${jobId}`);
      }

      const job = resources[0] as TrainingJob;

      // Check Azure ML job status
      const azureMLStatus = await this.checkAzureMLJobStatus(job.jobId);
      
      // Update job status if changed
      if (azureMLStatus !== job.status) {
        job.status = azureMLStatus;
        job.updatedAt = new Date();
        
        if (azureMLStatus === 'completed') {
          job.completedAt = new Date();
        }
        
        await this.storeTrainingJob(job);
      }

      return job;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'training_service.get_status',
        jobId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Register trained model to Azure ML Registry
   */
  async registerModel(
    modelId: string,
    modelType: ModelType,
    tenantId: string
  ): Promise<MLModel> {
    try {
      // Get model from Azure ML Registry
      const azureMLModel = await this.getAzureMLModel(modelId);

      // Sync model metadata to Cosmos DB
      const model: MLModel = {
        id: modelId,
        name: azureMLModel.name,
        modelType,
        version: azureMLModel.version,
        scope: azureMLModel.scope || 'global',
        industryId: azureMLModel.industryId,
        azureMLModelId: modelId,
        endpointUrl: azureMLModel.endpointUrl,
        endpointName: azureMLModel.endpointName,
        parentModelId: azureMLModel.parentModelId,
        performanceImprovement: azureMLModel.performanceImprovement,
        trainingDate: new Date(azureMLModel.trainingDate),
        metrics: azureMLModel.metrics,
        trainingExamples: azureMLModel.trainingExamples,
        validationExamples: azureMLModel.validationExamples,
        trainingDurationMs: azureMLModel.trainingDurationMs,
        status: 'active',
        isDefault: azureMLModel.isDefault || false,
        abTestTraffic: 0,
        featureVersions: azureMLModel.featureVersions,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId,
      };

      await this.syncModelMetadata(model);

      this.monitoring.trackMetric('ml.training.model_registered', 1, {
        modelId,
        modelType,
        tenantId,
      });

      return model;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'training_service.register_model',
        modelId,
        modelType,
        tenantId,
      });
      throw error;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Prepare training dataset
   */
  private async prepareTrainingData(
    tenantId: string,
    modelType: ModelType
  ): Promise<Array<{ features: Record<string, unknown>; label: unknown }>> {
    // Query opportunities with outcomes (won/lost)
    // This is simplified - in production, query Cosmos DB for historical data
    const container = this.database.container('shards');
    
    const query = {
      query: 'SELECT * FROM c WHERE c.shardType = @shardType AND c.tenantId = @tenantId AND (c.structuredData.status = @statusWon OR c.structuredData.status = @statusLost)',
      parameters: [
        { name: '@shardType', value: 'c_opportunity' },
        { name: '@tenantId', value: tenantId },
        { name: '@statusWon', value: 'won' },
        { name: '@statusLost', value: 'lost' },
      ],
    };

    const { resources } = await container.items.query(query).fetchAll();

    // Extract features and labels
    const dataset: Array<{ features: Record<string, unknown>; label: unknown }> = [];

    for (const opportunity of resources) {
      const features = await this.featureStoreService.extractFeatures(
        opportunity.id,
        tenantId
      );

      const label = this.getLabel(opportunity, modelType);

      dataset.push({
        features: features.features,
        label,
      });
    }

    return dataset;
  }

  /**
   * Get label for training example
   */
  private getLabel(opportunity: any, modelType: ModelType): unknown {
    const structuredData = opportunity.structuredData || {};

    switch (modelType) {
      case 'risk_scoring':
        // For risk scoring, use risk snapshot if available
        // Otherwise, use outcome (won = low risk, lost = high risk)
        return structuredData.status === 'won' ? 0.2 : 0.8;
      
      case 'forecasting':
        // For forecasting, use actual revenue
        return structuredData.actualRevenue || structuredData.dealValue || 0;
      
      case 'recommendations':
        // For recommendations, use engagement/click data
        return structuredData.engagementScore || 0;
      
      default:
        return null;
    }
  }

  /**
   * Export dataset to Azure ML Datastore
   */
  private async exportToAzureMLDatastore(
    dataset: Array<{ features: Record<string, unknown>; label: unknown }>,
    modelType: ModelType
  ): Promise<string> {
    // For Phase 1, this is a placeholder
    // In production, upload to Azure ML Datastore via SDK or REST API
    const datastorePath = `datastore://default/${modelType}/training-${Date.now()}.parquet`;
    
    this.monitoring.trackMetric('ml.training.dataset_exported', dataset.length, {
      modelType,
      datastorePath,
    });

    return datastorePath;
  }

  /**
   * Submit Azure ML training job
   */
  private async submitAzureMLTrainingJob(
    options: TrainingJobOptions,
    datastorePath: string,
    pinnedVersions: Record<string, string>
  ): Promise<string> {
    // For Phase 1, this is a placeholder
    // In production, use Azure ML SDK to submit AutoML training job
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    this.monitoring.trackMetric('ml.training.job_submitted', 1, {
      modelType: options.modelType,
      jobId,
    });

    return jobId;
  }

  /**
   * Check Azure ML job status
   */
  private async checkAzureMLJobStatus(azureMLJobId: string): Promise<TrainingJob['status']> {
    // For Phase 1, this is a placeholder
    // In production, query Azure ML SDK for job status
    return 'queued';
  }

  /**
   * Get model from Azure ML Registry
   */
  private async getAzureMLModel(modelId: string): Promise<Partial<MLModel>> {
    // For Phase 1, this is a placeholder
    // In production, use Azure ML SDK to get model from registry
    return {
      id: modelId,
      name: `model-${modelId}`,
      version: '1.0.0',
      endpointUrl: `${this.azureMLWorkspaceUrl}/endpoints/model-${modelId}`,
      endpointName: `endpoint-${modelId}`,
      metrics: {},
      trainingExamples: 0,
      validationExamples: 0,
      trainingDurationMs: 0,
    };
  }

  /**
   * Store training job in Cosmos DB
   */
  private async storeTrainingJob(job: TrainingJob): Promise<void> {
    const container = this.database.container('ml_training_jobs');
    await container.items.upsert(job);
  }

  /**
   * Sync model metadata to Cosmos DB
   */
  private async syncModelMetadata(model: MLModel): Promise<void> {
    const container = this.database.container('ml_models');
    await container.items.upsert(model);
  }
}
