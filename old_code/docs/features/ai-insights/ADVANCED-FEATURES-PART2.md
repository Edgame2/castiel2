# AI Insights Advanced Features - Part 2

## Overview

This document covers additional advanced features including insight dependencies, export & integration, disaster recovery, multi-language support, and super admin configuration.

---

## 7. Insight Dependencies & Relationships

### Database Schema

#### Dependency Document

**Container**: `graph` with HPK `[tenantId, sourceInsightId, targetInsightId]`

Document types: `dependency`, `relationship`, `sequence`, `cluster`

```typescript
interface InsightDependency {
  type: 'dependency';
  partitionKey: [string, string, string];  // [tenantId, sourceInsightId, targetInsightId]
  
  // Source insight
  sourceInsightId: string;
  sourceConversationId: string;
  
  // Dependent insights
  dependencies: Array<{
    insightId: string;
    relationshipType: 'follows' | 'references' | 'updates' | 'contradicts' | 'supports';
    strength: number;  // 0-1
    createdAt: Date;
  }>;
  
  // Reverse dependencies (what depends on this)
  dependents: Array<{
    insightId: string;
    relationshipType: string;
    strength: number;
  }>;
  
  // Impact tracking
  impact: {
    directDependents: number;
    indirectDependents: number;
    totalImpactScore: number;
  };
  
  // Change propagation
  propagation: {
    autoUpdate: boolean;
    notifyDependents: boolean;
    lastPropagatedAt?: Date;
  };
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|conversationId
}
```

#### Relationship Document

**Container**: `graph` with HPK `[tenantId, sourceInsightId, targetInsightId]`

```typescript
interface InsightRelationship {
  type: 'relationship' | 'sequence' | 'cluster';
  partitionKey: [string, string, string];  // [tenantId, sourceInsightId, targetInsightId]
  
  // Insights involved
  insights: {
    primary: string;
    related: string[];
  };
  
  // Relationship details
  relationshipType: 'sequence' | 'cluster' | 'contradiction' | 'timeline';
  
  // Sequence (for ordered insights)
  sequence?: {
    order: number[];
    totalSteps: number;
  };
  
  // Cluster (for related insights)
  cluster?: {
    clusterId: string;
    clusterName: string;
    similarity: number;
  };
  
  // Timeline
  timeline?: {
    startDate: Date;
    endDate: Date;
    milestones: Array<{
      insightId: string;
      date: Date;
      label: string;
    }>;
  };
  
  // Visualization
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
    }>;
  };
  
  // Hierarchical Partition Key
  pk: string;  // tenantId
}
```

### API Reference

#### Link Insights

```http
POST /api/v1/insights/{insightId}/link
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  targetInsightId: string;
  relationshipType: 'follows' | 'references' | 'updates' | 'contradicts' | 'supports';
  strength?: number;  // 0-1, default: 0.8
  autoUpdate?: boolean;
  notifyDependents?: boolean;
}
```

#### Get Dependency Graph

```http
GET /api/v1/insights/{insightId}/dependencies
Authorization: Bearer {token}
```

**Query Parameters**:
- `depth`: Maximum depth to traverse (default: 3)
- `direction`: 'forward' | 'backward' | 'both'

**Response**:
```typescript
{
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      metadata: any;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
    }>;
  };
  impactAnalysis: {
    directDependents: number;
    totalReach: number;
  };
}
```

#### Detect Related Insights

```http
POST /api/v1/insights/{insightId}/detect-related
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  related: Array<{
    insightId: string;
    relationshipType: string;
    similarity: number;
    reason: string;
  }>;
}
```

### UI Specifications

```typescript
<InsightDependencyView>
  <Header>
    <Title>Insight Dependencies</Title>
    <Actions>
      <Button onClick={detectRelated}>
        <Icon name="sparkles" />
        Detect Related
      </Button>
      <Button onClick={linkInsight}>
        <Icon name="link" />
        Link Insight
      </Button>
    </Actions>
  </Header>
  
  <DependencyGraph>
    <GraphCanvas>
      {/* Render force-directed graph */}
      <ForceGraph
        nodes={graph.nodes}
        edges={graph.edges}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        options={{
          nodeColor: node => getNodeColor(node.type),
          edgeWidth: edge => edge.weight * 5,
          layout: 'force'
        }}
      />
    </GraphCanvas>
    
    <GraphControls>
      <IconButton icon="zoom-in" onClick={zoomIn} />
      <IconButton icon="zoom-out" onClick={zoomOut} />
      <IconButton icon="maximize" onClick={fitToScreen} />
      <Select 
        label="Layout"
        value={layout}
        options={['force', 'hierarchical', 'radial']}
        onChange={setLayout}
      />
    </GraphControls>
  </DependencyGraph>
  
  <RelationshipList>
    <Section title="Dependencies">
      {dependencies.map(dep => (
        <RelationshipCard key={dep.insightId}>
          <RelationshipType type={dep.relationshipType} />
          <InsightPreview insightId={dep.insightId} />
          <Strength value={dep.strength} />
          <Actions>
            <IconButton icon="edit" onClick={() => editRelationship(dep)} />
            <IconButton icon="trash" onClick={() => removeRelationship(dep)} />
          </Actions>
        </RelationshipCard>
      ))}
    </Section>
    
    <Section title="Dependents">
      {dependents.map(dep => (
        <RelationshipCard key={dep.insightId}>
          <RelationshipType type={dep.relationshipType} />
          <InsightPreview insightId={dep.insightId} />
          <Strength value={dep.strength} />
        </RelationshipCard>
      ))}
    </Section>
  </RelationshipList>
  
  <ImpactAnalysis>
    <Metric label="Direct Dependents" value={impact.directDependents} />
    <Metric label="Total Reach" value={impact.indirectDependents} />
    <Metric label="Impact Score" value={impact.totalImpactScore} />
    
    {impact.totalImpactScore > 0.7 && (
      <Alert severity="info">
        This insight has high impact. Changes may affect {impact.indirectDependents} other insights.
      </Alert>
    )}
  </ImpactAnalysis>
</InsightDependencyView>
```

