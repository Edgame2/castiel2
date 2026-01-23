# AI Insights Advanced Features - Extended

## Overview

This document covers advanced features that extend AI Insights capabilities including multi-modal support, collaborative insights, insight templates, advanced RAG techniques, audit trails, smart notifications, and export/integration features.

---

## 1. Multi-Modal Support

### Database Schema

**Container**: `media` with HPK `[tenantId, insightId, assetId]`

#### Media Document (type: 'image' | 'audio' | 'video' | 'document')

```typescript
interface MultimodalAsset {
  type: 'image' | 'audio' | 'video' | 'document';
  partitionKey: [string, string, string];  // [tenantId, insightId, assetId]
  
  // Asset details
  assetType: 'image' | 'audio' | 'video' | 'document';
  url: string;
  fileName: string;
  mimeType: string;
  size: number;  // bytes
  
  // Extracted content
  extracted: {
    text?: string;              // OCR or transcription
    description?: string;        // AI-generated description
    entities?: string[];         // Detected entities
    tags?: string[];
    metadata?: Record<string, any>;
  };
  
  // Analysis
  analysis?: {
    sentiment?: string;
    topics?: string[];
    summary?: string;
    keyInsights?: string[];
  };
  
  // Vector embedding
  embedding?: number[];
  
  // References
  attachedTo?: {
    conversationId?: string;
    messageId?: string;
    shardId?: string;
  };
  
  // Processing
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  
  // Metadata
  uploadedBy: string;
  uploadedAt: Date;
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|userId
}
```

### API Reference

#### Upload Multi-Modal Asset

```http
POST /api/v1/insights/assets/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request**:
```typescript
{
  file: File;
  assetType: 'image' | 'audio' | 'video' | 'document';
  attachTo?: {
    conversationId?: string;
    messageId?: string;
    shardId?: string;
  };
  autoAnalyze: boolean;  // Default: true
}
```

**Response**:
```typescript
{
  assetId: string;
  url: string;
  processingStatus: string;
  estimatedCompletionTime?: number;  // seconds
}
```

#### Analyze Image

```http
POST /api/v1/insights/assets/{assetId}/analyze-image
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  description: string;
  objects: Array<{
    label: string;
    confidence: number;
    boundingBox?: BoundingBox;
  }>;
  text?: string;  // OCR
  tags: string[];
  colors: string[];
  faces?: number;
  nsfw: boolean;
}
```

#### Transcribe Audio/Video

```http
POST /api/v1/insights/assets/{assetId}/transcribe
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  language?: string;  // Auto-detect if not provided
  speakerDiarization?: boolean;
  timestamp?: boolean;
}
```

**Response**:
```typescript
{
  transcription: string;
  segments?: Array<{
    start: number;  // seconds
    end: number;
    text: string;
    speaker?: string;
  }>;
  language: string;
  confidence: number;
}
```

### UI Specifications

#### Multi-Modal Chat Interface

```typescript
<ChatInput>
  <TextArea 
    placeholder="Ask a question..."
    value={message}
    onChange={setMessage}
  />
  
  <AttachmentBar>
    {attachments.map(attachment => (
      <AttachmentPreview key={attachment.id}>
        {attachment.type === 'image' && (
          <ImagePreview src={attachment.url} />
        )}
        {attachment.type === 'document' && (
          <DocumentIcon type={attachment.mimeType} />
        )}
        <AttachmentName>{attachment.fileName}</AttachmentName>
        <RemoveButton onClick={() => removeAttachment(attachment.id)} />
      </AttachmentPreview>
    ))}
  </AttachmentBar>
  
  <InputActions>
    <IconButton 
      icon="paperclip"
      onClick={() => fileInput.current.click()}
      tooltip="Attach file"
    />
    <IconButton 
      icon="image"
      onClick={() => selectImage()}
      tooltip="Add image"
    />
    <IconButton 
      icon="mic"
      onClick={() => startRecording()}
      tooltip="Record audio"
    />
    <Button onClick={sendMessage}>Send</Button>
  </InputActions>
  
  <input 
    ref={fileInput}
    type="file"
    accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
    onChange={handleFileSelect}
    style={{ display: 'none' }}
  />
</ChatInput>

{/* Response with image analysis */}
<MessageCard>
  <MessageContent>
    Based on the chart you shared, I can see that revenue increased by 25% in Q4...
  </MessageContent>
  
  <AttachedImage>
    <Image src={imageUrl} />
    <ImageAnalysis>
      <Tag>Chart</Tag>
      <Tag>Revenue Data</Tag>
      <Tag>Q4 2024</Tag>
    </ImageAnalysis>
  </AttachedImage>
  
  <Citations>
    <Citation source="image">Based on uploaded chart</Citation>
    <Citation source="shard">Project Alpha financial report</Citation>
  </Citations>
