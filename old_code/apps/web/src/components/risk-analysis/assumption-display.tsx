/**
 * Assumption Display Component
 * Displays assumption tracking data in a structured format
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Clock, Link2, FileX, Zap, Server } from 'lucide-react';
import type { RiskEvaluationAssumptions } from '@/types/risk-analysis';
import { DataQualityWarnings } from './data-quality-warnings';

interface AssumptionDisplayProps {
  assumptions: RiskEvaluationAssumptions;
  className?: string;
  showWarnings?: boolean;
}

export function AssumptionDisplay({ assumptions, className, showWarnings = true }: AssumptionDisplayProps) {
  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;
  const formatDays = (days: number) => {
    if (days < 1) return '< 1 day';
    if (days === 1) return '1 day';
    return `${Math.floor(days)} days`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Evaluation Assumptions
        </CardTitle>
        <CardDescription>
          Data quality and service availability information used in this evaluation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Quality Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Data Quality</h4>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Completeness</span>
                <Badge variant={assumptions.dataCompleteness >= 0.8 ? 'default' : assumptions.dataCompleteness >= 0.5 ? 'secondary' : 'destructive'}>
                  {formatPercent(assumptions.dataCompleteness)}
                </Badge>
              </div>
              <Progress value={assumptions.dataCompleteness * 100} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Data Age
                </span>
                <Badge variant={assumptions.dataStaleness > 180 ? 'destructive' : assumptions.dataStaleness > 90 ? 'secondary' : 'default'}>
                  {formatDays(assumptions.dataStaleness)}
                </Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Overall Quality Score</span>
                <Badge variant={assumptions.dataQualityScore >= 0.7 ? 'default' : assumptions.dataQualityScore >= 0.5 ? 'secondary' : 'destructive'}>
                  {formatPercent(assumptions.dataQualityScore)}
                </Badge>
              </div>
              <Progress value={assumptions.dataQualityScore * 100} className="h-2" />
            </div>
          </div>
        </div>

        {/* Missing Data */}
        {(assumptions.missingRequiredFields.length > 0 || assumptions.missingRelatedShards.length > 0) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileX className="h-4 w-4" />
              Missing Data
            </h4>
            
            {assumptions.missingRequiredFields.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Required Fields</div>
                <div className="flex flex-wrap gap-1">
                  {assumptions.missingRequiredFields.map((field) => (
                    <Badge key={field} variant="destructive" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {assumptions.missingRelatedShards.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Missing Relationships
                </div>
                <div className="flex flex-wrap gap-1">
                  {assumptions.missingRelatedShards.map((shardType) => (
                    <Badge key={shardType} variant="outline" className="text-xs">
                      {shardType}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Service Availability */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Server className="h-4 w-4" />
            Service Availability
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Grounding Service</span>
              <Badge variant={assumptions.serviceAvailability.groundingService ? 'default' : 'secondary'}>
                {assumptions.serviceAvailability.groundingService ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vector Search</span>
              <Badge variant={assumptions.serviceAvailability.vectorSearch ? 'default' : 'secondary'}>
                {assumptions.serviceAvailability.vectorSearch ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Historical Patterns</span>
              <Badge variant={assumptions.serviceAvailability.historicalPatterns ? 'default' : 'secondary'}>
                {assumptions.serviceAvailability.historicalPatterns ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                AI Model
              </span>
              <Badge variant={assumptions.aiModelAvailable ? 'default' : 'secondary'}>
                {assumptions.aiModelAvailable ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          </div>
          {assumptions.aiModelVersion && (
            <div className="text-xs text-muted-foreground">
              Model: {assumptions.aiModelVersion}
            </div>
          )}
        </div>

        {/* Context Information */}
        {assumptions.contextTokenCount > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Context Information</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Token Count</span>
              <span className="font-medium">{assumptions.contextTokenCount.toLocaleString()}</span>
            </div>
            {assumptions.contextTruncated && (
              <Badge variant="secondary" className="text-xs">
                Context was truncated
              </Badge>
            )}
          </div>
        )}

        {/* Warnings */}
        {showWarnings && <DataQualityWarnings assumptions={assumptions} />}
      </CardContent>
    </Card>
  );
}
