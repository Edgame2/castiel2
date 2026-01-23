/**
 * Configuration types for integration-sync module
 */

export interface AiAnalyticsConfig {
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
      events: string;
      models: string;
      feedback: string;
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
