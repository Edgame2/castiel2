/**
 * Configuration types for ai-conversation module
 */

export interface AIConversationConfig {
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
      conversations: string;
      messages: string;
      contexts: string;
      citations: string;
    };
  };
  jwt: {
    secret: string;
  };
  services: {
    auth?: { url: string };
    logging?: { url: string };
    user_management?: { url: string };
    ai_service?: { url: string };
    context_service?: { url: string };
    shard_manager?: { url: string };
    embeddings?: { url: string };
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