---

## 8. Export & Integration

### Database Schema

#### Export Job Document

**Container**: `exports` with HPK `[tenantId, exportJobId, integrationId]`

Document types: `export_job`, `integration`, `webhook_delivery`

```typescript
interface ExportJob {
  type: 'export_job';
  partitionKey: [string, string, string];  // [tenantId, exportJobId, 'system']
  
  // Export details
  exportType: 'pdf' | 'docx' | 'csv' | 'json' | 'markdown';
  scope: {
    conversationIds?: string[];
    insightIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    filters?: any;
  };
  
  // Configuration
  config: {
    includeContext: boolean;
    includeCitations: boolean;
    includeAudit: boolean;
    includeComments: boolean;
    template?: string;
  };
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  
  // Output
  output?: {
    url: string;
    fileName: string;
    size: number;
    expiresAt: Date;
  };
  
  // Error
  error?: {
    code: string;
    message: string;
  };
  
  // Metadata
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|userId
}
```

#### Integration Document

**Container**: `exports` with HPK `[tenantId, exportJobId, integrationId]`

```typescript
interface Integration {
  type: 'integration';
  partitionKey: [string, string, string];  // [tenantId, 'integrations', integrationId]
  
  // Integration details
  provider: 'slack' | 'teams' | 'jira' | 'confluence' | 'sharepoint' | 'notion' | 'webhook';
  name: string;
  description?: string;
  
  // Authentication
  auth: {
    type: 'oauth' | 'api_key' | 'webhook';
    credentials?: any;  // Encrypted
    expiresAt?: Date;
  };
  
  // Configuration
  config: {
    autoSync: boolean;
    syncFrequency?: string;  // cron
    direction: 'export' | 'import' | 'bidirectional';
    
    // Mapping
    fieldMapping?: Record<string, string>;
    
    // Filters
    filters?: {
      categories?: string[];
      tags?: string[];
      minQuality?: number;
    };
  };
  
  // Sync status
  lastSync?: {
    startedAt: Date;
    completedAt: Date;
    itemsSynced: number;
    errors: number;
  };
  
  // Webhooks
  webhooks?: Array<{
    event: string;
    url: string;
    secret: string;
  }>;
  
  // Status
  enabled: boolean;
  healthy: boolean;
  
  // Hierarchical Partition Key
  pk: string;  // tenantId
}
```

### API Reference

#### Create Export

```http
POST /api/v1/insights/export
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  exportType: 'pdf' | 'docx' | 'csv' | 'json' | 'markdown';
  scope: {
    conversationIds?: string[];
    insightIds?: string[];
    dateRange?: DateRange;
  };
  config: {
    includeContext: boolean;
    includeCitations: boolean;
    template?: string;
  };
}
```

**Response**:
```typescript
{
  jobId: string;
  status: 'pending';
  estimatedCompletionTime: number;  // seconds
}
```

#### Get Export Status

```http
GET /api/v1/insights/export/{jobId}
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  output?: {
    downloadUrl: string;
    expiresAt: Date;
  };
  error?: Error;
}
```

#### Create Integration

```http
POST /api/v1/insights/integrations
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  provider: 'slack' | 'teams' | 'jira' | 'confluence' | 'webhook';
  name: string;
  auth: {
    type: 'oauth' | 'api_key' | 'webhook';
    credentials: any;
  };
  config: IntegrationConfig;
}
```

#### Trigger Sync

```http
POST /api/v1/insights/integrations/{integrationId}/sync
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  syncJobId: string;
  status: 'started';
}
```

### UI Specifications

