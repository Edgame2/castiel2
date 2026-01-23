/**
 * ML Services Initialization
 * 
 * Initializes ML services for dependency injection.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import { Redis } from 'ioredis';
import { CosmosClient, Database } from '@azure/cosmos';
import { FeatureStoreService } from '../ml/feature-store.service.js';
import { ModelService } from '../ml/model.service.js';
import { CalibrationService } from '../ml/calibration.service.js';
import { TrainingService } from '../ml/training.service.js';
import { EvaluationService } from '../ml/evaluation.service.js';
import { SyntheticDataService } from '../ml/synthetic-data.service.js';

export interface MLServices {
  featureStoreService: FeatureStoreService;
  modelService: ModelService;
  calibrationService: CalibrationService;
  trainingService: TrainingService;
  evaluationService: EvaluationService;
  syntheticDataService: SyntheticDataService;
}

export interface MLServicesInitOptions {
  monitoring: IMonitoringProvider;
  shardRepository: ShardRepository;
  redis: Redis | null;
  cosmosClient: CosmosClient;
  database: Database;
  azureMLWorkspaceUrl: string;
  azureMLApiKey?: string;
}

/**
 * Initialize ML services
 */
export async function initializeMLServices(
  options: MLServicesInitOptions
): Promise<MLServices> {
  const {
    monitoring,
    shardRepository,
    redis,
    cosmosClient,
    database,
    azureMLWorkspaceUrl,
    azureMLApiKey,
  } = options;

  // Initialize services
  const featureStoreService = new FeatureStoreService(
    monitoring,
    shardRepository,
    redis,
    cosmosClient,
    database
  );

  const calibrationService = new CalibrationService(
    monitoring,
    cosmosClient,
    database
  );

  const modelService = new ModelService(
    monitoring,
    redis,
    cosmosClient,
    database,
    azureMLWorkspaceUrl,
    azureMLApiKey
  );

  const syntheticDataService = new SyntheticDataService(monitoring);

  const trainingService = new TrainingService(
    monitoring,
    cosmosClient,
    database,
    featureStoreService,
    syntheticDataService,
    azureMLWorkspaceUrl,
    azureMLApiKey
  );

  const evaluationService = new EvaluationService(
    monitoring,
    cosmosClient,
    database
  );

  return {
    featureStoreService,
    modelService,
    calibrationService,
    trainingService,
    evaluationService,
    syntheticDataService,
  };
}
