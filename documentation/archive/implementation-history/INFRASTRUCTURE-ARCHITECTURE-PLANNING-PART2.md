# Infrastructure & Architecture Planning Specification - Part 2
## Database Architecture, Decision Framework, IaC, Cost Management

**Continuation of INFRASTRUCTURE-ARCHITECTURE-PLANNING-SPECIFICATION.md**

---

## 5. DATABASE ARCHITECTURE PLANNING

### 5.1 Database Selection Framework

```typescript
interface DatabaseConfig {
  // Database type and selection
  type: DatabaseType;
  technology: DatabaseTechnology;
  
  // Deployment configuration
  deployment: DatabaseDeployment;
  
  // Schema/structure
  schema?: DatabaseSchemaConfig;
  
  // Performance
  performance: DatabasePerformanceConfig;
  
  // High availability
  highAvailability: DatabaseHAConfig;
  
  // Backup and disaster recovery
  backup: DatabaseBackupConfig;
  
  // Security
  security: DatabaseSecurityConfig;
  
  // Monitoring
  monitoring: DatabaseMonitoringConfig;
  
  // Cost estimation
  estimatedCost: CostEstimate;
}

type DatabaseType = 
  | 'relational'
  | 'document'
  | 'key_value'
  | 'graph'
  | 'time_series'
  | 'search'
  | 'data_warehouse'
  | 'vector';

type DatabaseTechnology = 
  // Relational
  | 'postgresql' | 'mysql' | 'mariadb' | 'sql_server' | 'oracle'
  // Document
  | 'mongodb' | 'cosmosdb' | 'dynamodb' | 'firestore' | 'couchdb'
  // Key-Value
  | 'redis' | 'memcached' | 'etcd'
  // Graph
  | 'neo4j' | 'neptune' | 'cosmosdb_gremlin' | 'arangodb'
  // Time Series
  | 'influxdb' | 'timescaledb' | 'prometheus' | 'questdb'
  // Search
  | 'elasticsearch' | 'opensearch' | 'solr' | 'meilisearch'
  // Data Warehouse
  | 'snowflake' | 'bigquery' | 'redshift' | 'synapse' | 'databricks'
  // Vector
  | 'pinecone' | 'weaviate' | 'milvus' | 'qdrant' | 'pgvector';

interface DatabaseSelectionCriteria {
  // Data model requirements
  dataModel: {
    type: 'structured' | 'semi_structured' | 'unstructured' | 'graph' | 'time_series';
    relationships: 'none' | 'simple' | 'complex' | 'highly_connected';
    schemaFlexibility: 'rigid' | 'flexible' | 'schemaless';
  };
  
  // Query patterns
  queryPatterns: {
    readHeavy: boolean;
    writeHeavy: boolean;
    complexQueries: boolean;
    fullTextSearch: boolean;
    aggregations: boolean;
    realTimeAnalytics: boolean;
    graphTraversals: boolean;
    timeRangeQueries: boolean;
  };
  
  // Scale requirements
  scale: {
    dataSize: 'small' | 'medium' | 'large' | 'massive';  // <1GB, 1-100GB, 100GB-10TB, >10TB
    readThroughput: number;  // Reads per second
    writeThroughput: number; // Writes per second
    concurrentConnections: number;
  };
  
  // Performance requirements
  performance: {
    readLatency: 'ultra_low' | 'low' | 'medium' | 'high';  // <1ms, <10ms, <100ms, >100ms
    writeLatency: 'ultra_low' | 'low' | 'medium' | 'high';
    consistency: 'strong' | 'eventual' | 'causal';
  };
  
  // Operational requirements
  operational: {
    managedPreferred: boolean;
    multiRegion: boolean;
    highAvailability: boolean;
    autoScaling: boolean;
    backupRetention: number;  // Days
  };
  
  // Budget
  budget: {
    monthlyBudget: number;
    optimizeFor: 'cost' | 'performance' | 'balanced';
  };
}

const DATABASE_SELECTION_MATRIX: DatabaseSelectionMatrix = {
  relational: {
    postgresql: {
      strengths: ['ACID compliance', 'Complex queries', 'JSON support', 'Extensions', 'PostGIS'],
      weaknesses: ['Horizontal scaling complexity', 'Not ideal for high write throughput'],
      bestFor: ['OLTP workloads', 'Complex queries', 'Geospatial data', 'Mixed workloads'],
      avoidFor: ['Simple key-value lookups', 'Massive write throughput', 'Unstructured data'],
      managedOptions: {
        azure: 'Azure Database for PostgreSQL',
        aws: 'RDS PostgreSQL / Aurora PostgreSQL',
        gcp: 'Cloud SQL PostgreSQL / AlloyDB',
      },
      maxScale: {
        storage: '128TB',
        connections: '5000',
        iops: '80000',
      },
    },
    mysql: {
      strengths: ['Widely adopted', 'Read replication', 'Simple to operate', 'Large community'],
      weaknesses: ['Weaker JSON support', 'Limited window functions'],
      bestFor: ['Web applications', 'Read-heavy workloads', 'Simple CRUD'],
      avoidFor: ['Complex analytics', 'Heavy JSON usage'],
      managedOptions: {
        azure: 'Azure Database for MySQL',
        aws: 'RDS MySQL / Aurora MySQL',
        gcp: 'Cloud SQL MySQL',
      },
    },
    sql_server: {
      strengths: ['Enterprise features', 'BI integration', 'CLR integration', '.NET integration'],
      weaknesses: ['Licensing costs', 'Windows-centric'],
      bestFor: ['Enterprise applications', '.NET ecosystem', 'BI workloads'],
      avoidFor: ['Cost-sensitive projects', 'Linux-first environments'],
      managedOptions: {
        azure: 'Azure SQL Database / SQL Managed Instance',
        aws: 'RDS SQL Server',
        gcp: 'Cloud SQL SQL Server',
      },
    },
  },
  
  document: {
    mongodb: {
      strengths: ['Flexible schema', 'Horizontal scaling', 'Rich query language', 'Aggregation framework'],
      weaknesses: ['No ACID across documents (pre-4.0)', 'Memory usage', 'Complex transactions'],
      bestFor: ['Content management', 'Catalogs', 'User profiles', 'Real-time analytics'],
      avoidFor: ['Complex transactions', 'Highly relational data'],
      managedOptions: {
        azure: 'Cosmos DB (MongoDB API)',
        aws: 'DocumentDB / MongoDB Atlas',
        gcp: 'MongoDB Atlas',
      },
    },
    cosmosdb: {
      strengths: ['Multi-model', 'Global distribution', 'Guaranteed latency', 'Multiple APIs'],
      weaknesses: ['Cost at scale', 'Vendor lock-in', 'Complex pricing'],
      bestFor: ['Global applications', 'Multi-region', 'Mixed workloads'],
      avoidFor: ['Cost-sensitive projects', 'Single region'],
      managedOptions: {
        azure: 'Cosmos DB',
        aws: 'N/A (use DynamoDB)',
        gcp: 'N/A (use Firestore)',
      },
    },
    dynamodb: {
      strengths: ['Serverless', 'Predictable performance', 'Auto-scaling', 'Global tables'],
      weaknesses: ['Limited query flexibility', 'No complex joins', 'AWS lock-in'],
      bestFor: ['Key-value access', 'High throughput', 'Serverless architectures'],
      avoidFor: ['Complex queries', 'Ad-hoc analytics', 'Multi-cloud'],
      managedOptions: {
        aws: 'DynamoDB',
      },
    },
  },
  
  key_value: {
    redis: {
      strengths: ['Ultra-fast', 'Rich data structures', 'Pub/sub', 'Lua scripting'],
      weaknesses: ['Memory-bound', 'Limited persistence options'],
      bestFor: ['Caching', 'Session storage', 'Real-time leaderboards', 'Pub/sub'],
      avoidFor: ['Large datasets', 'Complex queries', 'Primary data store'],
      managedOptions: {
        azure: 'Azure Cache for Redis',
        aws: 'ElastiCache Redis',
        gcp: 'Memorystore for Redis',
      },
    },
  },
  
  graph: {
    neo4j: {
      strengths: ['Native graph', 'Cypher query language', 'Visualization', 'ACID compliant'],
      weaknesses: ['Scaling complexity', 'Cost at scale', 'Learning curve'],
      bestFor: ['Social networks', 'Recommendation engines', 'Fraud detection', 'Knowledge graphs'],
      avoidFor: ['Simple lookups', 'Time-series data', 'Document storage'],
      managedOptions: {
        azure: 'Neo4j AuraDB',
        aws: 'Neo4j AuraDB / Neptune',
        gcp: 'Neo4j AuraDB',
      },
    },
    neptune: {
      strengths: ['Managed', 'Multi-model (Gremlin/SPARQL)', 'AWS integration'],
      weaknesses: ['AWS lock-in', 'Less mature than Neo4j'],
      bestFor: ['AWS-native applications', 'Knowledge graphs', 'Identity graphs'],
      avoidFor: ['Multi-cloud', 'Complex graph algorithms'],
      managedOptions: {
        aws: 'Neptune',
      },
    },
  },
  
  time_series: {
    timescaledb: {
      strengths: ['PostgreSQL compatible', 'SQL support', 'Compression', 'Continuous aggregates'],
      weaknesses: ['Learning curve', 'Resource usage'],
      bestFor: ['IoT data', 'Metrics', 'Financial data', 'Event logging'],
      avoidFor: ['Simple metrics (use Prometheus)', 'Real-time only'],
      managedOptions: {
        azure: 'Timescale Cloud',
        aws: 'Timescale Cloud',
        gcp: 'Timescale Cloud',
      },
    },
    influxdb: {
      strengths: ['Purpose-built', 'High ingest rate', 'InfluxQL/Flux', 'Downsampling'],
      weaknesses: ['Query language learning', 'Cardinality limits'],
      bestFor: ['Metrics', 'Monitoring', 'IoT', 'Real-time analytics'],
      avoidFor: ['Complex joins', 'Transactional data'],
      managedOptions: {
        azure: 'InfluxDB Cloud',
        aws: 'InfluxDB Cloud / Timestream',
        gcp: 'InfluxDB Cloud',
      },
    },
  },
  
  search: {
    elasticsearch: {
      strengths: ['Full-text search', 'Analytics', 'Log aggregation', 'Scalability'],
      weaknesses: ['Resource intensive', 'Operational complexity', 'No ACID'],
      bestFor: ['Search', 'Log analytics', 'APM', 'Security analytics'],
      avoidFor: ['Primary data store', 'Transactional workloads'],
      managedOptions: {
        azure: 'Elastic Cloud',
        aws: 'OpenSearch Service / Elastic Cloud',
        gcp: 'Elastic Cloud',
      },
    },
    opensearch: {
      strengths: ['Elasticsearch fork', 'Open source', 'AWS native', 'Lower cost'],
      weaknesses: ['Feature lag vs Elasticsearch', 'Less ecosystem'],
      bestFor: ['Search', 'Logs', 'AWS-native applications'],
      avoidFor: ['Cutting-edge features', 'Non-AWS environments'],
      managedOptions: {
        aws: 'OpenSearch Service',
      },
    },
  },
  
  data_warehouse: {
    snowflake: {
      strengths: ['Separation of compute/storage', 'Multi-cloud', 'Zero-copy cloning', 'Time travel'],
      weaknesses: ['Cost management complexity', 'Vendor lock-in'],
      bestFor: ['Analytics', 'Data sharing', 'Multi-cloud', 'Variable workloads'],
      avoidFor: ['OLTP', 'Real-time requirements'],
      managedOptions: {
        azure: 'Snowflake on Azure',
        aws: 'Snowflake on AWS',
        gcp: 'Snowflake on GCP',
      },
    },
    bigquery: {
      strengths: ['Serverless', 'Petabyte scale', 'ML integration', 'Geospatial'],
      weaknesses: ['GCP lock-in', 'Cost for frequent small queries'],
      bestFor: ['Large-scale analytics', 'ML workloads', 'GCP ecosystem'],
      avoidFor: ['Multi-cloud', 'Frequent small queries', 'OLTP'],
      managedOptions: {
        gcp: 'BigQuery',
      },
    },
    redshift: {
      strengths: ['AWS integration', 'Mature', 'Spectrum for S3', 'Good performance'],
      weaknesses: ['Cluster management', 'AWS lock-in', 'Concurrency limits'],
      bestFor: ['AWS-native analytics', 'BI workloads', 'Data lake queries'],
      avoidFor: ['Multi-cloud', 'Variable workloads', 'High concurrency'],
      managedOptions: {
        aws: 'Redshift / Redshift Serverless',
      },
    },
  },
};

class DatabaseSelectionEngine {
  /**
   * Recommend database based on requirements
   */
  async recommendDatabase(
    criteria: DatabaseSelectionCriteria
  ): Promise<DatabaseRecommendation[]> {
    const recommendations: DatabaseRecommendation[] = [];
    
    // Score each database against criteria
    for (const [type, technologies] of Object.entries(DATABASE_SELECTION_MATRIX)) {
      for (const [tech, details] of Object.entries(technologies)) {
        const score = this.calculateScore(criteria, details);
        
        if (score > 0.5) {  // Minimum threshold
          recommendations.push({
            type: type as DatabaseType,
            technology: tech as DatabaseTechnology,
            score,
            reasons: this.getMatchReasons(criteria, details),
            concerns: this.getConcerns(criteria, details),
            managedOptions: details.managedOptions,
            estimatedCost: await this.estimateCost(criteria, tech),
          });
        }
      }
    }
    
    // Sort by score
    return recommendations.sort((a, b) => b.score - a.score);
  }
}
```