</MessageCard>
```

### Implementation

```typescript
// apps/api/src/services/ai-insights/multimodal.service.ts
export class MultimodalService {
  async processImage(assetId: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    
    // Analyze image with Azure Computer Vision
    const analysis = await this.computerVisionClient.analyzeImage(asset.url, {
      visualFeatures: ['Description', 'Objects', 'Tags', 'Text', 'Faces']
    });
    
    // Generate embedding
    const embedding = await this.generateImageEmbedding(asset.url);
    
    // Update asset
    await this.updateAsset(assetId, {
      extracted: {
        description: analysis.description.captions[0]?.text,
        text: analysis.text?.text,
        entities: analysis.objects.map(o => o.object),
        tags: analysis.tags.map(t => t.name)
      },
      embedding,
      processingStatus: 'completed',
      processedAt: new Date()
    });
  }
  
  async transcribeAudio(assetId: string, options: TranscriptionOptions): Promise<string> {
    const asset = await this.getAsset(assetId);
    
    // Transcribe with Azure Speech Service
    const transcription = await this.speechClient.transcribe(asset.url, {
      language: options.language || 'auto',
      speakerDiarization: options.speakerDiarization,
      profanityOption: 'Masked'
    });
    
    // Update asset
    await this.updateAsset(assetId, {
      extracted: {
        text: transcription.text,
        metadata: {
          segments: transcription.segments,
          language: transcription.language
        }
      },
      processingStatus: 'completed',
      processedAt: new Date()
    });
    
    return transcription.text;
  }
}
```

---

## 2. Collaborative Insights

### Database Schema

#### Collaboration Document

**Container**: `collaboration` with HPK `[tenantId, insightId, userId]`

Document types: `share`, `comment`, `reaction`, `annotation`

```typescript
interface SharedInsight {
  type: 'share';
  partitionKey: [string, string, string];  // [tenantId, insightId, sharedWithUserId]
  
  // Original insight
  insightId: string;
  conversationId: string;
  messageId: string;
  
  // Sharing details
  sharedBy: string;
  sharedWith: Array<{
    userId?: string;
    groupId?: string;
    role?: string;
    permission: 'view' | 'comment' | 'edit';
  }>;
  
  // Content snapshot (at time of sharing)
  content: {
    query: string;
    response: string;
    citations: Citation[];
    context: string[];
  };
  
  // Collaboration
  comments: Array<{
    id: string;
    userId: string;
    content: string;
    createdAt: Date;
    edited: boolean;
    replies?: Comment[];
  }>;
  
  reactions: Array<{
    userId: string;
    emoji: string;
    timestamp: Date;
  }>;
  
  // Annotations
  annotations?: Array<{
    id: string;
    userId: string;
    text: string;
    highlight?: {
      start: number;
      end: number;
    };
    createdAt: Date;
  }>;
  
  // Links
  linkedShards: string[];      // Connected to other shards
  linkedInsights: string[];    // Connected to other insights
  
  // Status
  archived: boolean;
  pinnedBy: string[];
  