```typescript
<ExportDialog>
  <DialogTitle>Export Insights</DialogTitle>
  
  <DialogContent>
    <Section title="Format">
      <RadioGroup value={exportType} onChange={setExportType}>
        <Radio value="pdf" label="PDF Document" />
        <Radio value="docx" label="Word Document" />
        <Radio value="csv" label="CSV Spreadsheet" />
        <Radio value="json" label="JSON (API)" />
        <Radio value="markdown" label="Markdown" />
      </RadioGroup>
    </Section>
    
    <Section title="Scope">
      <RadioGroup value={scopeType} onChange={setScopeType}>
        <Radio value="conversation" label="Entire Conversation" />
        <Radio value="selected" label="Selected Insights" />
        <Radio value="dateRange" label="Date Range" />
      </RadioGroup>
      
      {scopeType === 'selected' && (
        <InsightSelector 
          selected={selectedInsights}
          onChange={setSelectedInsights}
        />
      )}
      
      {scopeType === 'dateRange' && (
        <DateRangePicker 
          start={dateRange.start}
          end={dateRange.end}
          onChange={setDateRange}
        />
      )}
    </Section>
    
    <Section title="Options">
      <Checkbox 
        label="Include context shards"
        checked={config.includeContext}
        onChange={v => setConfig({ ...config, includeContext: v })}
      />
      <Checkbox 
        label="Include citations"
        checked={config.includeCitations}
        onChange={v => setConfig({ ...config, includeCitations: v })}
      />
      <Checkbox 
        label="Include audit trail"
        checked={config.includeAudit}
        onChange={v => setConfig({ ...config, includeAudit: v })}
      />
      <Checkbox 
        label="Include comments"
        checked={config.includeComments}
        onChange={v => setConfig({ ...config, includeComments: v })}
      />
    </Section>
    
    {exportType === 'pdf' || exportType === 'docx' && (
      <Section title="Template">
        <Select 
          label="Document Template"
          value={config.template}
          options={templates}
          onChange={v => setConfig({ ...config, template: v })}
        />
      </Section>
    )}
  </DialogContent>
  
  <DialogActions>
    <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
    <Button onClick={startExport}>
      <Icon name="download" />
      Export
    </Button>
  </DialogActions>
</ExportDialog>

<IntegrationSetup>
  <Header>
    <Title>Integrations</Title>
    <Button onClick={addIntegration}>
      <Icon name="plus" />
      Add Integration
    </Button>
  </Header>
  
  <IntegrationGrid>
    {providers.map(provider => (
      <ProviderCard key={provider.id}>
        <ProviderLogo src={provider.logo} />
        <ProviderName>{provider.name}</ProviderName>
        <ProviderDescription>{provider.description}</ProviderDescription>
        
        {hasIntegration(provider.id) ? (
          <Badge color="success">
            <Icon name="check" />
            Connected
          </Badge>
        ) : (
          <Button onClick={() => connectProvider(provider.id)}>
            Connect
          </Button>
        )}
      </ProviderCard>
    ))}
  </IntegrationGrid>
  
  <ActiveIntegrations>
    <SectionHeader>Active Integrations</SectionHeader>
    
    {integrations.map(integration => (
      <IntegrationCard key={integration.id}>
        <IntegrationHeader>
          <ProviderLogo src={getProviderLogo(integration.provider)} size="sm" />
          <IntegrationName>{integration.name}</IntegrationName>
          <StatusIndicator healthy={integration.healthy} />
        </IntegrationHeader>
        
        <IntegrationDetails>
          <Detail label="Last Sync">{formatDate(integration.lastSync?.completedAt)}</Detail>
          <Detail label="Items Synced">{integration.lastSync?.itemsSynced}</Detail>
          <Detail label="Direction">{integration.config.direction}</Detail>
        </IntegrationDetails>
        
        <IntegrationActions>
          <Button size="sm" onClick={() => triggerSync(integration.id)}>
            <Icon name="refresh" />
            Sync Now
          </Button>
          <IconButton icon="settings" onClick={() => configureIntegration(integration.id)} />
          <IconButton icon="trash" onClick={() => removeIntegration(integration.id)} />
        </IntegrationActions>
      </IntegrationCard>
    ))}
  </ActiveIntegrations>
</IntegrationSetup>
```

---

## 9. Disaster Recovery

### Database Schema

#### Backup Job Document

**Container**: `backups` with HPK `[tenantId, backupJobId, recoveryPointId]`

Document types: `backup_job`, `recovery_point`, `backup_metadata`

```typescript
interface BackupJob {
  type: 'backup_job';
  partitionKey: [string, string, string];  // [tenantId, backupJobId, 'system']
  
  // Backup details
  backupType: 'full' | 'incremental' | 'differential';
  scope: {
    tenantIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  
  // Configuration
  config: {
    compression: boolean;
    encryption: boolean;
    retentionDays: number;
    storageLocation: string;
  };
  
  // Status
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  
  // Output
  output?: {
    backupId: string;
    size: number;
    location: string;
    checksum: string;
  };
  
  // Timing
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;  // seconds
  
  // Error
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  
  // Hierarchical Partition Key
  pk: string;  // system|date
}
```

#### Recovery Point Document

**Container**: `backups` with HPK `[tenantId, backupJobId, recoveryPointId]`

```typescript
interface RecoveryPoint {
  type: 'recovery_point';
  partitionKey: [string, string, string];  // [tenantId, backupJobId, recoveryPointId]
  
  // Recovery point details
  backupId: string;
  timestamp: Date;
  type: 'full' | 'incremental' | 'differential';
  
  // Content
  content: {
    tenants: string[];
    shardTypes: string[];
    itemCount: number;
    size: number;
  };
  
  // Storage
  storage: {
    location: string;
    encryption: boolean;
    compressed: boolean;
    checksum: string;
  };
  
  // Verification
  verified: boolean;
  verifiedAt?: Date;
  verificationStatus?: 'passed' | 'failed' | 'partial';
  
  // Retention
  expiresAt: Date;
  canRestore: boolean;
  
  // Hierarchical Partition Key
  pk: string;  // system
}
```

### API Reference

#### Create Backup

```http
POST /api/v1/admin/disaster-recovery/backup
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  backupType: 'full' | 'incremental';
  scope?: {
    tenantIds?: string[];
  };
  config?: {
    encryption: boolean;
    compression: boolean;
  };
}
```