### 5.2 Database Deployment Configuration

```typescript
interface DatabaseDeployment {
  // Deployment type
  type: 'managed' | 'self_managed' | 'containerized';
  
  // Cloud provider specifics
  provider: CloudProvider;
  service: string;
  
  // Sizing
  sizing: DatabaseSizing;
  
  // Networking
  networking: DatabaseNetworking;
  
  // Replication
  replication: ReplicationConfig;
}

interface DatabaseSizing {
  // Compute
  tier: string;  // Provider-specific tier name
  vcores?: number;
  memory?: string;
  
  // Storage
  storage: {
    type: 'ssd' | 'premium_ssd' | 'standard' | 'io_optimized';
    sizeGB: number;
    iops?: number;
    throughput?: string;
    autoGrow: boolean;
    maxSizeGB?: number;
  };
  
  // Recommendations
  recommendation: {
    basedOn: string;
    nextTierTrigger: string;
    costOptimization: string[];
  };
}

interface DatabaseNetworking {
  // Connectivity
  publicAccess: boolean;
  privateEndpoint: boolean;
  vnetIntegration: boolean;
  
  // Firewall
  firewallRules: FirewallRule[];
  
  // SSL/TLS
  sslMode: 'require' | 'prefer' | 'disable';
  minTlsVersion: '1.2' | '1.3';
  
  // Connection pooling
  connectionPooling: {
    enabled: boolean;
    pooler: 'pgbouncer' | 'proxysql' | 'native' | 'none';
    maxConnections: number;
    idleTimeout: number;
  };
}

interface ReplicationConfig {
  // Type
  type: 'none' | 'sync' | 'async' | 'semi_sync';
  
  // Read replicas
  readReplicas: {
    count: number;
    regions: string[];
    loadBalancing: boolean;
  };
  
  // Multi-region / Global distribution
  multiRegion: {
    enabled: boolean;
    primaryRegion: string;
    secondaryRegions: string[];
    failoverMode: 'automatic' | 'manual';
    conflictResolution?: 'last_write_wins' | 'custom';
  };
}
```

