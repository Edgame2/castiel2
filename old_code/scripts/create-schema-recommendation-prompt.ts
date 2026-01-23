import { CosmosClient } from '@azure/cosmos';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: 'apps/api/.env' });

interface Prompt {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  scope: 'system' | 'tenant' | 'user';
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

const SYSTEM_TENANT_ID = 'system';
const SYSTEM_USER_ID = 'system';

const SCHEMA_RECOMMENDATION_SYSTEM_PROMPT: Prompt = {
  id: createHash('md5').update('schema-recommendation-system-v1').digest('hex'),
  tenantId: SYSTEM_TENANT_ID,
  name: 'Schema Recommendation - System Prompt',
  description: 'System prompt for generating schema field recommendations',
  content: `You are an expert data architect specializing in JSON Schema design and database modeling.

Your task is to analyze shard type requirements and generate optimal field schemas.

Guidelines:
1. Field Design:
   - Use clear, descriptive field names (camelCase)
   - Choose appropriate types (string, number, integer, boolean, array, object)
   - Define constraints (min, max, pattern, enum) when relevant
   - Set sensible defaults when applicable

2. Validation Rules:
   - Add regex patterns for formatted strings (email, phone, URL, etc.)
   - Set min/max for numbers and string lengths
   - Use enums for fixed value sets
   - Mark fields as required when they are essential

3. Relationships:
   - Identify potential relationships to other shard types
   - Suggest appropriate relationship types (one-to-one, one-to-many, many-to-many)
   - Consider embedding vs referencing trade-offs

4. Indices:
   - Recommend indices for fields likely to be queried frequently
   - Consider composite indices for common query patterns

5. Best Practices:
   - Keep schemas normalized but practical
   - Balance flexibility with data integrity
   - Consider future extensibility
   - Follow tenant conventions when provided

Risk Assessment:
- LOW: 1-3 simple fields, no complex validation
- MEDIUM: 4-8 fields or simple relationships
- HIGH: >8 fields, complex nested structures, or multiple relationships

Output Format:
Provide 2-3 options with different design approaches (minimal, balanced, comprehensive).
Each option should include:
- Fields array with complete definitions
- Confidence score (0-100%)
- Reasoning for design decisions
- Suggested indices
- Suggested relationships (if applicable)`,
  tags: ['schemaRecommendation', 'system'],
  scope: 'system',
  isActive: true,
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: SYSTEM_USER_ID,
  updatedBy: SYSTEM_USER_ID,
};

const SCHEMA_RECOMMENDATION_USER_PROMPT: Prompt = {
  id: createHash('md5').update('schema-recommendation-user-v1').digest('hex'),
  tenantId: SYSTEM_TENANT_ID,
  name: 'Schema Recommendation - User Prompt',
  description: 'User prompt template for schema field recommendations',
  content: `Generate a JSON schema for the following shard type:

Shard Type: {{shardType.name}}
Description: {{shardType.description}}

{{#if parentShardType}}
Parent Shard Type: {{parentShardType.name}}
Parent Schema: {{json parentShardType.schema}}
{{/if}}

{{#if relatedShardTypes}}
Related Shard Types:
{{#each relatedShardTypes}}
- {{this.name}}: {{this.description}}
{{/each}}
{{/if}}

{{#if dataSamples}}
Example Data:
{{#each dataSamples}}
{{json this}}
{{/each}}
{{/if}}

{{#if tenantConventions}}
Tenant Conventions:
- Naming: {{tenantConventions.namingConvention}}
- Required Fields: {{json tenantConventions.requiredFields}}
{{/if}}

{{#if additionalContext}}
Additional Context:
{{additionalContext}}
{{/if}}

Please provide 2-3 schema design options with different approaches.
Return ONLY valid JSON in this format:
[
  {
    "fields": [
      {
        "name": "fieldName",
        "type": "string",
        "description": "Field description",
        "required": true,
        "validation": {
          "pattern": "^[a-z]+$",
          "min": 1,
          "max": 100
        },
        "defaultValue": "value"
      }
    ],
    "confidence": 85,
    "reasoning": "Why this design is recommended",
    "suggestedIndices": ["fieldName"],
    "suggestedRelationships": [
      {
        "targetShardType": "OtherType",
        "relationshipType": "one-to-many",
        "description": "Relationship explanation"
      }
    ]
  }
]`,
  tags: ['schemaRecommendation', 'user'],
  scope: 'system',
  isActive: true,
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: SYSTEM_USER_ID,
  updatedBy: SYSTEM_USER_ID,
};

async function createPrompts() {
  console.log('🚀 Creating schema recommendation prompts...\n');

  try {
    // Connect directly to CosmosDB
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_NAME || 'castiel';

    if (!endpoint || !key) {
      throw new Error('COSMOS_DB_ENDPOINT and COSMOS_DB_KEY must be set');
    }

    const client = new CosmosClient({ endpoint, key });
    const database = client.database(databaseId);
    const container = database.container('prompts');

    // Create system prompt
    console.log('Creating system prompt...');
    await container.items.upsert(SCHEMA_RECOMMENDATION_SYSTEM_PROMPT);
    console.log('✅ System prompt created');

    // Create user prompt
    console.log('Creating user prompt...');
    await container.items.upsert(SCHEMA_RECOMMENDATION_USER_PROMPT);
    console.log('✅ User prompt created');

    console.log('\n✨ All prompts created successfully!');
    console.log('\nPrompt IDs:');
    console.log(`- System: ${SCHEMA_RECOMMENDATION_SYSTEM_PROMPT.id}`);
    console.log(`- User: ${SCHEMA_RECOMMENDATION_USER_PROMPT.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating prompts:', error);
    process.exit(1);
  }
}

createPrompts();