**Response**:
```typescript
{
  jobId: string;
  status: 'pending';
  estimatedDuration: number;  // seconds
}
```

#### List Recovery Points

```http
GET /api/v1/admin/disaster-recovery/recovery-points
Authorization: Bearer {token}
```

**Query Parameters**:
- `startDate`: Filter by date
- `endDate`: Filter by date
- `type`: Filter by backup type

**Response**:
```typescript
{
  recoveryPoints: Array<{
    id: string;
    timestamp: Date;
    type: string;
    itemCount: number;
    size: number;
    verified: boolean;
    canRestore: boolean;
  }>;
}
```

#### Restore from Recovery Point

```http
POST /api/v1/admin/disaster-recovery/restore
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  recoveryPointId: string;
  scope?: {
    tenantIds?: string[];
    shardTypes?: string[];
  };
  mode: 'full' | 'partial';
  dryRun: boolean;
}
```

**Response**:
```typescript
{
  restoreJobId: string;
  status: 'started';
  estimatedDuration: number;
}
```

### Implementation

```typescript
// apps/api/src/services/ai-insights/disaster-recovery.service.ts
export class DisasterRecoveryService {
  async createBackup(options: BackupOptions): Promise<string> {
    const jobId = uuid();
    
    // Create backup job
    await this.createBackupJob(jobId, options);
    
    // Start backup process
    await this.queueBackupJob(jobId);
    
    return jobId;
  }
  
  async performBackup(jobId: string): Promise<void> {
    const job = await this.getBackupJob(jobId);
    
    try {
      // Update status
      await this.updateJobStatus(jobId, 'running');
      
      // Get data to backup
      const data = await this.collectBackupData(job.scope);
      
      // Compress if enabled
      let backupData = data;
      if (job.config.compression) {
        backupData = await this.compress(data);
      }
      
      // Encrypt if enabled
      if (job.config.encryption) {
        backupData = await this.encrypt(backupData);
      }
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(backupData);
      
      // Upload to storage
      const location = await this.uploadToStorage(backupData, job.config.storageLocation);
      
      // Create recovery point
      await this.createRecoveryPoint({
        backupId: jobId,
        type: job.backupType,
        location,
        checksum,
        size: backupData.length
      });
      
      // Update job
      await this.updateJobStatus(jobId, 'completed', {
        backupId: jobId,
        size: backupData.length,
        location,
        checksum
      });
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', null, error);
    }
  }
  
  async restore(recoveryPointId: string, options: RestoreOptions): Promise<string> {
    const jobId = uuid();
    
    if (options.dryRun) {
      // Validate recovery point
      const validation = await this.validateRecoveryPoint(recoveryPointId);
      return validation;
    }
    
    // Start restore process
    await this.queueRestoreJob(jobId, recoveryPointId, options);
    
    return jobId;
  }
  
  async performRestore(jobId: string, recoveryPointId: string, options: RestoreOptions): Promise<void> {
    const recoveryPoint = await this.getRecoveryPoint(recoveryPointId);
    
    try {
      // Download backup
      const backupData = await this.downloadFromStorage(recoveryPoint.storage.location);
      
      // Verify checksum
      const checksum = await this.calculateChecksum(backupData);
      if (checksum !== recoveryPoint.storage.checksum) {
        throw new Error('Checksum mismatch');
      }
      
      // Decrypt if needed
      let data = backupData;
      if (recoveryPoint.storage.encryption) {
        data = await this.decrypt(data);
      }
      
      // Decompress if needed
      if (recoveryPoint.storage.compressed) {
        data = await this.decompress(data);
      }
      
      // Restore data
      await this.restoreData(data, options.scope);
      
      // Update job
      await this.updateJobStatus(jobId, 'completed');
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', null, error);
    }
  }
}
```

### UI Specifications