### 5.3 Database-Specific Configurations

```typescript
// PostgreSQL specific
interface PostgreSQLConfig extends DatabaseConfig {
  // Version
  version: '16' | '15' | '14' | '13';
  
  // Extensions
  extensions: PostgreSQLExtension[];
  
  // Parameters
  parameters: {
    max_connections: number;
    shared_buffers: string;
    effective_cache_size: string;
    work_mem: string;
    maintenance_work_mem: string;
    wal_buffers: string;
    checkpoint_completion_target: number;
    random_page_cost: number;
    effective_io_concurrency: number;
    default_statistics_target: number;
  };
  
  // Logical replication
  logicalReplication: {
    enabled: boolean;
    publications: string[];
    subscriptions: string[];
  };
}

type PostgreSQLExtension = 
  | 'postgis' | 'pgvector' | 'pg_trgm' | 'uuid-ossp' | 'hstore'
  | 'pg_stat_statements' | 'pgcrypto' | 'citext' | 'ltree'
  | 'timescaledb' | 'citus';

// MongoDB specific
interface MongoDBConfig extends DatabaseConfig {
  // Version
  version: '7.0' | '6.0' | '5.0';
  
  // Cluster type
  clusterType: 'replica_set' | 'sharded';
  
  // Sharding
  sharding?: {
    shardKey: string;
    strategy: 'hashed' | 'ranged';
    numShards: number;
  };
  
  // Indexes
  indexes: MongoDBIndex[];
  
  // Read/Write concerns
  readConcern: 'local' | 'available' | 'majority' | 'linearizable';
  writeConcern: {
    w: number | 'majority';
    j: boolean;
    wtimeout: number;
  };
}

// Redis specific
interface RedisConfig extends DatabaseConfig {
  // Version
  version: '7.2' | '7.0' | '6.2';
  
  // Cluster mode
  clusterMode: boolean;
  
  // Persistence
  persistence: {
    type: 'none' | 'rdb' | 'aof' | 'both';
    rdbFrequency?: string;
    aofPolicy?: 'always' | 'everysec' | 'no';
  };
  
  // Eviction policy
  evictionPolicy: 'noeviction' | 'allkeys-lru' | 'volatile-lru' | 'allkeys-random' | 'volatile-random' | 'volatile-ttl';
  
  // Memory
  maxMemory: string;
  maxMemoryPolicy: string;
}

// Elasticsearch specific
interface ElasticsearchConfig extends DatabaseConfig {
  // Version
  version: '8.x' | '7.x';
  
  // Cluster topology
  topology: {
    masterNodes: number;
    dataNodes: number;
    coordinatingNodes?: number;
    ingestNodes?: number;
  };
  
  // Index settings
  indexSettings: {
    numberOfShards: number;
    numberOfReplicas: number;
    refreshInterval: string;
  };
  
  // ILM policies
  ilmPolicies: ILMPolicy[];
  
  // Security
  securityEnabled: boolean;
}
```

---

## 6. ARCHITECTURE DECISION FRAMEWORK

### 6.1 Decision Records

```typescript
interface ArchitectureDecisionRecord {
  id: string;
  planId: string;
  
  // Decision identification
  title: string;
  date: Date;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  supersededBy?: string;
  
  // Context
  context: string;
  
  // Decision
  decision: string;
  
  // Consequences
  consequences: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  
  // Alternatives considered
  alternatives: AlternativeConsidered[];
  
  // Related decisions
  relatedDecisions: string[];
  
  // Metadata
  deciders: string[];
  reviewers: string[];
  tags: string[];
}

interface AlternativeConsidered {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  whyNotChosen: string;
}
```

### 6.2 Technology Selection Matrix