  // Metadata
  sharedAt: Date;
  lastActivityAt: Date;
  viewCount: number;
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|conversationId
}
```

### API Reference

#### Share Insight

```http
POST /api/v1/insights/{insightId}/share
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  shareWith: Array<{
    userId?: string;
    groupId?: string;
    email?: string;  // For external sharing
    permission: 'view' | 'comment' | 'edit';
  }>;
  message?: string;
  expiresAt?: Date;
  notifyUsers: boolean;
}
```

**Response**:
```typescript
{
  sharedInsightId: string;
  shareUrl: string;
  expiresAt?: Date;
}
```

#### Add Comment

```http
POST /api/v1/insights/shared/{sharedInsightId}/comments
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  content: string;
  replyTo?: string;  // Comment ID for replies
  mentions?: string[];  // User IDs
}
```

#### Add Reaction

```http
POST /api/v1/insights/shared/{sharedInsightId}/reactions
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  emoji: string;  // 👍 👎 ❤️ 🎉 etc.
}
```

### UI Specifications

```typescript
<SharedInsightView>
  <Header>
    <Avatar userId={insight.sharedBy} />
    <ShareInfo>
      <UserName>{getUserName(insight.sharedBy)}</UserName>
      <ShareTime>shared {timeAgo(insight.sharedAt)}</ShareTime>
    </ShareInfo>
    
    <Actions>
      <IconButton icon="pin" onClick={pinInsight} />
      <IconButton icon="link" onClick={copyLink} />
      <IconButton icon="more" onClick={openMenu} />
    </Actions>
  </Header>
  
  <InsightContent>
    <Query>{insight.content.query}</Query>
    
    <Response selectable onSelect={handleTextSelect}>
      {insight.content.response}
      
      {/* Show annotations as highlights */}
      {annotations.map(annotation => (
        <Annotation key={annotation.id} highlight={annotation.highlight}>
          <AnnotationPopover>
            <Avatar userId={annotation.userId} size="sm" />
            <AnnotationText>{annotation.text}</AnnotationText>
          </AnnotationPopover>
        </Annotation>
      ))}
    </Response>
    
    <Citations>
      {insight.content.citations.map(citation => (
        <CitationCard key={citation.id} citation={citation} />
      ))}
    </Citations>
  </InsightContent>
  
  <Reactions>
    {groupedReactions.map(group => (
      <ReactionButton 
        key={group.emoji}
        emoji={group.emoji}
        count={group.count}
        active={group.userReacted}
        onClick={() => toggleReaction(group.emoji)}
      />
    ))}
    <ReactionPicker onSelect={addReaction} />
  </Reactions>
  
  <Comments>
    <CommentInput>
      <Avatar userId={currentUser.id} size="sm" />
      <TextArea 
        placeholder="Add a comment..."
        value={comment}
        onChange={setComment}
        onKeyDown={handleKeyDown}
      />
      <Button onClick={postComment}>Post</Button>
    </CommentInput>
    
    <CommentList>
      {comments.map(comment => (
        <Comment key={comment.id}>
          <CommentHeader>
            <Avatar userId={comment.userId} size="sm" />
            <UserName>{getUserName(comment.userId)}</UserName>
            <Timestamp>{timeAgo(comment.createdAt)}</Timestamp>
          </CommentHeader>
          
          <CommentContent>{comment.content}</CommentContent>
          
          <CommentActions>
            <Button size="sm" variant="ghost" onClick={() => replyToComment(comment.id)}>
              Reply
            </Button>
            {comment.userId === currentUser.id && (
              <>
                <Button size="sm" variant="ghost" onClick={() => editComment(comment.id)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteComment(comment.id)}>
                  Delete
                </Button>
              </>
            )}
          </CommentActions>
          
          {comment.replies && (
            <Replies>
              {comment.replies.map(reply => (
                <Reply key={reply.id} reply={reply} />
              ))}
            </Replies>
          )}
        </Comment>
      ))}
    </CommentList>
  </Comments>
  
  <LinkedContent>
    <SectionHeader>Related Content</SectionHeader>
    <LinkedShards>
      {linkedShards.map(shard => (
        <ShardCard key={shard.id} shard={shard} />
      ))}
    </LinkedShards>
  </LinkedContent>
</SharedInsightView>
```

---

## 3. Insight Templates

### Database Schema

#### Template Document

**Container**: `templates` with partition key `tenantId`

Document types: `template`, `execution`

```typescript
interface InsightTemplate {
  type: 'template';
  partitionKey: [string];  // [tenantId]
  
  // Template details
  name: string;
  description: string;
  category: 'risk' | 'status' | 'forecast' | 'analysis' | 'comparison' | 'custom';
  
  // Prompt template
  promptTemplate: string;         // "Analyze risks for {{projectName}} in {{timeframe}}"
  systemPrompt?: string;
  
