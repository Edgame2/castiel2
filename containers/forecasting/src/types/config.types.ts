/**
 * Configuration types for forecasting module
 */

export interface ForecastingConfig {
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
      decompositions: string;
      consensus: string;
      commitments: string;
      pipeline_health: string;
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