```typescript
<DisasterRecoveryDashboard>
  <Header>
    <Title>Disaster Recovery</Title>
    <Actions>
      <Button onClick={createBackup}>
        <Icon name="database" />
        Create Backup
      </Button>
      <Button onClick={scheduleBackup}>
        <Icon name="clock" />
        Schedule Backup
      </Button>
    </Actions>
  </Header>
  
  <BackupStatus>
    <StatusCard>
      <Label>Last Backup</Label>
      <Value>{formatDate(lastBackup?.completedAt)}</Value>
      <SubValue>{formatDuration(timeSinceLastBackup)}</SubValue>
    </StatusCard>
    
    <StatusCard>
      <Label>Recovery Points</Label>
      <Value>{recoveryPoints.length}</Value>
      <SubValue>{formatBytes(totalBackupSize)}</SubValue>
    </StatusCard>
    
    <StatusCard>
      <Label>Oldest Recovery Point</Label>
      <Value>{formatDate(oldestRecoveryPoint?.timestamp)}</Value>
      <SubValue>{formatDuration(ageOfOldest)}</SubValue>
    </StatusCard>
  </BackupStatus>
  
  <RecoveryPointsList>
    <ListHeader>
      <Column>Timestamp</Column>
      <Column>Type</Column>
      <Column>Items</Column>
      <Column>Size</Column>
      <Column>Status</Column>
      <Column>Actions</Column>
    </ListHeader>
    
    {recoveryPoints.map(rp => (
      <RecoveryPointRow key={rp.id}>
        <Cell>{formatDate(rp.timestamp)}</Cell>
        <Cell>
          <Badge color={rp.type === 'full' ? 'primary' : 'secondary'}>
            {rp.type}
          </Badge>
        </Cell>
        <Cell>{rp.itemCount.toLocaleString()}</Cell>
        <Cell>{formatBytes(rp.size)}</Cell>
        <Cell>
          {rp.verified ? (
            <Badge color="success">
              <Icon name="check-circle" />
              Verified
            </Badge>
          ) : (
            <Badge color="warning">
              <Icon name="alert-circle" />
              Unverified
            </Badge>
          )}
        </Cell>
        <Cell>
          <Actions>
            <IconButton 
              icon="info"
              onClick={() => viewDetails(rp.id)}
              tooltip="View Details"
            />
            <IconButton 
              icon="refresh"
              onClick={() => verifyRecoveryPoint(rp.id)}
              tooltip="Verify"
            />
            {rp.canRestore && (
              <IconButton 
                icon="upload"
                onClick={() => openRestoreDialog(rp.id)}
                tooltip="Restore"
              />
            )}
          </Actions>
        </Cell>
      </RecoveryPointRow>
    ))}
  </RecoveryPointsList>
  
  <BackupSchedule>
    <SectionHeader>Backup Schedule</SectionHeader>
    
    <ScheduleConfig>
      <FormField>
        <Label>Frequency</Label>
        <Select 
          value={schedule.frequency}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
          onChange={v => setSchedule({ ...schedule, frequency: v })}
        />
      </FormField>
      
      <FormField>
        <Label>Time</Label>
        <TimeInput 
          value={schedule.time}
          onChange={v => setSchedule({ ...schedule, time: v })}
        />
      </FormField>
      
      <FormField>
        <Label>Backup Type</Label>
        <RadioGroup value={schedule.type} onChange={v => setSchedule({ ...schedule, type: v })}>
          <Radio value="full" label="Full Backup" />
          <Radio value="incremental" label="Incremental Backup" />
        </RadioGroup>
      </FormField>
      
      <FormField>
        <Label>Retention Period</Label>
        <Input 
          type="number"
          value={schedule.retentionDays}
          onChange={v => setSchedule({ ...schedule, retentionDays: v })}
          suffix="days"
        />
      </FormField>
      
      <Button onClick={saveSchedule}>Save Schedule</Button>
    </ScheduleConfig>
  </BackupSchedule>
</DisasterRecoveryDashboard>

{/* Restore Dialog */}
<RestoreDialog open={showRestoreDialog}>
  <DialogTitle>Restore from Recovery Point</DialogTitle>
  
  <DialogContent>
    <Alert severity="warning">
      <AlertTitle>Warning</AlertTitle>
      Restoring will overwrite current data. This action cannot be undone.
    </Alert>
    
    <RecoveryPointInfo>
      <InfoRow label="Timestamp">{formatDate(selectedRP.timestamp)}</InfoRow>
      <InfoRow label="Type">{selectedRP.type}</InfoRow>
      <InfoRow label="Items">{selectedRP.itemCount.toLocaleString()}</InfoRow>
      <InfoRow label="Size">{formatBytes(selectedRP.size)}</InfoRow>
    </RecoveryPointInfo>
    
    <FormField>
      <Label>Restore Mode</Label>
      <RadioGroup value={restoreMode} onChange={setRestoreMode}>
        <Radio value="full" label="Full Restore" description="Restore all data" />
        <Radio value="partial" label="Partial Restore" description="Select specific tenants or data types" />
      </RadioGroup>
    </FormField>
    
    {restoreMode === 'partial' && (
      <>
        <FormField>
          <Label>Tenants</Label>
          <MultiSelect 
            options={tenantOptions}
            selected={selectedTenants}
            onChange={setSelectedTenants}
          />
        </FormField>
        
        <FormField>
          <Label>Data Types</Label>
          <CheckboxGroup>
            {shardTypes.map(type => (
              <Checkbox 
                key={type}
                label={type}
                checked={selectedTypes.includes(type)}
                onChange={checked => toggleType(type, checked)}
              />
            ))}
          </CheckboxGroup>
        </FormField>
      </>
    )}
    
    <FormField>
      <Checkbox 
        label="Perform dry run first"
        checked={dryRun}
        onChange={setDryRun}
      />
      <HelperText>Validate the restore without making changes</HelperText>
    </FormField>
  </DialogContent>
  
  <DialogActions>
    <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
    <Button 
      variant="primary"
      onClick={performRestore}
      color="warning"
    >
      {dryRun ? 'Validate' : 'Restore'}
    </Button>
  </DialogActions>
</RestoreDialog>
```

---

## 10. Multi-Language Support

### Database Schema

#### c_translation ShardType

```typescript
interface Translation extends BaseShard {
  type: 'c_translation';
  
  // Original content
  originalInsightId: string;
  sourceLanguage: string;
  sourceContent: string;
  
  // Translations
  translations: Array<{
    language: string;
    content: string;
    citations: Citation[];  // Translated citations
    translatedAt: Date;
    quality: number;  // 0-1
  }>;
  
  // Translation settings
  settings: {
    autoTranslate: boolean;
    preserveFormatting: boolean;
    translationEngine: 'azure' | 'google' | 'deepl';
  };
  
  // Context preservation
  context: {
    technicalTerms: Record<string, string>;  // Term → Translation
    glossary: string;  // Glossary ID
  };
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|conversationId
}
```