```typescript
interface TechnologySelectionMatrix {
  category: string;
  criteria: SelectionCriterion[];
  options: TechnologyOption[];
  recommendation: string;
  decisionRationale: string;
}

interface SelectionCriterion {
  name: string;
  weight: number;  // 1-10
  description: string;
}

interface TechnologyOption {
  name: string;
  scores: Record<string, number>;  // criterion name -> score (1-10)
  totalScore: number;
  pros: string[];
  cons: string[];
}

// Pre-built selection matrices
const TECHNOLOGY_SELECTION_MATRICES = {
  // Frontend Framework Selection
  frontend_framework: {
    category: 'Frontend Framework',
    criteria: [
      { name: 'Performance', weight: 8, description: 'Runtime performance and bundle size' },
      { name: 'Developer Experience', weight: 9, description: 'Ease of development and debugging' },
      { name: 'Ecosystem', weight: 8, description: 'Libraries, tools, and community support' },
      { name: 'Learning Curve', weight: 6, description: 'Time to become productive' },
      { name: 'Enterprise Support', weight: 7, description: 'Commercial support and stability' },
      { name: 'TypeScript Support', weight: 9, description: 'Type safety integration' },
      { name: 'Testing', weight: 7, description: 'Testing tools and practices' },
    ],
    options: [
      {
        name: 'React',
        scores: { 'Performance': 8, 'Developer Experience': 9, 'Ecosystem': 10, 'Learning Curve': 7, 'Enterprise Support': 9, 'TypeScript Support': 9, 'Testing': 9 },
        pros: ['Largest ecosystem', 'Flexible', 'Strong community', 'Many job opportunities'],
        cons: ['Not opinionated', 'Decision fatigue', 'Frequent changes'],
      },
      {
        name: 'Vue',
        scores: { 'Performance': 9, 'Developer Experience': 9, 'Ecosystem': 8, 'Learning Curve': 9, 'Enterprise Support': 7, 'TypeScript Support': 8, 'Testing': 8 },
        pros: ['Gentle learning curve', 'Good documentation', 'Flexible', 'Official tooling'],
        cons: ['Smaller ecosystem', 'Fewer enterprise adopters'],
      },
      {
        name: 'Angular',
        scores: { 'Performance': 7, 'Developer Experience': 7, 'Ecosystem': 8, 'Learning Curve': 5, 'Enterprise Support': 10, 'TypeScript Support': 10, 'Testing': 9 },
        pros: ['Full framework', 'Enterprise-ready', 'Strong TypeScript', 'Google backing'],
        cons: ['Steep learning curve', 'Verbose', 'Heavy'],
      },
      {
        name: 'Svelte',
        scores: { 'Performance': 10, 'Developer Experience': 9, 'Ecosystem': 6, 'Learning Curve': 8, 'Enterprise Support': 5, 'TypeScript Support': 8, 'Testing': 7 },
        pros: ['Best performance', 'No virtual DOM', 'Compile-time', 'Simple syntax'],
        cons: ['Smaller ecosystem', 'Fewer jobs', 'Less mature'],
      },
    ],
  },
  
  // API Style Selection
  api_style: {
    category: 'API Style',
    criteria: [
      { name: 'Flexibility', weight: 7, description: 'Query flexibility for clients' },
      { name: 'Performance', weight: 8, description: 'Network efficiency' },
      { name: 'Caching', weight: 7, description: 'HTTP caching support' },
      { name: 'Tooling', weight: 8, description: 'Development and testing tools' },
      { name: 'Learning Curve', weight: 6, description: 'Time to become productive' },
      { name: 'Real-time', weight: 5, description: 'Real-time update support' },
    ],
    options: [
      {
        name: 'REST',
        scores: { 'Flexibility': 6, 'Performance': 7, 'Caching': 10, 'Tooling': 9, 'Learning Curve': 9, 'Real-time': 4 },
        pros: ['Simple', 'Well understood', 'Great caching', 'Mature tooling'],
        cons: ['Over/under fetching', 'Multiple round trips', 'Version management'],
      },
      {
        name: 'GraphQL',
        scores: { 'Flexibility': 10, 'Performance': 8, 'Caching': 6, 'Tooling': 8, 'Learning Curve': 6, 'Real-time': 8 },
        pros: ['Flexible queries', 'Single endpoint', 'Strong typing', 'Subscriptions'],
        cons: ['Complex', 'Caching challenges', 'N+1 problem', 'Learning curve'],
      },
      {
        name: 'gRPC',
        scores: { 'Flexibility': 5, 'Performance': 10, 'Caching': 4, 'Tooling': 7, 'Learning Curve': 5, 'Real-time': 9 },
        pros: ['High performance', 'Strong typing', 'Streaming', 'Code generation'],
        cons: ['Browser support', 'Learning curve', 'Binary format', 'Less human-readable'],
      },
    ],
  },
  
  // Message Broker Selection
  message_broker: {
    category: 'Message Broker',
    criteria: [
      { name: 'Throughput', weight: 9, description: 'Messages per second' },
      { name: 'Latency', weight: 8, description: 'Message delivery latency' },
      { name: 'Durability', weight: 9, description: 'Message persistence guarantees' },
      { name: 'Ordering', weight: 7, description: 'Message ordering guarantees' },
      { name: 'Scalability', weight: 8, description: 'Horizontal scaling capability' },
      { name: 'Operations', weight: 7, description: 'Ease of operations' },
    ],
    options: [
      {
        name: 'Apache Kafka',
        scores: { 'Throughput': 10, 'Latency': 8, 'Durability': 10, 'Ordering': 9, 'Scalability': 10, 'Operations': 6 },
        pros: ['Highest throughput', 'Strong ordering', 'Replay capability', 'Ecosystem'],
        cons: ['Operational complexity', 'Learning curve', 'Overkill for small use cases'],
      },
      {
        name: 'RabbitMQ',
        scores: { 'Throughput': 7, 'Latency': 9, 'Durability': 8, 'Ordering': 8, 'Scalability': 7, 'Operations': 8 },
        pros: ['Flexible routing', 'Multiple protocols', 'Easy to operate', 'Good documentation'],
        cons: ['Lower throughput', 'Scaling limitations', 'Memory-bound'],
      },
      {
        name: 'AWS SQS/SNS',
        scores: { 'Throughput': 8, 'Latency': 7, 'Durability': 9, 'Ordering': 7, 'Scalability': 10, 'Operations': 10 },
        pros: ['Fully managed', 'High durability', 'Easy to use', 'Auto-scaling'],
        cons: ['AWS lock-in', 'Limited features', 'Higher latency'],
      },
      {
        name: 'Azure Service Bus',
        scores: { 'Throughput': 8, 'Latency': 8, 'Durability': 9, 'Ordering': 8, 'Scalability': 9, 'Operations': 9 },
        pros: ['Enterprise features', 'Sessions', 'Transactions', 'Azure integration'],
        cons: ['Azure lock-in', 'Cost', 'Less community'],
      },
    ],
  },
};
```

### 6.3 Migration Planning

```typescript
interface MigrationPlan {
  id: string;
  name: string;
  
  // Migration type
  type: MigrationType;
  
  // Source and target
  source: MigrationEndpoint;
  target: MigrationEndpoint;
  
  // Strategy
  strategy: MigrationStrategy;
  
  // Phases
  phases: MigrationPhase[];
  
  // Risk assessment
  risks: MigrationRisk[];
  
  // Rollback plan
  rollback: RollbackPlan;
  
  // Timeline
  timeline: {
    plannedStart: Date;
    plannedEnd: Date;
    criticalPath: string[];
  };
  
  // Success criteria
  successCriteria: SuccessCriterion[];
}

type MigrationType = 
  | 'lift_and_shift'     // Move as-is to cloud
  | 'replatform'         // Minor optimizations for cloud
  | 'refactor'           // Significant code changes
  | 'rebuild'            // Complete rewrite
  | 'replace'            // Replace with SaaS
  | 'retire'             // Decommission
  | 'retain';            // Keep as-is

interface MigrationStrategy {
  approach: 'big_bang' | 'phased' | 'strangler_fig' | 'parallel_run';
  
  // For phased/strangler
  phases?: {
    name: string;
    components: string[];
    duration: string;
    dependencies: string[];
  }[];
  
  // Data migration
  dataMigration: {
    strategy: 'one_time' | 'continuous' | 'hybrid';
    tool?: string;
    validationStrategy: string;
  };
  
  // Traffic migration
  trafficMigration?: {
    strategy: 'dns' | 'load_balancer' | 'feature_flag' | 'canary';
    rolloutPercentages: number[];
    rollbackTriggers: string[];
  };
}

interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  
  // Components involved
  components: string[];
  
  // Tasks
  tasks: MigrationTask[];
  
  // Dependencies
  dependencies: string[];  // Phase IDs
  
  // Duration
  estimatedDuration: string;
  
  // Validation
  validation: {
    tests: string[];
    metrics: string[];
    signOffRequired: boolean;
  };
  
  // Rollback point
  isRollbackPoint: boolean;
}

interface MigrationRisk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  contingency: string;
  owner: string;
}

interface RollbackPlan {
  triggers: string[];
  procedures: RollbackProcedure[];
  maxRollbackTime: string;
  dataRecovery: {
    strategy: string;
    rpo: string;  // Recovery Point Objective
    rto: string;  // Recovery Time Objective
  };
}
```