  // Variables
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'select' | 'multiselect';
    label: string;
    description?: string;
    required: boolean;
    defaultValue?: any;
    options?: Array<{ value: any; label: string }>;  // For select types
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }>;
  
  // Configuration
  contextTemplateId: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  
  // Scheduling (optional)
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
    notifyUsers: string[];
  };
  
  // Output format
  outputFormat?: {
    type: 'text' | 'structured' | 'table' | 'chart';
    schema?: any;  // JSON schema for structured output
  };
  
  // Usage stats
  usage: {
    totalUses: number;
    avgQualityScore: number;
    avgSatisfactionScore: number;
    lastUsed?: Date;
  };
  
  // Access control
  visibility: 'private' | 'team' | 'tenant' | 'public';
  createdBy: string;
  sharedWith?: string[];
  
  // Metadata
  tags: string[];
  icon?: string;
  color?: string;
  
  // Hierarchical Partition Key
  pk: string;  // tenantId
}
```

### API Reference

#### List Templates

```http
GET /api/v1/insights/templates
Authorization: Bearer {token}
```

**Query Parameters**:
- `category`: Filter by category
- `search`: Search by name/description
- `visibility`: Filter by visibility

**Response**:
```typescript
{
  templates: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    variables: Variable[];
    usage: UsageStats;
    icon: string;
  }>;
}
```

#### Create Template

```http
POST /api/v1/insights/templates
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  name: string;
  description: string;
  category: string;
  promptTemplate: string;
  variables: Variable[];
  contextTemplateId: string;
  schedule?: ScheduleConfig;
  visibility: string;
}
```

#### Use Template

```http
POST /api/v1/insights/templates/{templateId}/use
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  variables: Record<string, any>;  // Variable values
  conversationId?: string;
  scope?: any;
}
```

**Response**:
```typescript
{
  insightId: string;
  conversationId: string;
  content: string;
  citations: Citation[];
  // ... standard insight response
}
```

### UI Specifications

```typescript
<TemplateLibrary>
  <Header>
    <Title>Insight Templates</Title>
    <Button onClick={createTemplate}>
      <Icon name="plus" />
      New Template
    </Button>
  </Header>
  
  <FilterBar>
    <CategoryTabs>
      <Tab active={category === 'all'} onClick={() => setCategory('all')}>
        All
      </Tab>
      <Tab active={category === 'risk'} onClick={() => setCategory('risk')}>
        Risk Analysis
      </Tab>
      <Tab active={category === 'status'} onClick={() => setCategory('status')}>
        Status Updates
      </Tab>
      <Tab active={category === 'forecast'} onClick={() => setCategory('forecast')}>
        Forecasting
      </Tab>
    </CategoryTabs>
    
    <SearchInput 
      placeholder="Search templates..."
      value={search}
      onChange={setSearch}
    />
  </FilterBar>
  
  <TemplateGrid>
    {templates.map(template => (
      <TemplateCard key={template.id}>
        <TemplateIcon color={template.color}>
          {template.icon}
        </TemplateIcon>
        
        <TemplateInfo>
          <TemplateName>{template.name}</TemplateName>
          <TemplateDescription>{template.description}</TemplateDescription>
          
          <TemplateStats>
            <Stat>
              <Icon name="zap" size="sm" />
              {template.usage.totalUses} uses
            </Stat>
            <Stat>
              <Icon name="star" size="sm" />
              {(template.usage.avgQualityScore * 100).toFixed(0)}% quality
            </Stat>
          </TemplateStats>
        </TemplateInfo>
        
        <TemplateActions>
          <Button onClick={() => useTemplate(template.id)}>
            Use Template
          </Button>
          <IconButton 
            icon="more"
            onClick={() => openTemplateMenu(template.id)}
          />
        </TemplateActions>
      </TemplateCard>
    ))}
  </TemplateGrid>
</TemplateLibrary>

{/* Template Usage Dialog */}
<Dialog title={template.name} open={showDialog}>
  <DialogDescription>{template.description}</DialogDescription>
  
  <VariableInputs>
    {template.variables.map(variable => (
      <FormField key={variable.name}>
        <Label>{variable.label}</Label>
        
        {variable.type === 'string' && (
          <Input 
            value={values[variable.name]}
            onChange={v => setValue(variable.name, v)}
            placeholder={variable.description}
            required={variable.required}
          />
        )}
        
        {variable.type === 'select' && (
          <Select 
            options={variable.options}
            value={values[variable.name]}
            onChange={v => setValue(variable.name, v)}
            required={variable.required}
          />
        )}
        
        {variable.type === 'date' && (
          <DatePicker 
            value={values[variable.name]}
            onChange={v => setValue(variable.name, v)}
            required={variable.required}
          />
        )}
        
        {variable.description && (
          <HelperText>{variable.description}</HelperText>
        )}
      </FormField>
    ))}
  </VariableInputs>
  
  <PreviewSection>
    <Label>Preview</Label>
    <PreviewText>
      {renderPromptPreview(template.promptTemplate, values)}
    </PreviewText>
  </PreviewSection>
  
  <DialogActions>
    <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
    <Button onClick={generateInsight}>Generate Insight</Button>
  </DialogActions>
</Dialog>
```

---

## 4. Advanced RAG Techniques

### Hypothetical Document Embeddings (HyDE)

```typescript
// apps/api/src/services/ai-insights/hyde-retrieval.service.ts
export class HyDERetrievalService {
  async retrieve(query: string, scope: Scope): Promise<Shard[]> {
    // Step 1: Generate hypothetical answer
    const hypotheticalAnswer = await this.generateHypotheticalAnswer(query);
    
    // Step 2: Embed the hypothetical answer
    const embedding = await this.embeddingService.embed(hypotheticalAnswer);
    
    // Step 3: Search using hypothetical embedding
    const results = await this.vectorSearch(embedding, scope);
    
    // Step 4: Rerank results
    const reranked = await this.rerank(results, query);
    
    return reranked;
  }
  
