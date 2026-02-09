/**
 * Configuration Types
 * Per ModuleImplementationGuide Section 4
 */

export interface AuthConfig {
  module: {
    name: string;
    version: string;
  };
  server: {
    port: number;
    host: string;
    base_url?: string;
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
    expiration: string;
    refresh_expiration: string;
  };
  oauth?: {
    google?: {
      enabled: boolean;
      client_id?: string;
      client_secret?: string;
      redirect_uri?: string;
    };
    github?: {
      enabled: boolean;
      client_id?: string;
      client_secret?: string;
      redirect_uri?: string;
    };
  };
  sso?: {
    enabled: boolean;
    saml?: {
      enabled: boolean;
    };
  };
  session?: {
    max_sessions_per_user?: number;
    session_timeout?: number;
    cleanup_interval?: number;
  };
  password?: {
    min_length?: number;
    require_uppercase?: boolean;
    require_lowercase?: boolean;
    require_numbers?: boolean;
    require_symbols?: boolean;
    history_count?: number;
    max_age_days?: number;
  };
  security?: {
    max_login_attempts?: number;
    lockout_duration_ms?: number;
    require_email_verification?: boolean;
  };
  redis?: {
    url?: string;
    sentinels?: string;
    master_name?: string;
  };
  frontend_url?: string;
  services?: {
    user_management?: {
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
    main_app?: {
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
    oauth_google?: boolean;
    oauth_github?: boolean;
    saml_sso?: boolean;
    password_reset?: boolean;
    email_verification?: boolean;
    multi_factor_auth?: boolean;
    api_keys?: boolean;
  };
  rate_limit?: {
    enabled?: boolean;
    window_seconds?: number;
    max_per_window?: number;
  };
}