### 6.4 Scalability Patterns

```typescript
interface ScalabilityPattern {
  name: string;
  type: 'horizontal' | 'vertical' | 'hybrid';
  description: string;
  
  // When to use
  triggers: ScalingTrigger[];
  
  // Implementation
  implementation: ScalingImplementation;
  
  // Limits
  limits: {
    min: number;
    max: number;
    cooldown: string;
  };
  
  // Cost implications
  costModel: ScalingCostModel;
}

interface ScalingTrigger {
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=';
  duration: string;
  action: 'scale_out' | 'scale_in' | 'scale_up' | 'scale_down';
}

interface ScalingImplementation {
  // Auto-scaling configuration
  autoScaling: {
    enabled: boolean;
    provider: 'kubernetes_hpa' | 'aws_autoscaling' | 'azure_vmss' | 'gcp_mig' | 'custom';
    config: Record<string, any>;
  };
  
  // Stateless considerations
  statelessDesign: {
    sessionManagement: 'external_cache' | 'sticky_sessions' | 'jwt';
    fileStorage: 'object_storage' | 'shared_filesystem' | 'none';
  };
  
  // Database scaling
  databaseScaling?: {
    readReplicas: boolean;
    sharding: boolean;
    connectionPooling: boolean;
  };
}

const SCALABILITY_PATTERNS: ScalabilityPattern[] = [
  {
    name: 'Horizontal Pod Autoscaler',
    type: 'horizontal',
    description: 'Automatically scale pods based on CPU/memory or custom metrics',
    triggers: [
      { metric: 'cpu_utilization', threshold: 70, operator: '>', duration: '2m', action: 'scale_out' },
      { metric: 'cpu_utilization', threshold: 30, operator: '<', duration: '5m', action: 'scale_in' },
    ],
    implementation: {
      autoScaling: {
        enabled: true,
        provider: 'kubernetes_hpa',
        config: {
          minReplicas: 2,
          maxReplicas: 10,
          targetCPUUtilizationPercentage: 70,
        },
      },
      statelessDesign: {
        sessionManagement: 'external_cache',
        fileStorage: 'object_storage',
      },
    },
    limits: { min: 2, max: 10, cooldown: '3m' },
    costModel: {
      type: 'pay_per_use',
      baselineCost: 100,
      costPerUnit: 50,
    },
  },
  {
    name: 'Database Read Replicas',
    type: 'horizontal',
    description: 'Scale read capacity with read replicas',
    triggers: [
      { metric: 'read_latency_p99', threshold: 100, operator: '>', duration: '5m', action: 'scale_out' },
      { metric: 'replica_lag', threshold: 1000, operator: '>', duration: '1m', action: 'scale_in' },
    ],
    implementation: {
      autoScaling: { enabled: false, provider: 'custom', config: {} },
      statelessDesign: { sessionManagement: 'jwt', fileStorage: 'none' },
      databaseScaling: {
        readReplicas: true,
        sharding: false,
        connectionPooling: true,
      },
    },
    limits: { min: 1, max: 5, cooldown: '10m' },
    costModel: {
      type: 'fixed_per_replica',
      baselineCost: 200,
      costPerUnit: 200,
    },
  },
];
```

---

## 7. INFRASTRUCTURE-AS-CODE PLANNING

### 7.1 IaC Tool Selection

```typescript
interface IaCConfig {
  // Primary tool
  primaryTool: IaCTool;
  
  // Secondary tools (for specific use cases)
  secondaryTools?: IaCTool[];
  
  // State management
  stateManagement: StateManagementConfig;
  
  // Module organization
  moduleStructure: IaCModuleStructure;
  
  // CI/CD integration
  cicdIntegration: IaCCICDConfig;
  
  // Testing
  testing: IaCTestingConfig;
  
  // Security scanning
  securityScanning: IaCSecurityConfig;
}

type IaCTool = 
  | 'terraform'
  | 'pulumi'
  | 'cloudformation'
  | 'arm_bicep'
  | 'cdk'
  | 'crossplane'
  | 'ansible';

interface StateManagementConfig {
  // Backend
  backend: 'remote' | 'local';
  
  // For remote state
  remoteBackend?: {
    provider: 'terraform_cloud' | 's3' | 'azure_blob' | 'gcs' | 'consul';
    config: Record<string, any>;
  };
  
  // State locking
  locking: boolean;
  
  // State encryption
  encryption: boolean;
  
  // State file organization
  organization: 'single' | 'per_environment' | 'per_component' | 'workspace';
}

interface IaCModuleStructure {
  // Module organization
  pattern: 'flat' | 'layered' | 'domain_driven';
  
  // Standard modules
  modules: IaCModule[];
  
  // Shared modules
  sharedModules: {
    repository: string;
    versioning: 'git_tags' | 'registry' | 'path';
  };
}

interface IaCModule {
  name: string;
  path: string;
  description: string;
  
  // Inputs
  inputs: IaCVariable[];
  
  // Outputs
  outputs: IaCOutput[];
  
  // Resources managed
  resources: string[];
  
  // Dependencies
  dependencies: string[];
}

// Terraform-specific configuration
interface TerraformConfig extends IaCConfig {
  // Version
  version: string;
  
  // Required providers
  providers: TerraformProvider[];
  
  // Workspaces
  workspaces: TerraformWorkspace[];
  
  // Backend configuration
  backend: TerraformBackend;
}

interface TerraformProvider {
  name: string;
  source: string;
  version: string;
  configuration?: Record<string, any>;
}

interface TerraformWorkspace {
  name: string;
  environment: string;
  variables: Record<string, any>;
}

// Example Terraform module structure
const TERRAFORM_MODULE_STRUCTURE = {
  pattern: 'layered',
  layers: [
    {
      name: 'foundation',
      path: 'terraform/foundation',
      description: 'Core infrastructure (networking, identity)',
      modules: ['networking', 'identity', 'dns'],
      dependsOn: [],
    },
    {
      name: 'platform',
      path: 'terraform/platform',
      description: 'Platform services (Kubernetes, databases)',
      modules: ['kubernetes', 'databases', 'messaging'],
      dependsOn: ['foundation'],
    },
    {
      name: 'application',
      path: 'terraform/application',
      description: 'Application-specific resources',
      modules: ['app-services', 'storage', 'cdn'],
      dependsOn: ['platform'],
    },
  ],
};
```

