/**
 * Configuration Types
 * Per ModuleImplementationGuide Section 4
 */

export interface UserManagementConfig {
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
    containers?: Record<string, string>;
  };
  database: {
    url: string;
    pool_size?: number;
  };
  jwt: {
    secret: string;
  };
  services?: {
    auth?: {
      url: string;
    };
    logging?: {
      url: string;
    };
    notification?: {
      url: string;
    };
    secret_management?: {
      url: string;
    };
  };
  rabbitmq: {
    url: string;
    exchange: string;
    queue: string;
    bindings?: string[];
  };
  features?: {
    user_profiles?: boolean;
    teams?: boolean;
    rbac?: boolean;
    invitations?: boolean;
    user_analytics?: boolean;
  };
  team?: {
    max_members?: number;
    max_teams_per_tenant?: number;
  };
  invitation?: {
    expiration_days?: number;
    max_pending_per_tenant?: number;
  };
}

