/**
 * Configuration types for risk-analytics module
 */

export interface RiskAnalyticsConfig {
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
      evaluations: string;
      snapshots?: string;
      revenue_at_risk: string;
      quotas: string;
      warnings: string;
      simulations: string;
    };
  };
  data_lake?: {
    connection_string: string;
    container: string;
    path_prefix: string;
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
  application_insights?: {
    connection_string: string;
    disable: boolean;
  };
  metrics?: {
    path: string;
    require_auth: boolean;
    bearer_token: string;
  };
}