### 7.2 IaC Templates

```typescript
interface IaCTemplate {
  id: string;
  name: string;
  description: string;
  
  // Tool
  tool: IaCTool;
  
  // Cloud provider
  provider: CloudProvider;
  
  // Category
  category: IaCTemplateCategory;
  
  // Template content
  files: IaCTemplateFile[];
  
  // Variables
  variables: IaCVariable[];
  
  // Outputs
  outputs: IaCOutput[];
  
  // Usage examples
  examples: IaCExample[];
}

type IaCTemplateCategory = 
  | 'networking'
  | 'compute'
  | 'kubernetes'
  | 'database'
  | 'storage'
  | 'security'
  | 'monitoring'
  | 'complete_stack';

interface IaCTemplateFile {
  name: string;
  path: string;
  content: string;
  description: string;
}

// Pre-built templates
const IAC_TEMPLATES: IaCTemplate[] = [
  {
    id: 'azure-aks-complete',
    name: 'Azure Kubernetes Service (Complete)',
    description: 'Production-ready AKS cluster with networking, monitoring, and security',
    tool: 'terraform',
    provider: 'azure',
    category: 'kubernetes',
    files: [
      {
        name: 'main.tf',
        path: 'terraform/aks/main.tf',
        content: `
# Azure Kubernetes Service - Production Configuration
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.dns_prefix
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "system"
    node_count          = var.system_node_count
    vm_size             = var.system_node_size
    availability_zones  = var.availability_zones
    enable_auto_scaling = true
    min_count           = var.system_node_min
    max_count           = var.system_node_max
    os_disk_size_gb     = 128
    os_disk_type        = "Managed"
    vnet_subnet_id      = var.subnet_id
    
    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = "azure"
    network_policy     = "azure"
    load_balancer_sku  = "standard"
    outbound_type      = "loadBalancer"
    service_cidr       = var.service_cidr
    dns_service_ip     = var.dns_service_ip
  }

  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = var.admin_group_ids
  }

  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  tags = var.tags
}
`,
        description: 'Main AKS cluster configuration',
      },
    ],
    variables: [
      { name: 'cluster_name', type: 'string', description: 'Name of the AKS cluster', required: true },
      { name: 'location', type: 'string', description: 'Azure region', required: true },
      { name: 'kubernetes_version', type: 'string', description: 'Kubernetes version', default: '1.28' },
    ],
    outputs: [
      { name: 'cluster_id', description: 'AKS cluster ID' },
      { name: 'kube_config', description: 'Kubeconfig for cluster access', sensitive: true },
    ],
    examples: [],
  },
];
```

---

## 8. COST MANAGEMENT & OPTIMIZATION

### 8.1 Cost Estimation

```typescript
interface CostEstimate {
  // Total estimated cost
  total: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  
  // Breakdown by category
  breakdown: CostBreakdown[];
  
  // Cost drivers
  drivers: CostDriver[];
  
  // Optimization opportunities
  optimizations: CostOptimization[];
  
  // Confidence level
  confidence: 'low' | 'medium' | 'high';
  assumptions: string[];
}

interface CostBreakdown {
  category: string;
  service: string;
  provider: CloudProvider;
  
  // Cost details
  monthlyCost: number;
  percentageOfTotal: number;
  
  // Usage details
  usage: {
    metric: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }[];
  
  // Pricing tier
  tier: string;
}

interface CostDriver {
  name: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  currentCost: number;
  percentageOfTotal: number;
}

interface CostOptimization {
  id: string;
  name: string;
  description: string;
  
  // Savings
  estimatedSavings: {
    monthly: number;
    percentage: number;
  };
  
  // Implementation
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  
  // Actions
  actions: string[];
  
  // Trade-offs
  tradeoffs: string[];
}

class CostEstimationEngine {
  /**
   * Estimate infrastructure costs
   */
  async estimateCosts(
    infrastructure: InfrastructureComponent[],
    environment: string
  ): Promise<CostEstimate> {
    const breakdown: CostBreakdown[] = [];
    let totalMonthly = 0;
    
    for (const component of infrastructure) {
      const componentCost = await this.estimateComponentCost(component, environment);
      breakdown.push(componentCost);
      totalMonthly += componentCost.monthlyCost;
    }
    
    // Calculate percentages
    for (const item of breakdown) {
      item.percentageOfTotal = (item.monthlyCost / totalMonthly) * 100;
    }
    
    // Identify cost drivers
    const drivers = this.identifyCostDrivers(breakdown);
    
    // Generate optimizations
    const optimizations = await this.generateOptimizations(breakdown, infrastructure);
    
    return {
      total: {
        monthly: totalMonthly,
        yearly: totalMonthly * 12,
        currency: 'USD',
      },
      breakdown,
      drivers,
      optimizations,
      confidence: 'medium',
      assumptions: [
        'Pricing based on public pricing (no enterprise discounts)',
        'Usage estimated from specified requirements',
        'Data transfer costs estimated at average rates',
      ],
    };
  }
  
  private async estimateComponentCost(
    component: InfrastructureComponent,
    environment: string
  ): Promise<CostBreakdown> {
    // Implementation would call pricing APIs or use pricing tables
    // This is a simplified version
    
    const pricing = await this.getPricing(component.type, component.cloudProvider);
    
    // Calculate based on component configuration
    let monthlyCost = 0;
    const usage: any[] = [];
    
    switch (component.type) {
      case 'container_cluster':
        monthlyCost = this.estimateKubernetesCost(component);
        break;
      case 'database':
        monthlyCost = this.estimateDatabaseCost(component);
        break;
      // ... other types
    }
    
    return {
      category: component.type,
      service: component.name,
      provider: component.cloudProvider?.primary || 'azure',
      monthlyCost,
      percentageOfTotal: 0,  // Calculated later
      usage,
      tier: this.determineTier(component),
    };
  }
}
```

### 8.2 Cost Comparison Across Providers

