/**
 * Schema Recommendation Renderer
 * 
 * Displays schema recommendations in a user-friendly format
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { SchemaRecommendation } from '@castiel/shared-types';

interface SchemaRecommendationRendererProps {
  recommendation: SchemaRecommendation;
}

export function SchemaRecommendationRenderer({ recommendation }: SchemaRecommendationRendererProps) {
  return (
    <div className="space-y-4">
      {/* Fields */}
      <div>
        <h5 className="text-sm font-medium mb-3">Suggested Fields ({recommendation.fields.length})</h5>
        <div className="space-y-2">
          {recommendation.fields.map((field, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{field.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                    {field.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
                  )}
                  
                  {/* Validation Rules */}
                  {field.validation && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.validation.pattern && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          Pattern: {field.validation.pattern}
                        </Badge>
                      )}
                      {field.validation.min !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          Min: {field.validation.min}
                        </Badge>
                      )}
                      {field.validation.max !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          Max: {field.validation.max}
                        </Badge>
                      )}
                      {field.validation.enum && (
                        <Badge variant="secondary" className="text-xs">
                          Enum: {field.validation.enum.join(', ')}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Default Value */}
                  {field.defaultValue !== undefined && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">
                        Default: <code className="bg-muted px-1 py-0.5 rounded">{JSON.stringify(field.defaultValue)}</code>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Suggested Indices */}
      {recommendation.suggestedIndices && recommendation.suggestedIndices.length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-2">Suggested Indices</h5>
          <div className="flex flex-wrap gap-2">
            {recommendation.suggestedIndices.map((index, i) => (
              <Badge key={i} variant="outline">
                {index}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Relationships */}
      {recommendation.suggestedRelationships && recommendation.suggestedRelationships.length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-3">Suggested Relationships</h5>
          <div className="space-y-2">
            {recommendation.suggestedRelationships.map((rel, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{rel.fieldName}</span>
                    <p className="text-xs text-muted-foreground">→ {rel.targetShardType}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {rel.relationship}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