#### c_languagePreference ShardType

```typescript
interface LanguagePreference extends BaseShard {
  type: 'c_languagePreference';
  
  userId: string;
  
  // Preferences
  primaryLanguage: string;      // ISO 639-1 code (e.g., 'en', 'fr')
  fallbackLanguages: string[];  // Ordered list
  
  // Auto-translation
  autoTranslate: {
    enabled: boolean;
    triggers: ('on_receive' | 'on_request')[];
  };
  
  // Language detection
  autoDetect: boolean;
  
  // Region
  region?: string;  // For locale-specific formatting
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|userId
}
```

### API Reference

#### Translate Insight

```http
POST /api/v1/insights/{insightId}/translate
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  targetLanguages: string[];  // ['fr', 'es', 'de']
  preserveFormatting: boolean;
  useGlossary?: string;  // Glossary ID
}
```

**Response**:
```typescript
{
  translations: Array<{
    language: string;
    content: string;
    citations: Citation[];
    quality: number;
  }>;
}
```

#### Get Translation

```http
GET /api/v1/insights/{insightId}/translations/{language}
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  language: string;
  content: string;
  citations: Citation[];
  translatedAt: Date;
  quality: number;
}
```

#### Update Language Preference

```http
PUT /api/v1/users/me/language-preference
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  primaryLanguage: string;
  fallbackLanguages?: string[];
  autoTranslate?: {
    enabled: boolean;
    triggers: string[];
  };
}
```

### Implementation

```typescript
// apps/api/src/services/ai-insights/translation.service.ts
export class TranslationService {
  async translateInsight(
    insightId: string,
    targetLanguages: string[],
    options: TranslationOptions
  ): Promise<Translation[]> {
    const insight = await this.getInsight(insightId);
    
    // Detect source language if not specified
    const sourceLanguage = await this.detectLanguage(insight.content);
    
    // Load glossary if specified
    let glossary: Record<string, any> | undefined;
    if (options.useGlossary) {
      glossary = await this.loadGlossary(options.useGlossary);
    }
    
    // Translate to each target language
    const translations = await Promise.all(
      targetLanguages.map(async (targetLang) => {
        // Translate content
        const translatedContent = await this.translate(
          insight.content,
          sourceLanguage,
          targetLang,
          {
            preserveFormatting: options.preserveFormatting,
            glossary
          }
        );
        
        // Translate citations
        const translatedCitations = await Promise.all(
          insight.citations.map(citation => 
            this.translateCitation(citation, targetLang)
          )
        );
        
        // Calculate quality
        const quality = await this.assessTranslationQuality(
          insight.content,
          translatedContent,
          sourceLanguage,
          targetLang
        );
        
        return {
          language: targetLang,
          content: translatedContent,
          citations: translatedCitations,
          quality,
          translatedAt: new Date()
        };
      })
    );
    
    // Store translations
    await this.storeTranslations(insightId, sourceLanguage, translations);
    
    return translations;
  }
  
  private async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    options: any
  ): Promise<string> {
    // Use Azure Translator
    const response = await this.translatorClient.translate(text, {
      from: sourceLang,
      to: targetLang,
      textType: options.preserveFormatting ? 'html' : 'plain',
      glossary: options.glossary
    });
    
    return response.translations[0].text;
  }
  
  private async detectLanguage(text: string): Promise<string> {
    const response = await this.translatorClient.detect(text);
    return response.language;
  }
  
  private async assessTranslationQuality(
    source: string,
    translation: string,
    sourceLang: string,
    targetLang: string
  ): Promise<number> {
    // Use back-translation to assess quality
    const backTranslation = await this.translate(translation, targetLang, sourceLang, {});
    
    // Calculate similarity
    const similarity = this.calculateSimilarity(source, backTranslation);
    
    return similarity;
  }
}
```

### UI Specifications