```typescript
interface CloudCostComparison {
  service: string;
  specification: ServiceSpecification;
  
  // Costs per provider
  costs: {
    azure: ProviderCost;
    aws: ProviderCost;
    gcp: ProviderCost;
  };
  
  // Recommendation
  recommendation: {
    provider: CloudProvider;
    reason: string;
    savings: number;
  };
}

interface ProviderCost {
  service: string;
  tier: string;
  monthlyCost: number;
  
  // Cost breakdown
  breakdown: {
    compute?: number;
    storage?: number;
    network?: number;
    backup?: number;
    other?: number;
  };
  
  // Pricing notes
  notes: string[];
  
  // Reserved pricing
  reservedPricing?: {
    oneYear: number;
    threeYear: number;
    savingsPercentage: number;
  };
}

class CloudCostComparisonEngine {
  /**
   * Compare costs across cloud providers
   */
  async compareCosts(
    requirements: ServiceRequirements
  ): Promise<CloudCostComparison[]> {
    const comparisons: CloudCostComparison[] = [];
    
    for (const req of requirements.services) {
      const comparison: CloudCostComparison = {
        service: req.category,
        specification: this.extractSpecification(req),
        costs: {
          azure: await this.estimateAzureCost(req),
          aws: await this.estimateAWSCost(req),
          gcp: await this.estimateGCPCost(req),
        },
        recommendation: null as any,
      };
      
      // Determine cheapest option
      const costs = [
        { provider: 'azure', cost: comparison.costs.azure.monthlyCost },
        { provider: 'aws', cost: comparison.costs.aws.monthlyCost },
        { provider: 'gcp', cost: comparison.costs.gcp.monthlyCost },
      ].sort((a, b) => a.cost - b.cost);
      
      const cheapest = costs[0];
      const mostExpensive = costs[costs.length - 1];
      
      comparison.recommendation = {
        provider: cheapest.provider as CloudProvider,
        reason: `${cheapest.provider} is ${((1 - cheapest.cost / mostExpensive.cost) * 100).toFixed(0)}% cheaper than ${mostExpensive.provider}`,
        savings: mostExpensive.cost - cheapest.cost,
      };
      
      comparisons.push(comparison);
    }
    
    return comparisons;
  }
}
```

---

## 9. DATABASE SCHEMA (Additional Tables)

```sql
-- Infrastructure Components
CREATE TABLE infrastructure_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,  -- 'compute', 'container_cluster', 'database', etc.
  
  -- Cloud provider config (JSON)
  cloud_provider_config JSONB,
  
  -- Container config (JSON)
  container_config JSONB,
  
  -- Database config (JSON)
  database_config JSONB,
  
  -- Network config (JSON)
  network_config JSONB,
  
  -- Security config (JSON)
  security_config JSONB,
  
  -- Scaling config (JSON)
  scaling_config JSONB,
  
  -- Cost estimate (JSON)
  estimated_cost JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'planned',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Module-Infrastructure Mapping
CREATE TABLE module_infrastructure_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  infrastructure_component_id UUID NOT NULL REFERENCES infrastructure_components(id) ON DELETE CASCADE,
  
  role VARCHAR(50) DEFAULT 'primary',  -- 'primary', 'secondary', 'failover'
  
  -- Resource requirements (JSON)
  resource_requirements JSONB,
  
  -- Deployment configuration (JSON)
  deployment_config JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(module_id, infrastructure_component_id)
);

-- Architecture Decisions
CREATE TABLE architecture_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'proposed',  -- 'proposed', 'accepted', 'deprecated', 'superseded'
  superseded_by UUID REFERENCES architecture_decisions(id),
  
  context TEXT NOT NULL,
  decision TEXT NOT NULL,
  
  -- Consequences (JSON)
  consequences JSONB,
  
  -- Alternatives (JSON array)
  alternatives JSONB,
  
  -- Related decisions (UUID array)
  related_decisions UUID[],
  
  -- Metadata
  deciders TEXT[],
  tags TEXT[],
  
  decision_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cloud Provider Configurations
CREATE TABLE cloud_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  
  provider VARCHAR(50) NOT NULL,  -- 'azure', 'aws', 'gcp'
  is_primary BOOLEAN DEFAULT false,
  
  -- Provider-specific config (JSON)
  configuration JSONB NOT NULL,
  
  -- Regions
  primary_region VARCHAR(100),
  secondary_regions TEXT[],
  
  -- Cost allocation
  cost_allocation_tags JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, provider)
);

-- Docker Configurations
CREATE TABLE docker_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_component_id UUID NOT NULL REFERENCES infrastructure_components(id) ON DELETE CASCADE,
  
  -- Dockerfile config (JSON)
  dockerfile_config JSONB,
  
  -- Docker Compose config (JSON)
  compose_config JSONB,
  
  -- Registry config (JSON)
  registry_config JSONB,
  
  -- Base image strategy (JSON)
  base_image_strategy JSONB,
  
  -- Security config (JSON)
  security_config JSONB,
  
  -- Build optimization (JSON)
  build_optimization JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kubernetes Configurations
CREATE TABLE kubernetes_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_component_id UUID NOT NULL REFERENCES infrastructure_components(id) ON DELETE CASCADE,
  
  -- Cluster config (JSON)
  cluster_config JSONB,
  
  -- Namespaces (JSON array)
  namespaces JSONB,
  
  -- Workloads (JSON array)
  workloads JSONB,
  
  -- Services (JSON array)
  services JSONB,
  
  -- Ingress config (JSON)
  ingress_config JSONB,
  
  -- RBAC config (JSON)
  rbac_config JSONB,
  
  -- Autoscaling config (JSON)
  autoscaling_config JSONB,
  
  -- GitOps config (JSON)
  gitops_config JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database Configurations
CREATE TABLE database_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_component_id UUID NOT NULL REFERENCES infrastructure_components(id) ON DELETE CASCADE,
  
  database_type VARCHAR(50) NOT NULL,  -- 'relational', 'document', etc.
  technology VARCHAR(50) NOT NULL,  -- 'postgresql', 'mongodb', etc.
  
  -- Deployment config (JSON)
  deployment_config JSONB,
  
  -- Performance config (JSON)
  performance_config JSONB,
  
  -- HA config (JSON)
  high_availability_config JSONB,
  
  -- Backup config (JSON)
  backup_config JSONB,
  
  -- Security config (JSON)
  security_config JSONB,
  
  -- Monitoring config (JSON)
  monitoring_config JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost Estimates
CREATE TABLE cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  infrastructure_component_id UUID REFERENCES infrastructure_components(id) ON DELETE CASCADE,
  
  -- Must have one of plan_id or infrastructure_component_id
  
  -- Total costs
  monthly_cost DECIMAL(12, 2),
  yearly_cost DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Breakdown (JSON array)
  breakdown JSONB,
  
  -- Cost drivers (JSON array)
  drivers JSONB,
  
  -- Optimizations (JSON array)
  optimizations JSONB,
  
  -- Confidence
  confidence VARCHAR(20) DEFAULT 'medium',
  assumptions TEXT[],
  
  estimated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (plan_id IS NOT NULL OR infrastructure_component_id IS NOT NULL)
);

-- IaC Configurations
CREATE TABLE iac_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  
  primary_tool VARCHAR(50) NOT NULL,  -- 'terraform', 'pulumi', etc.
  secondary_tools TEXT[],
  
  -- State management (JSON)
  state_management JSONB,
  
  -- Module structure (JSON)
  module_structure JSONB,
  
  -- CI/CD integration (JSON)
  cicd_integration JSONB,
  
  -- Testing config (JSON)
  testing_config JSONB,
  
  -- Security scanning (JSON)
  security_scanning JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration Plans
CREATE TABLE migration_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,  -- 'lift_and_shift', 'refactor', etc.
  
  -- Source and target (JSON)
  source JSONB NOT NULL,
  target JSONB NOT NULL,
  
  -- Strategy (JSON)
  strategy JSONB NOT NULL,
  
  -- Phases (JSON array)
  phases JSONB,
  
  -- Risks (JSON array)
  risks JSONB,
  
  -- Rollback plan (JSON)
  rollback_plan JSONB,
  
  -- Timeline
  planned_start DATE,
  planned_end DATE,
  
  -- Success criteria (JSON array)
  success_criteria JSONB,
  
  status VARCHAR(50) DEFAULT 'planned',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_infra_components_plan ON infrastructure_components(plan_id);
CREATE INDEX idx_infra_components_type ON infrastructure_components(type);
CREATE INDEX idx_module_infra_mapping_module ON module_infrastructure_mappings(module_id);
CREATE INDEX idx_module_infra_mapping_infra ON module_infrastructure_mappings(infrastructure_component_id);
CREATE INDEX idx_arch_decisions_plan ON architecture_decisions(plan_id);
CREATE INDEX idx_cloud_configs_project ON cloud_provider_configs(project_id);
CREATE INDEX idx_cost_estimates_plan ON cost_estimates(plan_id);
```