  private async generateHypotheticalAnswer(query: string): Promise<string> {
    const prompt = `
      Given this question: "${query}"
      
      Generate a detailed, hypothetical answer that would perfectly answer this question.
      Do not worry about factual accuracy - focus on the type and style of answer expected.
    `;
    
    const response = await this.llmService.complete(prompt, {
      temperature: 0.7,
      maxTokens: 500
    });
    
    return response.content;
  }
}
```

### Parent Document Retrieval

```typescript
export class ParentDocumentRetriever {
  async retrieve(query: string, scope: Scope): Promise<Shard[]> {
    // Step 1: Search for relevant chunks
    const chunks = await this.searchChunks(query, scope);
    
    // Step 2: Retrieve parent documents
    const parents = await Promise.all(
      chunks.map(chunk => this.getParentDocument(chunk))
    );
    
    // Step 3: Deduplicate
    const uniqueParents = this.deduplicateByParent(parents);
    
    return uniqueParents;
  }
  
  private async getParentDocument(chunk: Shard): Promise<Shard> {
    if (!chunk.parentId) return chunk;
    
    return await this.shardService.getShard(chunk.parentId);
  }
}
```

### Cross-Encoder Reranking

```typescript
export class CrossEncoderReranker {
  async rerank(query: string, candidates: Shard[]): Promise<Shard[]> {
    // Score each candidate with cross-encoder
    const scores = await Promise.all(
      candidates.map(async (candidate) => {
        const score = await this.crossEncoderScore(query, candidate.content);
        return { candidate, score };
      })
    );
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    
    // Return reranked candidates
    return scores.map(s => s.candidate);
  }
  
  private async crossEncoderScore(query: string, document: string): Promise<number> {
    // Use cross-encoder model for more accurate relevance scoring
    const response = await this.modelService.predict('cross-encoder-ms-marco', {
      query,
      document
    });
    
    return response.score;
  }
}
```

### Query Expansion

```typescript
export class QueryExpansionService {
  async expandQuery(query: string): Promise<string[]> {
    // Generate query variations
    const variations = await this.generateVariations(query);
    
    // Add synonyms
    const withSynonyms = await this.addSynonyms(query);
    
    // Combine all expansions
    return [query, ...variations, ...withSynonyms];
  }
  
  private async generateVariations(query: string): Promise<string[]> {
    const prompt = `
      Original query: "${query}"
      
      Generate 3 alternative phrasings of this query that capture the same intent
      but use different words or structure.
      
      Return as JSON array of strings.
    `;
    
    const response = await this.llmService.complete(prompt);
    return JSON.parse(response.content);
  }
}
```

---

## 5. Audit Trail & Reproducibility

### Database Schema

#### Audit Document

**Container**: `audit` with HPK `[tenantId, insightId, auditEntryId]`

Document types: `generation`, `modification`, `verification`, `regeneration`

```typescript
interface InsightAudit {
  type: 'generation' | 'modification' | 'verification' | 'regeneration';
  partitionKey: [string, string, string];  // [tenantId, insightId, auditEntryId]
  
  // Reference
  insightId: string;
  conversationId: string;
  messageId: string;
  
  // Generation details
  generation: {
    timestamp: Date;
    modelUsed: string;
    modelVersion: string;
    promptVersion: string;
    temperature: number;
    maxTokens: number;
    actualTokens: {
      input: number;
      output: number;
      total: number;
    };
  };
  
  // Context
  contextUsed: Array<{
    shardId: string;
    shardType: string;
    relevanceScore: number;
    retrievalMethod: string;
  }>;
  
  // Intent & Classification
  intent: {
    detected: string;
    confidence: number;
    classificationMethod: string;
  };
  
  // Quality metrics
  quality: {
    relevance: number;
    accuracy: number;
    completeness: number;
    overall: number;
  };
  
  // Grounding
  grounding: {
    citationCount: number;
    supportScore: number;
    verifiedCitations: number;
    unverifiedClaims: string[];
  };
  
  // Reproducibility
  reproducible: boolean;
  reproducibilityHash: string;     // Hash of all inputs
  canRegenerate: boolean;
  
  // Verification
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  corrections?: Array<{
    field: string;
    originalValue: any;
    correctedValue: any;
    reason: string;
  }>;
  