```typescript
<MultiLanguageInsightView>
  <Header>
    <LanguageSelector>
      <Select 
        value={currentLanguage}
        options={availableLanguages}
        onChange={switchLanguage}
        renderOption={(lang) => (
          <LanguageOption>
            <Flag code={lang.code} />
            <span>{lang.name}</span>
            {translations[lang.code] && (
              <QualityBadge quality={translations[lang.code].quality} />
            )}
          </LanguageOption>
        )}
      />
      
      {!translations[currentLanguage] && (
        <Button size="sm" onClick={() => translateToLanguage(currentLanguage)}>
          <Icon name="globe" />
          Translate
        </Button>
      )}
    </LanguageSelector>
    
    <Actions>
      <IconButton 
        icon="plus"
        onClick={addLanguage}
        tooltip="Add translation"
      />
      <IconButton 
        icon="settings"
        onClick={openLanguageSettings}
        tooltip="Language settings"
      />
    </Actions>
  </Header>
  
  <InsightContent lang={currentLanguage}>
    {translations[currentLanguage]?.content || insight.content}
    
    {translations[currentLanguage] && (
      <TranslationInfo>
        <InfoText>
          Translated from {getLanguageName(sourceLanguage)} on {formatDate(translations[currentLanguage].translatedAt)}
        </InfoText>
        <QualityIndicator quality={translations[currentLanguage].quality} />
      </TranslationInfo>
    )}
  </InsightContent>
  
  <Citations>
    {(translations[currentLanguage]?.citations || insight.citations).map(citation => (
      <CitationCard key={citation.id} citation={citation} />
    ))}
  </Citations>
  
  <TranslationTools>
    <Button size="sm" variant="ghost" onClick={compareTranslations}>
      <Icon name="columns" />
      Compare Translations
    </Button>
    <Button size="sm" variant="ghost" onClick={editTranslation}>
      <Icon name="edit" />
      Edit Translation
    </Button>
    <Button size="sm" variant="ghost" onClick={reportIssue}>
      <Icon name="flag" />
      Report Issue
    </Button>
  </TranslationTools>
</MultiLanguageInsightView>

<LanguageSettings>
  <Section title="Preferred Languages">
    <SortableList 
      items={preferences.fallbackLanguages}
      onChange={setFallbackLanguages}
      renderItem={(lang) => (
        <LanguageItem>
          <Flag code={lang} />
          <span>{getLanguageName(lang)}</span>
        </LanguageItem>
      )}
    />
    
    <Button onClick={addLanguagePreference}>
      Add Language
    </Button>
  </Section>
  
  <Section title="Auto-Translation">
    <Toggle 
      label="Enable auto-translation"
      checked={preferences.autoTranslate.enabled}
      onChange={v => updatePreference('autoTranslate.enabled', v)}
    />
    
    {preferences.autoTranslate.enabled && (
      <CheckboxGroup label="Translate">
        <Checkbox 
          label="When receiving insights"
          checked={preferences.autoTranslate.triggers.includes('on_receive')}
          onChange={v => toggleTrigger('on_receive', v)}
        />
        <Checkbox 
          label="On request"
          checked={preferences.autoTranslate.triggers.includes('on_request')}
          onChange={v => toggleTrigger('on_request', v)}
        />
      </CheckboxGroup>
    )}
  </Section>
  
  <Section title="Language Detection">
    <Toggle 
      label="Auto-detect language"
      checked={preferences.autoDetect}
      onChange={v => updatePreference('autoDetect', v)}
    />
  </Section>
</LanguageSettings>
```

---

## 11. Super Admin Configuration UI

### Global Configuration Interface

