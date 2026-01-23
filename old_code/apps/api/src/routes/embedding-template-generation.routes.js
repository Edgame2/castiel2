import { DEFAULT_EMBEDDING_TEMPLATE } from '../types/embedding-template.types.js';
export async function registerEmbeddingTemplateGenerationRoutes(server, monitoring) {
    const shardTypeRepository = server.shardTypeRepository;
    const promptResolverService = server.promptResolverService;
    const azureOpenAI = server.azureOpenAI;
    if (!shardTypeRepository) {
        server.log.warn('⚠️ Embedding template generation routes not registered - ShardTypeRepository missing');
        return;
    }
    // POST /api/v1/embedding-templates/generate
    server.post('/embedding-templates/generate', {
        schema: {
            description: 'Generate embedding template recommendation using AI prompt',
            tags: ['Embeddings'],
            body: {
                type: 'object',
                required: ['shardTypeId', 'shardTypeName'],
                properties: {
                    shardTypeId: { type: 'string' },
                    shardTypeName: { type: 'string' },
                    schema: { type: 'array', items: { type: 'string' } },
                    promptTag: { type: 'string', default: 'embeddingTemplate' },
                },
            },
        },
    }, async (req, reply) => {
        try {
            const user = req.user;
            if (!user?.tenantId) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardTypeId, shardTypeName, schema = [], promptTag = 'embeddingTemplate' } = req.body;
            // Get the shard type for more context
            const shardType = await shardTypeRepository.findById(shardTypeId, user.tenantId).catch((error) => {
                monitoring.trackException(error, { operation: 'embedding-template.findById', shardTypeId, tenantId: user.tenantId });
                return null;
            });
            // Find prompts by tag (embeddingTemplate)
            const prompts = promptResolverService
                ? await promptResolverService.listByTags(user.tenantId, [promptTag]).catch((error) => {
                    monitoring.trackException(error, { operation: 'embedding-template.listByTags', tenantId: user.tenantId, promptTag });
                    return [];
                })
                : [];
            if (prompts.length === 0) {
                // Fallback: return default template if no prompts found
                server.log.warn(`No prompts found with tag '${promptTag}' for tenant ${user.tenantId}`);
                return reply.code(200).send({
                    ...DEFAULT_EMBEDDING_TEMPLATE,
                    id: `${Date.now()}`,
                    name: `Template for ${shardTypeName}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: user.userId,
                });
            }
            // Use the first matching prompt (user can select different ones in the UI later)
            const prompt = prompts[0];
            // Render the prompt with shard type context
            if (!promptResolverService) {
                return reply.code(500).send({ error: 'Prompt resolver service not available' });
            }
            const rendered = await promptResolverService.resolveAndRender({
                tenantId: user.tenantId,
                userId: user.userId,
                slug: prompt.slug,
                variables: {
                    shardTypeName,
                    schema: JSON.stringify(schema),
                    shardTypeDescription: shardType?.description || '',
                },
            });
            if (!rendered) {
                return reply.code(400).send({ error: 'Failed to render prompt' });
            }
            // Call Azure OpenAI to generate the template
            if (!azureOpenAI) {
                return reply.code(500).send({ error: 'Azure OpenAI service not available' });
            }
            const systemPrompt = `You are an expert in embedding configuration. 
Generate a valid JSON embedding template based on the provided shard type information.
Return ONLY valid JSON with no markdown formatting, code blocks, or extra text.
The JSON must match this structure:
{
  "version": 1,
  "name": "template name",
  "description": "brief description",
  "isDefault": false,
  "fields": [
    {"name": "field1", "weight": 100, "include": true}
  ],
  "preprocessing": {"combineFields": true, "fieldSeparator": " ", "chunking": {"chunkSize": 512, "overlap": 50, "splitBySentence": true}},
  "normalization": {"l2Normalize": true},
  "modelConfig": {"strategy": "default", "modelId": "text-embedding-3-small"},
  "parentContext": {"mode": "whenScoped", "weight": 0.25, "fields": ["name", "tags", "summary"], "asContextPrefix": true, "maxLength": 120},
  "storeInShard": true,
  "enableVectorSearch": true
}`;
            const userPrompt = rendered.renderedUserPrompt;
            let jsonString = '';
            try {
                // Call Azure OpenAI chat completion
                jsonString = await azureOpenAI.chat(systemPrompt, userPrompt, {
                    temperature: 0.3,
                    maxTokens: 2000,
                });
            }
            catch (chatError) {
                server.log.warn(`Chat completion failed: ${chatError}, using default template`);
                // Fallback to default template on error
                return reply.code(200).send({
                    ...DEFAULT_EMBEDDING_TEMPLATE,
                    id: `${Date.now()}`,
                    name: `Template for ${shardTypeName}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: user.userId,
                });
            }
            // Parse the generated JSON response
            let generatedTemplate;
            try {
                const parsed = JSON.parse(jsonString);
                generatedTemplate = {
                    ...DEFAULT_EMBEDDING_TEMPLATE,
                    ...parsed,
                    id: `${Date.now()}`,
                    createdAt: new Date(),
                    createdBy: user.userId,
                    updatedAt: new Date(),
                };
            }
            catch (parseError) {
                server.log.warn(`Failed to parse generated template JSON: ${parseError}, using default template`);
                // If JSON parsing fails, use default but with schema fields
                generatedTemplate = {
                    ...DEFAULT_EMBEDDING_TEMPLATE,
                    id: `${Date.now()}`,
                    name: `AI-Generated: ${shardTypeName}`,
                    description: `Embedding template for ${shardTypeName} generated by AI`,
                    fields: schema.map((fieldName) => ({
                        name: fieldName,
                        weight: 100,
                        include: true,
                    })),
                    createdAt: new Date(),
                    createdBy: user.userId,
                    updatedAt: new Date(),
                };
            }
            monitoring.trackEvent('embeddingTemplate.generated', {
                shardTypeId,
                tenantId: user.tenantId,
                promptTag,
            });
            return reply.code(200).send(generatedTemplate);
        }
        catch (error) {
            monitoring.trackException(error, {
                component: 'EmbeddingTemplateGenerationRoutes',
                operation: 'generate',
            });
            return reply.code(500).send({ error: 'Failed to generate embedding template' });
        }
    });
    server.log.info('✅ Embedding template generation routes registered');
}
//# sourceMappingURL=embedding-template-generation.routes.js.map