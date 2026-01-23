/**
 * Schema Builder with AI Recommendations
 * 
 * Wraps SchemaBuilderTabs with AI recommendation capabilities
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SchemaBuilderTabs } from '@/components/shard-types';
import { AIRecommendationModal } from '@/components/ai-recommendation/ai-recommendation-modal';
import { SchemaRecommendationRenderer } from '@/components/ai-recommendation/renderers/schema-renderer';
import { useAIRecommendation } from '@/hooks/use-ai-recommendation';
import { Sparkles } from 'lucide-react';
import type { SchemaRecommendation } from '@castiel/shared-types';

interface SchemaBuilderWithAIProps {
  shardTypeId: string;
  shardTypeName: string;
  description?: string;
  value: Record<string, any>;
  onChange: (schema: Record<string, any>) => void;
}

export function SchemaBuilderWithAI({
  shardTypeId,
  shardTypeName,
  description,
  value,
  onChange,
}: SchemaBuilderWithAIProps) {
  const [showModal, setShowModal] = useState(false);
  const { generate } = useAIRecommendation<SchemaRecommendation>();

  const handleGenerate = async () => {
    return await generate('schemaRecommendation', {
      shardType: {
        id: shardTypeId,
        name: shardTypeName,
        description,
        schema: value,
      },
    });
  };

  const handleApply = async (recommendation: SchemaRecommendation) => {
    // Convert SchemaRecommendation to JSON Schema format
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of recommendation.fields) {
      properties[field.name] = {
        type: field.type,
        ...(field.description && { description: field.description }),
        ...(field.defaultValue !== undefined && { default: field.defaultValue }),
        ...(field.items && { items: field.items }),
        ...(field.properties && { properties: field.properties }),
      };

      // Add validation rules
      if (field.validation) {
        if (field.validation.pattern) {
          properties[field.name].pattern = field.validation.pattern;
        }
        if (field.validation.min !== undefined) {
          properties[field.name].minimum = field.validation.min;
        }
        if (field.validation.max !== undefined) {
          properties[field.name].maximum = field.validation.max;
        }
        if (field.validation.enum) {
          properties[field.name].enum = field.validation.enum;
        }
      }

      if (field.required) {
        required.push(field.name);
      }
    }

    const newSchema = {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    };

    onChange(newSchema);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Schema Definition</CardTitle>
              <CardDescription>Define the structure and validation rules (JSON Schema)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Suggestions
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SchemaBuilderTabs value={value} onChange={onChange} />
        </CardContent>
      </Card>

      <AIRecommendationModal<SchemaRecommendation>
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        recommendationType="schemaRecommendation"
        onGenerate={handleGenerate}
        onApply={handleApply}
        renderOption={(recommendation) => <SchemaRecommendationRenderer recommendation={recommendation} />}
        title="Schema Recommendations"
        description="AI-powered suggestions for your schema structure"
      />
    </>
  );
}
