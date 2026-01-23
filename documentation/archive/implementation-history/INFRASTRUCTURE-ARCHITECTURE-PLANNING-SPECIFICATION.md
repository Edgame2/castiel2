# Infrastructure & Architecture Planning Specification
## Comprehensive Cloud, Container, Database & Architecture Decision Support

**Version:** 1.0  
**Last Updated:** 2026-01-20  
**Status:** Complete Specification

---

## TABLE OF CONTENTS

1. [Overview & Integration](#1-overview--integration)
2. [Infrastructure Architecture Model](#2-infrastructure-architecture-model)
3. [Cloud Provider Planning](#3-cloud-provider-planning)
4. [Container Architecture Planning](#4-container-architecture-planning)
5. [Database Architecture Planning](#5-database-architecture-planning)
6. [Architecture Decision Framework](#6-architecture-decision-framework)
7. [Infrastructure-as-Code Planning](#7-infrastructure-as-code-planning)
8. [Cost Management & Optimization](#8-cost-management--optimization)
9. [Database Schema](#9-database-schema)
10. [API Endpoints](#10-api-endpoints)
11. [UI Components](#11-ui-components)

---

## 1. OVERVIEW & INTEGRATION

### 1.1 Purpose

This specification extends the Planning Module to support comprehensive infrastructure and architecture planning, including:
- **Cloud Provider Planning**: Azure, GCP, AWS service selection and configuration
- **Container Architecture**: Docker, Kubernetes, container orchestration
- **Database Architecture**: All database types (relational, NoSQL, graph, time-series, etc.)
- **Architecture Decision Support**: Decision frameworks, technology selection, migration planning

### 1.2 Integration with Module Planning

Infrastructure planning integrates directly into the existing module planning workflow with **maximum flexibility**:

```typescript
/**
 * KEY CONCEPT: Modules define their infrastructure requirements
 * Multiple modules can share the same infrastructure component
 * Infrastructure components can host multiple modules/sub-modules
 */

interface ModuleWithInfrastructure extends Module {
  // Existing module fields...
  
  // Infrastructure assignment (flexible)
  infrastructureAssignments: InfrastructureAssignment[];
}

interface InfrastructureAssignment {
  // Which infrastructure component(s) this module uses
  infrastructureComponentId: string;
  
  // Role in the infrastructure
  role: 'primary' | 'secondary' | 'failover' | 'read-replica';
  
  // Resource requirements for this module
  resourceRequirements: ResourceRequirements;
  
  // Environment-specific overrides
  environmentOverrides?: Record<string, Partial<ResourceRequirements>>;
}

/**
 * Infrastructure Component: Can host multiple modules
 * Example: A Kubernetes cluster can host auth, api, and worker modules
 */
interface InfrastructureComponent {
  id: string;
  planId: string;
  projectId: string;
  
  // Component definition
  name: string;
  description: string;
  type: InfrastructureType;
  
  // Which modules use this component
  hostedModules: HostedModule[];
  
  // Cloud provider configuration
  cloudProvider?: CloudProviderConfig;
  
  // Container configuration
  containerConfig?: ContainerConfig;
  
  // Database configuration
  databaseConfig?: DatabaseConfig;
  
  // Networking
  networkConfig: NetworkConfig;
  
  // Security
  securityConfig: SecurityConfig;
  
  // Scaling
  scalingConfig: ScalingConfig;
  
  // Cost estimation
  estimatedCost: CostEstimate;
  
  // Dependencies on other infrastructure
  dependencies: InfrastructureDependency[];
  
  // Status
  status: InfrastructureStatus;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface HostedModule {
  moduleId: string;
  modulePath: string;  // e.g., "auth", "auth.login", "api.users"
  resourceAllocation: ResourceAllocation;
}

type InfrastructureType = 
  | 'compute'           // VMs, App Services, Lambda, etc.
  | 'container_cluster' // Kubernetes, ECS, AKS, GKE
  | 'container_instance'// Single container (ACI, Fargate, Cloud Run)
  | 'serverless'        // Functions, Lambda, Cloud Functions
  | 'database'          // Any database type
  | 'storage'           // Blob, S3, GCS
  | 'network'           // VNet, VPC, Load Balancers
  | 'messaging'         // Event Hub, SQS, Pub/Sub
  | 'cache'             // Redis, Memcached
  | 'cdn'               // Content delivery
  | 'api_gateway'       // API Management
  | 'search'            // Elasticsearch, OpenSearch
  | 'monitoring'        // Application Insights, CloudWatch
  | 'identity';         // Identity providers
```

### 1.3 Planning Flow Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENHANCED PLANNING FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: High-Level Module Planning                            │
│     └─► Define modules and their purposes                       │
│                                                                  │
│  Phase 2: Architecture Planning (NEW)                           │
│     ├─► Architecture pattern selection                          │
│     ├─► Infrastructure component definition                     │
│     ├─► Module-to-infrastructure mapping                        │
│     ├─► Cloud provider selection                                │
│     ├─► Database architecture design                            │
│     └─► Container orchestration planning                        │
│                                                                  │
│  Phase 3: Module Refinement                                     │
│     └─► Each module specifies infrastructure requirements       │
│                                                                  │
│  Phase 4: Task Generation                                       │
│     └─► Infrastructure tasks generated automatically            │
│                                                                  │
│  Phase 5+: Quality Gates, Validation, Finalization              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. INFRASTRUCTURE ARCHITECTURE MODEL

### 2.1 Architecture Patterns

```typescript
interface ArchitecturePattern {
  id: string;
  name: string;
  description: string;
  type: ArchitecturePatternType;
  
  // When to use this pattern
  useCases: string[];
  benefits: string[];
  tradeoffs: string[];
  
  // Complexity and cost
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  operationalOverhead: 'low' | 'medium' | 'high';
  costProfile: 'low' | 'medium' | 'high' | 'variable';
  
  // Required infrastructure
  requiredComponents: InfrastructureType[];
  optionalComponents: InfrastructureType[];
  
  // Best practices
  bestPractices: string[];
  antiPatterns: string[];
  
  // Reference architecture diagrams
  referenceArchitectures: ReferenceArchitecture[];
}

type ArchitecturePatternType = 
  | 'monolith'
  | 'modular_monolith'
  | 'microservices'
  | 'serverless'
  | 'event_driven'
  | 'cqrs'
  | 'saga'
  | 'hexagonal'
  | 'clean_architecture'
  | 'layered'
  | 'hybrid';

const ARCHITECTURE_PATTERNS: ArchitecturePattern[] = [
  {
    id: 'monolith',
    name: 'Monolithic Architecture',
    description: 'Single deployable unit containing all application functionality',
    type: 'monolith',
    useCases: [
      'Small to medium applications',
      'Teams < 10 developers',
      'Rapid prototyping and MVPs',
      'Applications with simple domain',
      'Limited budget for infrastructure',
    ],
    benefits: [
      'Simple to develop, test, and deploy',
      'Lower operational complexity',
      'Easier debugging and tracing',
      'Lower infrastructure costs',
      'No network latency between components',
    ],
    tradeoffs: [
      'Scaling requires scaling entire application',
      'Technology stack lock-in',
      'Longer build and deployment times as app grows',
      'Single point of failure',
      'Harder to adopt new technologies',
    ],
    complexity: 'low',
    operationalOverhead: 'low',
    costProfile: 'low',
    requiredComponents: ['compute', 'database'],
    optionalComponents: ['cache', 'cdn', 'storage'],
    bestPractices: [
      'Use modular design within monolith',
      'Implement clear boundaries between domains',
      'Use dependency injection',
      'Design for eventual extraction to services',
    ],
    antiPatterns: [
      'Big ball of mud (no structure)',
      'Distributed monolith (worst of both worlds)',
    ],
    referenceArchitectures: [],
  },
  {
    id: 'microservices',
    name: 'Microservices Architecture',
    description: 'Application composed of small, independent services',
    type: 'microservices',
    useCases: [
      'Large, complex applications',
      'Multiple teams (>10 developers)',
      'Need for independent scaling',
      'Polyglot development requirements',
      'High availability requirements',
    ],
    benefits: [
      'Independent deployment and scaling',
      'Technology flexibility per service',
      'Fault isolation',
      'Team autonomy',
      'Easier to understand individual services',
    ],
    tradeoffs: [
      'Increased operational complexity',
      'Network latency and reliability concerns',
      'Data consistency challenges',
      'Requires mature DevOps practices',
      'Higher infrastructure costs',
    ],
    complexity: 'high',
    operationalOverhead: 'high',
    costProfile: 'high',
    requiredComponents: [
      'container_cluster', 'database', 'api_gateway',
      'messaging', 'monitoring', 'network'
    ],
    optionalComponents: ['cache', 'cdn', 'search', 'storage'],
    bestPractices: [
      'Design around business capabilities',
      'Implement API versioning',
      'Use circuit breakers',
      'Implement distributed tracing',
      'Design for failure',
      'Use async communication where possible',
    ],
    antiPatterns: [
      'Nano-services (too small)',
      'Shared database between services',
      'Synchronous chains',
      'Distributed monolith',
    ],
    referenceArchitectures: [],
  },
  {
    id: 'serverless',
    name: 'Serverless Architecture',
    description: 'Event-driven functions managed by cloud provider',
    type: 'serverless',
    useCases: [
      'Event-driven workloads',
      'Variable/unpredictable traffic',
      'Cost optimization for sporadic workloads',
      'Rapid development',
      'API backends with low traffic',
    ],
    benefits: [
      'No server management',
      'Automatic scaling',
      'Pay-per-execution pricing',
      'Reduced operational overhead',
      'Fast time to market',
    ],
    tradeoffs: [
      'Cold start latency',
      'Vendor lock-in',
      'Limited execution duration',
      'Debugging complexity',
      'State management challenges',
    ],
    complexity: 'medium',
    operationalOverhead: 'low',
    costProfile: 'variable',
    requiredComponents: ['serverless', 'api_gateway', 'database'],
    optionalComponents: ['messaging', 'storage', 'cache', 'cdn'],
    bestPractices: [
      'Design functions to be stateless',
      'Minimize cold starts',
      'Use async patterns',
      'Implement proper error handling',
      'Monitor costs closely',
    ],
    antiPatterns: [
      'Long-running processes',
      'Stateful functions',
      'High-throughput synchronous workloads',
    ],
    referenceArchitectures: [],
  },
  {
    id: 'event_driven',
    name: 'Event-Driven Architecture',
    description: 'Loosely coupled services communicating via events',
    type: 'event_driven',
    useCases: [
      'Real-time data processing',
      'Audit and compliance requirements',
      'Integration of heterogeneous systems',
      'Eventual consistency acceptable',
      'High throughput requirements',
    ],
    benefits: [
      'Loose coupling between services',
      'High scalability',
      'Real-time processing',
      'Event sourcing enables audit trails',
      'Easier to add new consumers',
    ],
    tradeoffs: [
      'Eventual consistency complexity',
      'Debugging distributed events',
      'Event schema evolution',
      'Ordering guarantees complexity',
      'Requires mature monitoring',
    ],
    complexity: 'high',
    operationalOverhead: 'medium',
    costProfile: 'medium',
    requiredComponents: ['messaging', 'compute', 'database', 'monitoring'],
    optionalComponents: ['container_cluster', 'search', 'cache'],
    bestPractices: [
      'Design idempotent event handlers',
      'Implement event versioning',
      'Use dead letter queues',
      'Implement saga pattern for transactions',
      'Monitor event lag',
    ],
    antiPatterns: [
      'Event chains (too deep)',
      'Missing correlation IDs',
      'Ignoring event ordering',
    ],
    referenceArchitectures: [],
  },
];
```

### 2.2 Module-Infrastructure Mapping

```typescript
/**
 * Flexible mapping: Multiple modules can share infrastructure
 * Example: Auth, API, and Worker modules all run in same K8s cluster
 */
interface ModuleInfrastructureMapping {
  planId: string;
  
  // The infrastructure component
  infrastructureComponentId: string;
  
  // Modules hosted on this infrastructure
  modules: MappedModule[];
  
  // Deployment configuration
  deploymentConfig: DeploymentConfig;
  
  // Resource sharing strategy
  resourceSharing: ResourceSharingStrategy;
}

interface MappedModule {
  moduleId: string;
  modulePath: string;
  
  // How this module is deployed on the infrastructure
  deploymentUnit: DeploymentUnit;
  
  // Resource requirements
  resources: {
    cpu: ResourceSpec;
    memory: ResourceSpec;
    storage?: ResourceSpec;
    network?: NetworkResourceSpec;
  };
  
  // Scaling configuration for this module
  scaling: ModuleScalingConfig;
  
  // Health checks
  healthChecks: HealthCheckConfig[];
}

interface DeploymentUnit {
  // For Kubernetes
  type: 'deployment' | 'statefulset' | 'daemonset' | 'job' | 'cronjob';
  
  // Number of replicas
  replicas: {
    min: number;
    max: number;
    default: number;
  };
  
  // Container configuration
  containers: ContainerSpec[];
  
  // Pod configuration
  podConfig?: PodConfig;
}

type ResourceSharingStrategy = 
  | 'isolated'      // Each module has dedicated resources
  | 'shared'        // Modules share resources with limits
  | 'burstable'     // Modules can burst beyond limits
  | 'best_effort';  // No guarantees

interface ResourceSpec {
  request: string;  // e.g., "100m", "256Mi"
  limit: string;    // e.g., "500m", "512Mi"
}
```

---

## 3. CLOUD PROVIDER PLANNING

### 3.1 Multi-Cloud Support Model

```typescript
interface CloudProviderConfig {
  // Primary provider
  primary: CloudProvider;
  
  // Secondary/failover providers
  secondary?: CloudProvider[];
  
  // Multi-cloud strategy
  strategy: MultiCloudStrategy;
  
  // Provider-specific configurations
  azure?: AzureConfig;
  aws?: AWSConfig;
  gcp?: GCPConfig;
  
  // Cross-cloud networking
  crossCloudNetworking?: CrossCloudNetworkConfig;
}

type CloudProvider = 'azure' | 'aws' | 'gcp' | 'on_premise' | 'hybrid';

type MultiCloudStrategy = 
  | 'single_cloud'           // All resources in one provider
  | 'active_active'          // Workloads distributed across providers
  | 'active_passive'         // Primary with failover to secondary
  | 'best_of_breed'          // Use best service from each provider
  | 'avoid_lock_in'          // Use portable services only
  | 'data_sovereignty';      // Based on data residency requirements

interface CloudServiceMapping {
  category: string;
  azure: string;
  aws: string;
  gcp: string;
  portable?: string;  // Cloud-agnostic alternative
}

const CLOUD_SERVICE_MAPPINGS: CloudServiceMapping[] = [
  // Compute
  { category: 'Virtual Machines', azure: 'Virtual Machines', aws: 'EC2', gcp: 'Compute Engine', portable: 'Terraform' },
  { category: 'App Platform', azure: 'App Service', aws: 'Elastic Beanstalk', gcp: 'App Engine', portable: 'Docker' },
  { category: 'Serverless Functions', azure: 'Azure Functions', aws: 'Lambda', gcp: 'Cloud Functions', portable: 'OpenFaaS' },
  { category: 'Container Instances', azure: 'Container Instances', aws: 'Fargate', gcp: 'Cloud Run' },
  
  // Kubernetes
  { category: 'Managed Kubernetes', azure: 'AKS', aws: 'EKS', gcp: 'GKE', portable: 'Kubernetes' },
  
  // Databases - Relational
  { category: 'Managed PostgreSQL', azure: 'Azure Database for PostgreSQL', aws: 'RDS PostgreSQL', gcp: 'Cloud SQL PostgreSQL' },
  { category: 'Managed MySQL', azure: 'Azure Database for MySQL', aws: 'RDS MySQL', gcp: 'Cloud SQL MySQL' },
  { category: 'Managed SQL Server', azure: 'Azure SQL Database', aws: 'RDS SQL Server', gcp: 'Cloud SQL SQL Server' },
  
  // Databases - NoSQL
  { category: 'Document DB', azure: 'Cosmos DB', aws: 'DynamoDB', gcp: 'Firestore' },
  { category: 'Managed MongoDB', azure: 'Cosmos DB (MongoDB API)', aws: 'DocumentDB', gcp: 'MongoDB Atlas' },
  { category: 'Managed Redis', azure: 'Azure Cache for Redis', aws: 'ElastiCache Redis', gcp: 'Memorystore Redis' },
  
  // Storage
  { category: 'Object Storage', azure: 'Blob Storage', aws: 'S3', gcp: 'Cloud Storage' },
  { category: 'File Storage', azure: 'Azure Files', aws: 'EFS', gcp: 'Filestore' },
  { category: 'Block Storage', azure: 'Managed Disks', aws: 'EBS', gcp: 'Persistent Disk' },
  
  // Messaging
  { category: 'Message Queue', azure: 'Service Bus', aws: 'SQS', gcp: 'Cloud Tasks' },
  { category: 'Event Streaming', azure: 'Event Hubs', aws: 'Kinesis', gcp: 'Pub/Sub' },
  { category: 'Event Grid', azure: 'Event Grid', aws: 'EventBridge', gcp: 'Eventarc' },
  
  // Networking
  { category: 'Virtual Network', azure: 'VNet', aws: 'VPC', gcp: 'VPC' },
  { category: 'Load Balancer', azure: 'Azure Load Balancer', aws: 'ALB/NLB', gcp: 'Cloud Load Balancing' },
  { category: 'CDN', azure: 'Azure CDN', aws: 'CloudFront', gcp: 'Cloud CDN' },
  { category: 'DNS', azure: 'Azure DNS', aws: 'Route 53', gcp: 'Cloud DNS' },
  { category: 'API Gateway', azure: 'API Management', aws: 'API Gateway', gcp: 'API Gateway' },
  
  // Identity
  { category: 'Identity', azure: 'Azure AD / Entra ID', aws: 'IAM / Cognito', gcp: 'Cloud Identity' },
  
  // Monitoring
  { category: 'Monitoring', azure: 'Azure Monitor', aws: 'CloudWatch', gcp: 'Cloud Monitoring' },
  { category: 'APM', azure: 'Application Insights', aws: 'X-Ray', gcp: 'Cloud Trace' },
  { category: 'Logging', azure: 'Log Analytics', aws: 'CloudWatch Logs', gcp: 'Cloud Logging' },
  
  // Security
  { category: 'Key Management', azure: 'Key Vault', aws: 'KMS / Secrets Manager', gcp: 'Secret Manager' },
  { category: 'WAF', azure: 'Azure WAF', aws: 'AWS WAF', gcp: 'Cloud Armor' },
  
  // AI/ML
  { category: 'AI Platform', azure: 'Azure AI', aws: 'SageMaker', gcp: 'Vertex AI' },
  
  // Search
  { category: 'Search', azure: 'Azure Cognitive Search', aws: 'OpenSearch', gcp: 'Vertex AI Search' },
  
  // Data Warehouse
  { category: 'Data Warehouse', azure: 'Synapse Analytics', aws: 'Redshift', gcp: 'BigQuery' },
];
```

### 3.2 Azure Configuration

```typescript
interface AzureConfig {
  // Subscription and resource organization
  subscriptionId: string;
  resourceGroups: AzureResourceGroup[];
  managementGroups?: string[];
  
  // Regions
  primaryRegion: AzureRegion;
  secondaryRegions?: AzureRegion[];
  
  // Identity
  identityConfig: AzureIdentityConfig;
  
  // Networking
  networkConfig: AzureNetworkConfig;
  
  // Governance
  policies: AzurePolicyAssignment[];
  blueprints?: string[];
  
  // Cost management
  budgets: AzureBudget[];
  costAllocationTags: Record<string, string>;
}

interface AzureResourceGroup {
  name: string;
  region: AzureRegion;
  purpose: string;
  tags: Record<string, string>;
  resources: AzureResource[];
}

interface AzureResource {
  name: string;
  type: string;  // e.g., "Microsoft.Web/sites"
  sku?: string;
  tier?: string;
  configuration: Record<string, any>;
}

type AzureRegion = 
  | 'eastus' | 'eastus2' | 'westus' | 'westus2' | 'westus3'
  | 'centralus' | 'northcentralus' | 'southcentralus'
  | 'westeurope' | 'northeurope' | 'uksouth' | 'ukwest'
  | 'francecentral' | 'germanywestcentral' | 'switzerlandnorth'
  | 'eastasia' | 'southeastasia' | 'japaneast' | 'japanwest'
  | 'australiaeast' | 'australiasoutheast'
  | 'brazilsouth' | 'canadacentral' | 'canadaeast'
  | string;  // Allow other regions

interface AzureIdentityConfig {
  // Azure AD / Entra ID
  tenantId: string;
  
  // Managed Identities
  systemAssignedIdentities: boolean;
  userAssignedIdentities?: string[];
  
  // Service Principals
  servicePrincipals?: AzureServicePrincipal[];
  
  // RBAC
  roleAssignments: AzureRoleAssignment[];
}

interface AzureNetworkConfig {
  vnets: AzureVNet[];
  privateEndpoints: AzurePrivateEndpoint[];
  applicationGateways?: AzureAppGateway[];
  frontDoors?: AzureFrontDoor[];
}

interface AzureVNet {
  name: string;
  addressSpace: string[];
  subnets: AzureSubnet[];
  peerings?: VNetPeering[];
}

interface AzureSubnet {
  name: string;
  addressPrefix: string;
  networkSecurityGroup?: string;
  serviceEndpoints?: string[];
  delegation?: string;
}
```

### 3.3 AWS Configuration

```typescript
interface AWSConfig {
  // Account organization
  accountId: string;
  organizationId?: string;
  
  // Regions
  primaryRegion: AWSRegion;
  secondaryRegions?: AWSRegion[];
  
  // Identity
  identityConfig: AWSIdentityConfig;
  
  // Networking
  networkConfig: AWSNetworkConfig;
  
  // Governance
  scps?: string[];  // Service Control Policies
  configRules?: string[];
  
  // Cost management
  budgets: AWSBudget[];
  costAllocationTags: Record<string, string>;
}

type AWSRegion = 
  | 'us-east-1' | 'us-east-2' | 'us-west-1' | 'us-west-2'
  | 'eu-west-1' | 'eu-west-2' | 'eu-west-3' | 'eu-central-1' | 'eu-north-1'
  | 'ap-southeast-1' | 'ap-southeast-2' | 'ap-northeast-1' | 'ap-northeast-2'
  | 'ap-south-1' | 'sa-east-1' | 'ca-central-1'
  | string;

interface AWSIdentityConfig {
  // IAM
  roles: AWSRole[];
  policies: AWSPolicy[];
  
  // Cognito (if used)
  cognitoUserPools?: CognitoConfig[];
  
  // SSO
  ssoConfig?: AWSSSOConfig;
}

interface AWSNetworkConfig {
  vpcs: AWSVPC[];
  transitGateways?: AWSTransitGateway[];
  directConnect?: AWSDirectConnect;
}

interface AWSVPC {
  name: string;
  cidrBlock: string;
  subnets: AWSSubnet[];
  internetGateway: boolean;
  natGateways?: NATGatewayConfig[];
  vpcEndpoints?: VPCEndpoint[];
}

interface AWSSubnet {
  name: string;
  cidrBlock: string;
  availabilityZone: string;
  type: 'public' | 'private';
  routeTable: string;
}
```

### 3.4 GCP Configuration

```typescript
interface GCPConfig {
  // Project organization
  projectId: string;
  organizationId?: string;
  folderId?: string;
  
  // Regions
  primaryRegion: GCPRegion;
  secondaryRegions?: GCPRegion[];
  
  // Identity
  identityConfig: GCPIdentityConfig;
  
  // Networking
  networkConfig: GCPNetworkConfig;
  
  // Governance
  organizationPolicies?: string[];
  
  // Cost management
  budgets: GCPBudget[];
  labels: Record<string, string>;
}

type GCPRegion = 
  | 'us-central1' | 'us-east1' | 'us-east4' | 'us-west1' | 'us-west2'
  | 'europe-west1' | 'europe-west2' | 'europe-west3' | 'europe-west4'
  | 'asia-east1' | 'asia-northeast1' | 'asia-southeast1'
  | 'australia-southeast1' | 'southamerica-east1'
  | string;

interface GCPIdentityConfig {
  // IAM
  serviceAccounts: GCPServiceAccount[];
  iamBindings: GCPIAMBinding[];
  
  // Workload Identity
  workloadIdentityPools?: WorkloadIdentityPool[];
}

interface GCPNetworkConfig {
  vpcs: GCPVPC[];
  sharedVpc?: SharedVPCConfig;
  cloudNat?: CloudNATConfig[];
}

interface GCPVPC {
  name: string;
  subnets: GCPSubnet[];
  firewallRules: GCPFirewallRule[];
  privateGoogleAccess: boolean;
}

interface GCPSubnet {
  name: string;
  region: GCPRegion;
  ipCidrRange: string;
  privateIpGoogleAccess: boolean;
  secondaryIpRanges?: SecondaryIPRange[];
}
```

### 3.5 Service Selection Engine

```typescript
class CloudServiceSelectionEngine {
  /**
   * Recommend cloud services based on requirements
   */
  async recommendServices(
    requirements: ServiceRequirements,
    constraints: ServiceConstraints
  ): Promise<ServiceRecommendation[]> {
    const recommendations: ServiceRecommendation[] = [];
    
    // For each requirement, find best matching services
    for (const req of requirements.services) {
      const options = await this.findMatchingServices(req, constraints);
      
      recommendations.push({
        requirementId: req.id,
        category: req.category,
        options: options.map(opt => ({
          provider: opt.provider,
          service: opt.service,
          tier: opt.recommendedTier,
          score: opt.matchScore,
          reasons: opt.reasons,
          tradeoffs: opt.tradeoffs,
          estimatedCost: opt.estimatedCost,
        })),
        recommendation: options[0],  // Best match
      });
    }
    
    return recommendations;
  }
  
  private async findMatchingServices(
    requirement: ServiceRequirement,
    constraints: ServiceConstraints
  ): Promise<ServiceOption[]> {
    const options: ServiceOption[] = [];
    
    // Filter by allowed providers
    const providers = constraints.allowedProviders || ['azure', 'aws', 'gcp'];
    
    for (const provider of providers) {
      const services = await this.getServicesForCategory(
        provider,
        requirement.category
      );
      
      for (const service of services) {
        const matchScore = this.calculateMatchScore(
          requirement,
          service,
          constraints
        );
        
        if (matchScore > 0) {
          options.push({
            provider,
            service: service.name,
            recommendedTier: this.recommendTier(requirement, service),
            matchScore,
            reasons: this.getMatchReasons(requirement, service),
            tradeoffs: this.getTradeoffs(requirement, service),
            estimatedCost: await this.estimateCost(requirement, service),
          });
        }
      }
    }
    
    // Sort by match score
    return options.sort((a, b) => b.matchScore - a.matchScore);
  }
}

interface ServiceRequirements {
  services: ServiceRequirement[];
}

interface ServiceRequirement {
  id: string;
  category: string;
  
  // Functional requirements
  features: string[];
  integrations: string[];
  
  // Non-functional requirements
  availability: '99%' | '99.9%' | '99.95%' | '99.99%';
  latency?: number;  // ms
  throughput?: number;  // requests/second or messages/second
  storage?: string;  // e.g., "100GB", "1TB"
  
  // Compliance
  compliance?: string[];  // e.g., ['HIPAA', 'GDPR', 'SOC2']
  dataResidency?: string[];  // Required regions
  
  // Preferences
  managedPreferred: boolean;
  openSourcePreferred?: boolean;
}

interface ServiceConstraints {
  allowedProviders?: CloudProvider[];
  blockedServices?: string[];
  budgetPerMonth?: number;
  requiredCertifications?: string[];
  preferredRegions?: string[];
}
```

---

## 4. CONTAINER ARCHITECTURE PLANNING

### 4.1 Docker Planning

```typescript
interface DockerConfig {
  // Dockerfile configuration
  dockerfiles: DockerfileConfig[];
  
  // Docker Compose (for dev/staging)
  composeFiles: DockerComposeConfig[];
  
  // Registry configuration
  registries: ContainerRegistryConfig[];
  
  // Base image strategy
  baseImageStrategy: BaseImageStrategy;
  
  // Security
  securityConfig: DockerSecurityConfig;
  
  // Build optimization
  buildOptimization: DockerBuildOptimization;
}

interface DockerfileConfig {
  name: string;
  path: string;
  
  // Target module(s)
  moduleIds: string[];
  
  // Base image
  baseImage: BaseImageConfig;
  
  // Build stages (multi-stage)
  stages: DockerStage[];
  
  // Final configuration
  expose: number[];
  entrypoint?: string[];
  cmd?: string[];
  workdir: string;
  user?: string;
  
  // Labels
  labels: Record<string, string>;
  
  // Health check
  healthCheck?: DockerHealthCheck;
  
  // Best practices compliance
  compliance: DockerfileBestPractices;
}

interface DockerStage {
  name: string;
  baseImage: string;
  purpose: 'build' | 'test' | 'runtime' | 'development';
  
  // Instructions
  instructions: DockerInstruction[];
  
  // Artifacts to copy to next stage
  artifacts?: string[];
}

interface DockerInstruction {
  type: 'RUN' | 'COPY' | 'ADD' | 'ENV' | 'ARG' | 'WORKDIR' | 'USER' | 'EXPOSE' | 'VOLUME' | 'LABEL';
  value: string | string[];
  comment?: string;
}

interface BaseImageConfig {
  image: string;
  tag: string;
  digest?: string;  // For immutability
  
  // Justification
  reason: string;
  
  // Update strategy
  updatePolicy: 'manual' | 'patch' | 'minor' | 'latest';
}

interface BaseImageStrategy {
  // Approved base images
  approvedImages: ApprovedBaseImage[];
  
  // Image scanning requirements
  scanningRequired: boolean;
  maxVulnerabilities: {
    critical: number;
    high: number;
    medium: number;
  };
  
  // Update policy
  updateFrequency: 'weekly' | 'monthly' | 'quarterly';
  
  // Custom base images
  customBaseImages?: CustomBaseImage[];
}

interface ApprovedBaseImage {
  name: string;
  tags: string[];
  useCases: string[];
  securityRating: 'high' | 'medium' | 'low';
  maintainer: string;
  lastReviewed: Date;
}

const RECOMMENDED_BASE_IMAGES: ApprovedBaseImage[] = [
  // Node.js
  {
    name: 'node',
    tags: ['20-alpine', '20-slim', '18-alpine', '18-slim'],
    useCases: ['Node.js applications', 'React/Vue/Angular builds'],
    securityRating: 'high',
    maintainer: 'Docker Official',
    lastReviewed: new Date(),
  },
  // Python
  {
    name: 'python',
    tags: ['3.12-slim', '3.11-slim', '3.12-alpine'],
    useCases: ['Python applications', 'ML workloads'],
    securityRating: 'high',
    maintainer: 'Docker Official',
    lastReviewed: new Date(),
  },
  // .NET
  {
    name: 'mcr.microsoft.com/dotnet/aspnet',
    tags: ['8.0-alpine', '8.0', '7.0-alpine'],
    useCases: ['.NET applications'],
    securityRating: 'high',
    maintainer: 'Microsoft',
    lastReviewed: new Date(),
  },
  // Java
  {
    name: 'eclipse-temurin',
    tags: ['21-jre-alpine', '21-jre', '17-jre-alpine'],
    useCases: ['Java applications', 'Spring Boot'],
    securityRating: 'high',
    maintainer: 'Eclipse Foundation',
    lastReviewed: new Date(),
  },
  // Go
  {
    name: 'golang',
    tags: ['1.22-alpine'],
    useCases: ['Go application builds'],
    securityRating: 'high',
    maintainer: 'Docker Official',
    lastReviewed: new Date(),
  },
  // Distroless (minimal)
  {
    name: 'gcr.io/distroless/base-debian12',
    tags: ['latest', 'nonroot'],
    useCases: ['Minimal runtime containers'],
    securityRating: 'high',
    maintainer: 'Google',
    lastReviewed: new Date(),
  },
];

interface DockerBuildOptimization {
  // Multi-stage builds
  multiStageEnabled: boolean;
  stages: {
    build: boolean;
    test: boolean;
    runtime: boolean;
  };
  
  // Layer optimization
  layerOptimization: {
    combineRuns: boolean;
    orderByChangeFrequency: boolean;
    useCache: boolean;
  };
  
  // Size optimization
  sizeOptimization: {
    useAlpine: boolean;
    useSlim: boolean;
    removeDevDependencies: boolean;
    cleanupAptCache: boolean;
  };
  
  // Build arguments
  buildArgs: Record<string, string>;
  
  // Target size
  targetSize: {
    max: string;  // e.g., "500MB"
    warning: string;  // e.g., "300MB"
  };
}

interface DockerSecurityConfig {
  // User configuration
  runAsNonRoot: boolean;
  readOnlyRootFilesystem: boolean;
  
  // Capabilities
  dropAllCapabilities: boolean;
  addCapabilities?: string[];
  
  // Secrets management
  secretsManagement: 'build-args' | 'docker-secrets' | 'external-vault';
  
  // Scanning
  scanOnBuild: boolean;
  scanOnPush: boolean;
  scanSchedule?: string;  // Cron
  
  // Signing
  contentTrust: boolean;
  signImages: boolean;
  
  // Network
  noNewPrivileges: boolean;
}

interface DockerComposeConfig {
  name: string;
  path: string;
  environment: 'development' | 'testing' | 'staging';
  
  services: ComposeService[];
  networks: ComposeNetwork[];
  volumes: ComposeVolume[];
  secrets?: ComposeSecret[];
  
  // Profiles for different scenarios
  profiles: ComposeProfile[];
}

interface ComposeService {
  name: string;
  moduleId?: string;
  
  build?: {
    context: string;
    dockerfile: string;
    target?: string;
    args?: Record<string, string>;
  };
  
  image?: string;
  
  ports: string[];
  environment: Record<string, string>;
  envFile?: string[];
  
  volumes: string[];
  networks: string[];
  
  depends_on: ComposeDependency[];
  
  healthcheck?: DockerHealthCheck;
  
  deploy?: {
    replicas: number;
    resources: {
      limits: { cpus: string; memory: string };
      reservations: { cpus: string; memory: string };
    };
  };
}
```

### 4.2 Container Registry Planning

```typescript
interface ContainerRegistryConfig {
  provider: RegistryProvider;
  
  // Registry details
  name: string;
  url: string;
  
  // Authentication
  authentication: RegistryAuth;
  
  // Image organization
  namingStrategy: ImageNamingStrategy;
  
  // Retention policies
  retentionPolicies: ImageRetentionPolicy[];
  
  // Security
  scanning: RegistryScanning;
  
  // Replication (for geo-redundancy)
  replication?: RegistryReplication[];
}

type RegistryProvider = 
  | 'acr'           // Azure Container Registry
  | 'ecr'           // AWS Elastic Container Registry
  | 'gcr'           // Google Container Registry
  | 'gar'           // Google Artifact Registry
  | 'docker_hub'    // Docker Hub
  | 'ghcr'          // GitHub Container Registry
  | 'harbor'        // Harbor (self-hosted)
  | 'nexus';        // Nexus (self-hosted)

interface ImageNamingStrategy {
  // Pattern: registry/namespace/image:tag
  namespace: string;  // Usually project or team name
  
  // Tagging strategy
  tagging: {
    useGitSha: boolean;
    useGitTag: boolean;
    useSemver: boolean;
    useTimestamp: boolean;
    latest: 'always' | 'releases_only' | 'never';
  };
  
  // Examples of generated tags
  examples: string[];
}

interface ImageRetentionPolicy {
  name: string;
  
  // What to retain
  retain: {
    // Keep N most recent
    count?: number;
    // Keep images newer than X days
    days?: number;
    // Keep tagged with these patterns
    tagPatterns?: string[];
  };
  
  // What to delete
  delete: {
    // Delete untagged
    untagged: boolean;
    // Delete older than X days
    olderThanDays?: number;
    // Delete matching patterns
    tagPatterns?: string[];
  };
  
  // Schedule
  schedule: string;  // Cron expression
}

interface RegistryScanning {
  enabled: boolean;
  
  // When to scan
  scanOnPush: boolean;
  scanSchedule?: string;
  
  // Vulnerability thresholds
  thresholds: {
    critical: number;  // Block if exceeded
    high: number;
    medium: number;
  };
  
  // Actions
  blockOnVulnerabilities: boolean;
  notifyOnVulnerabilities: boolean;
  
  // Scanning tool
  scanner: 'trivy' | 'clair' | 'anchore' | 'snyk' | 'native';
}
```

### 4.3 Kubernetes Planning

```typescript
interface KubernetesConfig {
  // Cluster configuration
  cluster: KubernetesClusterConfig;
  
  // Namespace organization
  namespaces: KubernetesNamespace[];
  
  // Workload configurations
  workloads: KubernetesWorkload[];
  
  // Services and networking
  services: KubernetesService[];
  ingress: IngressConfig;
  
  // Configuration management
  configMaps: ConfigMapConfig[];
  secrets: SecretConfig[];
  
  // Storage
  storage: StorageConfig[];
  
  // RBAC
  rbac: KubernetesRBAC;
  
  // Autoscaling
  autoscaling: AutoscalingConfig;
  
  // Observability
  observability: K8sObservabilityConfig;
  
  // GitOps
  gitops?: GitOpsConfig;
}

interface KubernetesClusterConfig {
  // Managed service
  provider: 'aks' | 'eks' | 'gke' | 'self_managed';
  
  // Version
  version: string;
  upgradePolicy: 'manual' | 'automatic_patch' | 'automatic_minor';
  
  // Node pools
  nodePools: NodePoolConfig[];
  
  // Networking
  networking: {
    networkPlugin: 'azure-cni' | 'kubenet' | 'calico' | 'cilium';
    networkPolicy: boolean;
    podCidr: string;
    serviceCidr: string;
    dnsServiceIP: string;
  };
  
  // Security
  security: {
    privateCluster: boolean;
    authorizedIpRanges?: string[];
    aadIntegration: boolean;
    podSecurityPolicies: boolean;
    secretsEncryption: boolean;
  };
  
  // Add-ons
  addons: {
    ingressController: 'nginx' | 'traefik' | 'azure_app_gateway' | 'aws_alb';
    certManager: boolean;
    externalDns: boolean;
    monitoring: 'prometheus' | 'datadog' | 'native';
    logging: 'fluentd' | 'fluent-bit' | 'native';
    serviceMesh?: 'istio' | 'linkerd' | 'consul';
  };
}

interface NodePoolConfig {
  name: string;
  
  // Node size
  vmSize: string;  // e.g., "Standard_D4s_v3"
  
  // Scaling
  minNodes: number;
  maxNodes: number;
  initialNodes: number;
  
  // Node configuration
  osDiskSizeGB: number;
  osDiskType: 'Managed' | 'Ephemeral';
  
  // Labels and taints
  labels: Record<string, string>;
  taints: NodeTaint[];
  
  // Availability
  availabilityZones?: string[];
  
  // Auto-scaling
  autoscaling: {
    enabled: boolean;
    scaleDownDelay: string;
    scaleDownUnneededTime: string;
  };
}

interface KubernetesWorkload {
  name: string;
  moduleId: string;  // Link to module
  
  // Workload type
  type: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Job' | 'CronJob';
  
  // Namespace
  namespace: string;
  
  // Pod spec
  replicas: {
    min: number;
    max: number;
    default: number;
  };
  
  containers: ContainerSpec[];
  
  // Scheduling
  scheduling: {
    nodeSelector?: Record<string, string>;
    affinity?: AffinityConfig;
    tolerations?: Toleration[];
    priorityClassName?: string;
  };
  
  // Update strategy
  updateStrategy: {
    type: 'RollingUpdate' | 'Recreate';
    maxSurge?: string;
    maxUnavailable?: string;
  };
  
  // Pod disruption budget
  pdb?: {
    minAvailable?: number | string;
    maxUnavailable?: number | string;
  };
}

interface ContainerSpec {
  name: string;
  image: string;
  
  // Resources
  resources: {
    requests: { cpu: string; memory: string };
    limits: { cpu: string; memory: string };
  };
  
  // Ports
  ports: ContainerPort[];
  
  // Environment
  env: EnvVar[];
  envFrom?: EnvFromSource[];
  
  // Volumes
  volumeMounts: VolumeMount[];
  
  // Probes
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  startupProbe?: Probe;
  
  // Security context
  securityContext: ContainerSecurityContext;
  
  // Lifecycle hooks
  lifecycle?: {
    preStop?: LifecycleHandler;
    postStart?: LifecycleHandler;
  };
}

interface ContainerSecurityContext {
  runAsNonRoot: boolean;
  runAsUser?: number;
  runAsGroup?: number;
  readOnlyRootFilesystem: boolean;
  allowPrivilegeEscalation: boolean;
  capabilities?: {
    drop: string[];
    add?: string[];
  };
  seccompProfile?: {
    type: 'RuntimeDefault' | 'Localhost' | 'Unconfined';
    localhostProfile?: string;
  };
}

interface AutoscalingConfig {
  hpa: HPAConfig[];
  vpa?: VPAConfig[];
  keda?: KEDAConfig[];
}

interface HPAConfig {
  name: string;
  targetRef: {
    kind: string;
    name: string;
  };
  
  minReplicas: number;
  maxReplicas: number;
  
  metrics: HPAMetric[];
  
  behavior?: {
    scaleUp: ScalingBehavior;
    scaleDown: ScalingBehavior;
  };
}

interface HPAMetric {
  type: 'Resource' | 'Pods' | 'Object' | 'External';
  
  // For Resource type
  resource?: {
    name: 'cpu' | 'memory';
    target: {
      type: 'Utilization' | 'AverageValue';
      averageUtilization?: number;
      averageValue?: string;
    };
  };
  
  // For custom metrics
  pods?: {
    metric: { name: string };
    target: { type: 'AverageValue'; averageValue: string };
  };
}
```

---

*Continued in Part 2...*