  // Performance
  performance: {
    totalDuration: number;
    contextAssemblyDuration: number;
    modelInferenceDuration: number;
    groundingDuration: number;
  };
  
  // Cost
  cost: {
    modelCost: number;
    totalCost: number;
  };
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|conversationId
}
```

### API Reference

#### Get Insight Audit Trail

```http
GET /api/v1/insights/{insightId}/audit
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  audit: {
    insightId: string;
    generatedAt: Date;
    
    // What influenced the response
    modelUsed: string;
    promptVersion: string;
    contextShards: Array<{
      id: string;
      type: string;
      relevance: number;
    }>;
    
    // Quality & accuracy
    quality: QualityScores;
    grounding: GroundingMetrics;
    
    // Reproducibility
    reproducible: boolean;
    canRegenerate: boolean;
    
    // Verification
    verified: boolean;
    corrections?: Correction[];
  };
}
```

#### Regenerate Insight

```http
POST /api/v1/insights/{insightId}/regenerate
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  useOriginalContext: boolean;     // Use same context as original
  useOriginalModel: boolean;        // Use same model config
  compareResults: boolean;          // Return comparison
}
```

**Response**:
```typescript
{
  newInsightId: string;
  comparison?: {
    contentSimilarity: number;      // 0-1
    citationOverlap: number;
    qualityDelta: number;
    differences: string[];
  };
}
```

#### Verify Insight

```http
POST /api/v1/insights/{insightId}/verify
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  verified: boolean;
  corrections?: Array<{
    field: string;
    correctedValue: any;
    reason: string;
  }>;
  notes?: string;
}
```

### UI Specifications

```typescript
<InsightAuditView>
  <Header>
    <Title>Insight Audit Trail</Title>
    <StatusBadge verified={audit.verified} />
  </Header>
  
  <Section title="Generation Details">
    <DetailRow label="Generated At">{formatDate(audit.generation.timestamp)}</DetailRow>
    <DetailRow label="Model Used">{audit.generation.modelUsed}</DetailRow>
    <DetailRow label="Model Version">{audit.generation.modelVersion}</DetailRow>
    <DetailRow label="Prompt Version">{audit.generation.promptVersion}</DetailRow>
    <DetailRow label="Tokens Used">{audit.generation.actualTokens.total}</DetailRow>
  </Section>
  
  <Section title="Context Used">
    <ContextList>
      {audit.contextUsed.map(context => (
        <ContextItem key={context.shardId}>
          <ShardBadge type={context.shardType} />
          <ShardLink href={`/shards/${context.shardId}`}>
            {context.shardId}
          </ShardLink>
          <RelevanceScore>{(context.relevanceScore * 100).toFixed(0)}%</RelevanceScore>
        </ContextItem>
      ))}
    </ContextList>
  </Section>
  
  <Section title="Quality Metrics">
    <MetricsGrid>
      <MetricCard
        label="Relevance"
        value={audit.quality.relevance}
        color={getQualityColor(audit.quality.relevance)}
      />
      <MetricCard
        label="Accuracy"
        value={audit.quality.accuracy}
        color={getQualityColor(audit.quality.accuracy)}
      />
      <MetricCard
        label="Completeness"
        value={audit.quality.completeness}
        color={getQualityColor(audit.quality.completeness)}
      />
      <MetricCard
        label="Overall"
        value={audit.quality.overall}
        color={getQualityColor(audit.quality.overall)}
      />
    </MetricsGrid>
  </Section>
  
  <Section title="Grounding Analysis">
    <DetailRow label="Citations">{audit.grounding.citationCount}</DetailRow>
    <DetailRow label="Support Score">{(audit.grounding.supportScore * 100).toFixed(0)}%</DetailRow>
    <DetailRow label="Verified Citations">{audit.grounding.verifiedCitations}</DetailRow>
    
    {audit.grounding.unverifiedClaims.length > 0 && (
      <Alert severity="warning">
        <AlertTitle>Unverified Claims</AlertTitle>
        <UnverifiedClaimsList>
          {audit.grounding.unverifiedClaims.map((claim, i) => (
            <li key={i}>{claim}</li>
          ))}
        </UnverifiedClaimsList>
      </Alert>
    )}
  </Section>
  
  <Section title="Reproducibility">
    <ReproducibilityStatus>
      {audit.reproducible ? (
        <Badge color="success">
          <Icon name="check-circle" />
          Reproducible
        </Badge>
      ) : (
        <Badge color="warning">
          <Icon name="alert-circle" />
          Not Reproducible
        </Badge>
      )}
    </ReproducibilityStatus>
    
    {audit.canRegenerate && (
      <Button onClick={() => regenerateInsight(audit.insightId)}>
        <Icon name="refresh" />
        Regenerate Insight
      </Button>
    )}
  </Section>
  
  {audit.verified && audit.corrections && (
    <Section title="Corrections">
      <CorrectionsList>
        {audit.corrections.map((correction, i) => (
          <CorrectionItem key={i}>
            <Field>{correction.field}</Field>
            <Change>
              <Original>{correction.originalValue}</Original>
              <Arrow>→</Arrow>
              <Corrected>{correction.correctedValue}</Corrected>
            </Change>
            <Reason>{correction.reason}</Reason>
          </CorrectionItem>
        ))}
      </CorrectionsList>
    </Section>
  )}
  
  {!audit.verified && (
    <VerificationSection>
      <Button onClick={() => openVerificationDialog()}>
        Verify Insight
      </Button>
    </VerificationSection>
  )}