```typescript
<SuperAdminPanel>
  <Navigation>
    <NavItem active={section === 'ai-insights'} onClick={() => setSection('ai-insights')}>
      <Icon name="sparkles" />
      AI Insights
    </NavItem>
    <NavItem active={section === 'features'} onClick={() => setSection('features')}>
      <Icon name="sliders" />
      Features
    </NavItem>
    <NavItem active={section === 'models'} onClick={() => setSection('models')}>
      <Icon name="cpu" />
      Models
    </NavItem>
    <NavItem active={section === 'integrations'} onClick={() => setSection('integrations')}>
      <Icon name="puzzle" />
      Integrations
    </NavItem>
  </Navigation>
  
  <ConfigContent>
    {section === 'features' && (
      <FeatureToggles>
        <SectionHeader>
          <Title>Feature Configuration</Title>
          <Subtitle>Enable or disable AI Insights features globally</Subtitle>
        </SectionHeader>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>🤖</FeatureIcon>
            <FeatureName>AI Insights (Core)</FeatureName>
            <Toggle 
              checked={features.aiInsights.enabled}
              onChange={v => toggleFeature('aiInsights', v)}
            />
          </FeatureHeader>
          
          {features.aiInsights.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Label>Default Model</Label>
                <Select 
                  value={features.aiInsights.defaultModel}
                  options={modelOptions}
                  onChange={v => updateFeature('aiInsights.defaultModel', v)}
                />
              </ConfigOption>
              
              <ConfigOption>
                <Label>Max Concurrent Requests</Label>
                <Input 
                  type="number"
                  value={features.aiInsights.maxConcurrent}
                  onChange={v => updateFeature('aiInsights.maxConcurrent', v)}
                />
              </ConfigOption>
              
              <ConfigOption>
                <Label>Default Temperature</Label>
                <Slider 
                  min={0}
                  max={2}
                  step={0.1}
                  value={features.aiInsights.temperature}
                  onChange={v => updateFeature('aiInsights.temperature', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>🖼️</FeatureIcon>
            <FeatureName>Multi-Modal Support</FeatureName>
            <Toggle 
              checked={features.multiModal.enabled}
              onChange={v => toggleFeature('multiModal', v)}
            />
          </FeatureHeader>
          
          {features.multiModal.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Label>Supported Types</Label>
                <CheckboxGroup>
                  <Checkbox label="Images" checked onChange={() => {}} disabled />
                  <Checkbox 
                    label="Audio"
                    checked={features.multiModal.types.includes('audio')}
                    onChange={v => toggleType('multiModal', 'audio', v)}
                  />
                  <Checkbox 
                    label="Video"
                    checked={features.multiModal.types.includes('video')}
                    onChange={v => toggleType('multiModal', 'video', v)}
                  />
                  <Checkbox 
                    label="Documents"
                    checked={features.multiModal.types.includes('document')}
                    onChange={v => toggleType('multiModal', 'document', v)}
                  />
                </CheckboxGroup>
              </ConfigOption>
              
              <ConfigOption>
                <Label>Max File Size (MB)</Label>
                <Input 
                  type="number"
                  value={features.multiModal.maxFileSize}
                  onChange={v => updateFeature('multiModal.maxFileSize', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>👥</FeatureIcon>
            <FeatureName>Collaborative Insights</FeatureName>
            <Toggle 
              checked={features.collaboration.enabled}
              onChange={v => toggleFeature('collaboration', v)}
            />
          </FeatureHeader>
          
          {features.collaboration.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Toggle 
                  label="Allow external sharing"
                  checked={features.collaboration.externalSharing}
                  onChange={v => updateFeature('collaboration.externalSharing', v)}
                />
              </ConfigOption>
              
              <ConfigOption>
                <Label>Max Collaborators per Insight</Label>
                <Input 
                  type="number"
                  value={features.collaboration.maxCollaborators}
                  onChange={v => updateFeature('collaboration.maxCollaborators', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>📋</FeatureIcon>
            <FeatureName>Insight Templates</FeatureName>
            <Toggle 
              checked={features.templates.enabled}
              onChange={v => toggleFeature('templates', v)}
            />
          </FeatureHeader>
          
          {features.templates.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Toggle 
                  label="Allow custom templates"
                  checked={features.templates.allowCustom}
                  onChange={v => updateFeature('templates.allowCustom', v)}
                />
              </ConfigOption>
              
              <ConfigOption>
                <Toggle 
                  label="Enable template scheduling"
                  checked={features.templates.scheduling}
                  onChange={v => updateFeature('templates.scheduling', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>🧪</FeatureIcon>
            <FeatureName>A/B Testing</FeatureName>
            <Toggle 
              checked={features.abTesting.enabled}
              onChange={v => toggleFeature('abTesting', v)}
            />
          </FeatureHeader>
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>📊</FeatureIcon>
            <FeatureName>Feedback & Learning</FeatureName>
            <Toggle 
              checked={features.feedback.enabled}
              onChange={v => toggleFeature('feedback', v)}
            />
          </FeatureHeader>
          
          {features.feedback.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Toggle 
                  label="Auto-detect patterns"
                  checked={features.feedback.autoPatternDetection}
                  onChange={v => updateFeature('feedback.autoPatternDetection', v)}
                />
              </ConfigOption>
              
              <ConfigOption>
                <Label>Pattern Detection Frequency</Label>
                <Select 
                  value={features.feedback.detectionFrequency}
                  options={[
                    { value: 'hourly', label: 'Hourly' },
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' }
                  ]}
                  onChange={v => updateFeature('feedback.detectionFrequency', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>📜</FeatureIcon>
            <FeatureName>Audit Trail</FeatureName>
            <Toggle 
              checked={features.audit.enabled}
              onChange={v => toggleFeature('audit', v)}
            />
          </FeatureHeader>
          
          {features.audit.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Label>Retention Period (days)</Label>
                <Input 
                  type="number"
                  value={features.audit.retentionDays}
                  onChange={v => updateFeature('audit.retentionDays', v)}
                />
              </ConfigOption>
              
              <ConfigOption>
                <Toggle 
                  label="Enable reproducibility"
                  checked={features.audit.reproducibility}
                  onChange={v => updateFeature('audit.reproducibility', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>🌐</FeatureIcon>
            <FeatureName>Multi-Language Support</FeatureName>
            <Toggle 
              checked={features.translation.enabled}
              onChange={v => toggleFeature('translation', v)}
            />
          </FeatureHeader>
          
          {features.translation.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Label>Translation Engine</Label>
                <Select 
                  value={features.translation.engine}
                  options={[
                    { value: 'azure', label: 'Azure Translator' },
                    { value: 'google', label: 'Google Translate' },
                    { value: 'deepl', label: 'DeepL' }
                  ]}
                  onChange={v => updateFeature('translation.engine', v)}
                />
              </ConfigOption>
              
              <ConfigOption>
                <Label>Supported Languages</Label>
                <MultiSelect 
                  options={languageOptions}
                  selected={features.translation.languages}
                  onChange={v => updateFeature('translation.languages', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
        
        <FeatureCard>
          <FeatureHeader>
            <FeatureIcon>💾</FeatureIcon>
            <FeatureName>Disaster Recovery</FeatureName>
            <Toggle 
              checked={features.disasterRecovery.enabled}
              onChange={v => toggleFeature('disasterRecovery', v)}
            />
          </FeatureHeader>
          
          {features.disasterRecovery.enabled && (
            <FeatureConfig>
              <ConfigOption>
                <Label>Backup Schedule</Label>
                <Input 
                  type="text"
                  value={features.disasterRecovery.schedule}
                  onChange={v => updateFeature('disasterRecovery.schedule', v)}
                  placeholder="0 2 * * *"
                  helperText="Cron expression"
                />
              </ConfigOption>
              
              <ConfigOption>
                <Label>Retention Period (days)</Label>
                <Input 
                  type="number"
                  value={features.disasterRecovery.retentionDays}
                  onChange={v => updateFeature('disasterRecovery.retentionDays', v)}
                />
              </ConfigOption>
            </FeatureConfig>
          )}
        </FeatureCard>
      </FeatureToggles>
    )}
  </ConfigContent>
  
  <SaveBar>
    <Button variant="secondary" onClick={resetChanges}>
      Reset
    </Button>
    <Button onClick={saveConfiguration}>
      Save Configuration
    </Button>
  </SaveBar>
</SuperAdminPanel>
```

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [Advanced Features Extended](./ADVANCED-FEATURES-EXTENDED.md)
- [Monitoring](./MONITORING.md)
- [Security](./SECURITY.md)
