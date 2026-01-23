/**
 * Configuration types for data-enrichment module
 */

export interface DataEnrichmentConfig {
  module: {
    name: string;
    version: string;
  };
  server: {
    port: number;
    host: string;
  };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers: {
      enrichment_jobs: string;
      enrichment_results: string;
      vectorization_jobs: string;
      shard_relationships: string;
      shard_acls: string;
    };
  };
  jwt: {
    secret: string;
  };
  services: {
    [key: string]: {
      url: string;
    };
  };
  rabbitmq: {
    url: string;
    exchange: string;
    queue: string;
    bindings: string[];
  };
  features: {
    [key: string]: boolean;
  };
}