</InsightAuditView>
```

---

## 6. Smart Notifications

### Database Schema

#### c_notificationPreference ShardType (Extended)

```typescript
interface NotificationPreference extends BaseShard {
  type: 'c_notificationPreference';
  
  userId: string;
  
  // Smart timing
  smartTiming: {
    enabled: boolean;
    timezone: string;
    workingHours: {
      start: string;  // "09:00"
      end: string;    // "17:00"
    };
    quietHours: {
      enabled: boolean;
      start: string;  // "22:00"
      end: string;    // "07:00"
    };
    preferredDays: string[];  // ['Monday', 'Tuesday', ...]
  };
  
  // Digest mode
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'custom';
    time: string;      // "08:00"
    dayOfWeek?: number;  // For weekly (0-6)
    minItems: number;    // Minimum items to send digest
  };
  
  // Priority routing
  priorityRouting: {
    critical: string[];   // ['sms', 'call', 'email', 'in_app']
    high: string[];       // ['email', 'in_app']
    medium: string[];     // ['in_app']
    low: string[];        // ['in_app']
  };
  
  // Snooze settings
  snooze: {
    defaultDuration: number;  // minutes
    maxSnoozes: number;
  };
  
  // Channels
  channels: {
    email: {
      enabled: boolean;
      address: string;
      verified: boolean;
    };
    sms: {
      enabled: boolean;
      number: string;
      verified: boolean;
    };
    push: {
      enabled: boolean;
      deviceTokens: string[];
    };
    slack: {
      enabled: boolean;
      webhookUrl?: string;
      channelId?: string;
    };
  };
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|userId
}
```

#### c_notificationDigest ShardType

```typescript
interface NotificationDigest extends BaseShard {
  type: 'c_notificationDigest';
  
  userId: string;
  
  period: {
    start: Date;
    end: Date;
  };
  
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    timestamp: Date;
    actionUrl?: string;
  }>;
  
  summary: {
    total: number;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  };
  
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  
  // Hierarchical Partition Key
  pk: string;  // tenantId|userId|date
}
```

### Implementation

```typescript
// apps/api/src/services/ai-insights/smart-notifications.service.ts
export class SmartNotificationService {
  async send(notification: Notification): Promise<void> {
    const preferences = await this.getPreferences(notification.userId);
    
    // Check if digest mode is enabled
    if (preferences.digest.enabled && notification.priority !== 'critical') {
      await this.addToDigest(notification);
      return;
    }
    
    // Check timing
    if (!this.isGoodTime(preferences.smartTiming)) {
      await this.scheduleForLater(notification, preferences.smartTiming);
      return;
    }
    
    // Route by priority
    const channels = this.selectChannels(notification.priority, preferences);
    
    // Send to selected channels
    await Promise.all(
      channels.map(channel => this.sendToChannel(notification, channel))
    );
  }
  
  private isGoodTime(smartTiming: SmartTiming): boolean {
    const now = moment().tz(smartTiming.timezone);
    
    // Check quiet hours
    if (smartTiming.quietHours.enabled) {
      const quietStart = moment(smartTiming.quietHours.start, 'HH:mm');
      const quietEnd = moment(smartTiming.quietHours.end, 'HH:mm');
      
      if (now.isBetween(quietStart, quietEnd)) {
        return false;
      }
    }
    
    // Check working hours
    const workStart = moment(smartTiming.workingHours.start, 'HH:mm');
    const workEnd = moment(smartTiming.workingHours.end, 'HH:mm');
    
    if (!now.isBetween(workStart, workEnd)) {
      return false;
    }
    
    // Check preferred days
    const dayName = now.format('dddd');
    if (!smartTiming.preferredDays.includes(dayName)) {
      return false;
    }
    
    return true;
  }
  