---

## 10. API ENDPOINTS

```typescript
// Infrastructure Components
POST   /api/planning/:planId/infrastructure                    // Create infrastructure component
GET    /api/planning/:planId/infrastructure                    // List infrastructure components
GET    /api/planning/:planId/infrastructure/:componentId       // Get infrastructure component
PUT    /api/planning/:planId/infrastructure/:componentId       // Update infrastructure component
DELETE /api/planning/:planId/infrastructure/:componentId       // Delete infrastructure component

// Module-Infrastructure Mapping
POST   /api/planning/:planId/modules/:moduleId/infrastructure  // Assign module to infrastructure
GET    /api/planning/:planId/modules/:moduleId/infrastructure  // Get module's infrastructure
DELETE /api/planning/:planId/modules/:moduleId/infrastructure/:componentId  // Remove mapping

// Cloud Provider Configuration
POST   /api/projects/:projectId/cloud-providers                // Configure cloud provider
GET    /api/projects/:projectId/cloud-providers                // List cloud providers
PUT    /api/projects/:projectId/cloud-providers/:provider      // Update cloud provider config

// Architecture Decisions
POST   /api/planning/:planId/architecture-decisions            // Create ADR
GET    /api/planning/:planId/architecture-decisions            // List ADRs
PUT    /api/planning/:planId/architecture-decisions/:id        // Update ADR

// Database Configuration
POST   /api/planning/:planId/infrastructure/:componentId/database  // Configure database
GET    /api/planning/:planId/infrastructure/:componentId/database  // Get database config
PUT    /api/planning/:planId/infrastructure/:componentId/database  // Update database config

// Container/Kubernetes Configuration
POST   /api/planning/:planId/infrastructure/:componentId/kubernetes  // Configure K8s
GET    /api/planning/:planId/infrastructure/:componentId/kubernetes  // Get K8s config
PUT    /api/planning/:planId/infrastructure/:componentId/kubernetes  // Update K8s config

// Docker Configuration
POST   /api/planning/:planId/infrastructure/:componentId/docker  // Configure Docker
GET    /api/planning/:planId/infrastructure/:componentId/docker  // Get Docker config

// Cost Estimation
GET    /api/planning/:planId/cost-estimate                     // Get plan cost estimate
GET    /api/planning/:planId/cost-comparison                   // Compare across providers
POST   /api/planning/:planId/cost-optimization                 // Get optimization recommendations

// Service Recommendations
POST   /api/planning/recommend-services                        // Get service recommendations
POST   /api/planning/recommend-database                        // Get database recommendations
POST   /api/planning/recommend-architecture                    // Get architecture recommendations

// IaC
GET    /api/planning/:planId/iac/generate                      // Generate IaC templates
GET    /api/planning/:planId/iac/templates                     // List available templates

// Migration
POST   /api/planning/:planId/migrations                        // Create migration plan
GET    /api/planning/:planId/migrations                        // List migration plans
PUT    /api/planning/:planId/migrations/:migrationId           // Update migration plan
```

---

## 11. UI COMPONENTS

### 11.1 Infrastructure Views

```typescript
// Infrastructure Architecture View
interface InfrastructureArchitectureView {
  // Visual diagram of infrastructure
  diagram: {
    type: 'network' | 'hierarchy' | 'deployment';
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    layout: 'auto' | 'manual';
  };
  
  // Side panel showing selected item details
  detailPanel: {
    selectedItem: InfrastructureComponent | Module | null;
    editMode: boolean;
  };
  
  // Toolbar actions
  actions: ['add_component', 'connect', 'auto_layout', 'export', 'cost_view'];
}

// Cloud Provider Comparison View
interface CloudComparisonView {
  // Side-by-side comparison
  providers: ['azure', 'aws', 'gcp'];
  
  // Comparison categories
  categories: {
    services: boolean;
    pricing: boolean;
    features: boolean;
    regions: boolean;
  };
  
  // Filter by service type
  serviceFilter: string[];
}

// Cost Dashboard
interface CostDashboardView {
  // Cost overview charts
  charts: {
    totalCostTrend: 'line';
    costByCategory: 'pie';
    costByProvider: 'bar';
    costByEnvironment: 'stacked_bar';
  };
  
  // Cost breakdown table
  breakdownTable: {
    columns: ['service', 'provider', 'tier', 'monthly_cost', 'percentage'];
    sortable: boolean;
    filterable: boolean;
  };
  
  // Optimization recommendations
  optimizations: {
    showPotentialSavings: boolean;
    prioritizeBy: 'savings' | 'effort' | 'risk';
  };
}

// Database Selection Wizard
interface DatabaseSelectionWizard {
  steps: [
    'requirements',      // Gather requirements
    'recommendations',   // Show recommendations
    'comparison',        // Compare options
    'configuration',     // Configure selected database
    'review'            // Review and confirm
  ];
  
  // Requirements form
  requirementsForm: {
    dataModel: 'structured' | 'semi_structured' | 'unstructured' | 'graph' | 'time_series';
    scale: 'small' | 'medium' | 'large' | 'massive';
    consistency: 'strong' | 'eventual';
    features: string[];  // Checkboxes
  };
}

// Kubernetes Workload Designer
interface K8sWorkloadDesigner {
  // Visual workload designer
  canvas: {
    workloads: WorkloadCard[];
    services: ServiceCard[];
    configMaps: ConfigCard[];
    secrets: SecretCard[];
  };
  
  // YAML preview
  yamlPreview: {
    show: boolean;
    editable: boolean;
    validation: boolean;
  };
  
  // Resource calculator
  resourceCalculator: {
    totalCPU: string;
    totalMemory: string;
    estimatedCost: number;
  };
}
```

---

**END OF SPECIFICATION**

This specification provides comprehensive infrastructure and architecture planning capabilities integrated directly into the module planning workflow, with full flexibility for multiple modules to share infrastructure components.

