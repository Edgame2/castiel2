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
    organizations?: boolean;
    teams?: boolean;
    rbac?: boolean;
    invitations?: boolean;
    user_analytics?: boolean;
  };
  organization?: {
    max_members?: number;
    allow_public_orgs?: boolean;
    default_role?: string;
  };
  team?: {
    max_members?: number;
    max_teams_per_org?: number;
  };
  invitation?: {
    expiration_days?: number;
    max_pending_per_org?: number;
  };
}