  private selectChannels(
    priority: string,
    preferences: NotificationPreference
  ): string[] {
    return preferences.priorityRouting[priority] || ['in_app'];
  }
  
  async sendDigest(userId: string): Promise<void> {
    const preferences = await this.getPreferences(userId);
    const pendingNotifications = await this.getPendingNotifications(userId);
    
    if (pendingNotifications.length < preferences.digest.minItems) {
      // Not enough items for digest
      return;
    }
    
    // Group by category
    const grouped = this.groupNotifications(pendingNotifications);
    
    // Create digest
    const digest = await this.createDigest(userId, grouped);
    
    // Send via email
    await this.emailService.sendDigest(userId, digest);
    
    // Mark as sent
    await this.markNotificationsAsSent(pendingNotifications.map(n => n.id));
  }
}
```

### UI Specifications

```typescript
<NotificationPreferences>
  <Section title="Smart Timing">
    <Toggle 
      label="Enable smart timing"
      checked={smartTiming.enabled}
      onChange={v => setSmartTiming({ ...smartTiming, enabled: v })}
    />
    
    {smartTiming.enabled && (
      <>
        <TimeRangeInput 
          label="Working Hours"
          start={smartTiming.workingHours.start}
          end={smartTiming.workingHours.end}
          onChange={setWorkingHours}
        />
        
        <Toggle 
          label="Enable quiet hours"
          checked={smartTiming.quietHours.enabled}
          onChange={v => setQuietHours({ ...quietHours, enabled: v })}
        />
        
        {smartTiming.quietHours.enabled && (
          <TimeRangeInput 
            label="Quiet Hours"
            start={smartTiming.quietHours.start}
            end={smartTiming.quietHours.end}
            onChange={setQuietHoursTime}
          />
        )}
        
        <WeekdaySelector 
          label="Preferred Days"
          selected={smartTiming.preferredDays}
          onChange={setPreferredDays}
        />
      </>
    )}
  </Section>
  
  <Section title="Digest Mode">
    <Toggle 
      label="Enable digest mode"
      checked={digest.enabled}
      onChange={v => setDigest({ ...digest, enabled: v })}
    />
    
    {digest.enabled && (
      <>
        <Select 
          label="Frequency"
          value={digest.frequency}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'custom', label: 'Custom' }
          ]}
          onChange={v => setDigest({ ...digest, frequency: v })}
        />
        
        <TimeInput 
          label="Send at"
          value={digest.time}
          onChange={v => setDigest({ ...digest, time: v })}
        />
        
        {digest.frequency === 'weekly' && (
          <Select 
            label="Day of Week"
            value={digest.dayOfWeek}
            options={weekdayOptions}
            onChange={v => setDigest({ ...digest, dayOfWeek: v })}
          />
        )}
        
        <Input 
          type="number"
          label="Minimum items to send"
          value={digest.minItems}
          onChange={v => setDigest({ ...digest, minItems: v })}
          helperText="Don't send digest if fewer than this many notifications"
        />
      </>
    )}
  </Section>
  
  <Section title="Priority Routing">
    <PriorityConfig priority="critical">
      <Label>Critical Alerts</Label>
      <ChannelSelector 
        selected={priorityRouting.critical}
        onChange={v => setPriorityRouting({ ...priorityRouting, critical: v })}
        options={['sms', 'call', 'email', 'push', 'in_app']}
      />
    </PriorityConfig>
    
    <PriorityConfig priority="high">
      <Label>High Priority</Label>
      <ChannelSelector 
        selected={priorityRouting.high}
        onChange={v => setPriorityRouting({ ...priorityRouting, high: v })}
        options={['email', 'push', 'in_app']}
      />
    </PriorityConfig>
    
    <PriorityConfig priority="medium">
      <Label>Medium Priority</Label>
      <ChannelSelector 
        selected={priorityRouting.medium}
        onChange={v => setPriorityRouting({ ...priorityRouting, medium: v })}
        options={['push', 'in_app']}
      />
    </PriorityConfig>
    
    <PriorityConfig priority="low">
      <Label>Low Priority</Label>
      <ChannelSelector 
        selected={priorityRouting.low}
        onChange={v => setPriorityRouting({ ...priorityRouting, low: v })}
        options={['in_app']}
      />
    </PriorityConfig>
  </Section>
</NotificationPreferences>
```

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [Feedback & Learning](./FEEDBACK-LEARNING.md)
- [A/B Testing](./AB-TESTING.md)
- [Monitoring](./MONITORING.md)
- [Notifications](./NOTIFICATIONS.md)
