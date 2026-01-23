/**
 * Data Quality Warnings Component
 * Displays data quality issues and warnings
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Link2, FileX } from 'lucide-react';
import type { RiskEvaluationAssumptions } from '@/types/risk-analysis';
import { cn } from '@/lib/utils';

interface DataQualityWarningsProps {
  assumptions: RiskEvaluationAssumptions;
  className?: string;
}

export function DataQualityWarnings({ assumptions, className }: DataQualityWarningsProps) {
  const warnings: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high'; icon: typeof AlertTriangle }> = [];

  // Check data completeness
  if (assumptions.dataCompleteness < 0.5) {
    warnings.push({
      type: 'incomplete',
      message: `Data completeness is ${(assumptions.dataCompleteness * 100).toFixed(0)}%. Some required fields may be missing.`,
      severity: 'high',
      icon: FileX,
    });
  } else if (assumptions.dataCompleteness < 0.8) {
    warnings.push({
      type: 'incomplete',
      message: `Data completeness is ${(assumptions.dataCompleteness * 100).toFixed(0)}%. Some fields may be missing.`,
      severity: 'medium',
      icon: FileX,
    });
  }

  // Check data staleness
  if (assumptions.dataStaleness > 180) {
    warnings.push({
      type: 'stale',
      message: `Data is ${assumptions.dataStaleness} days old. Consider refreshing before making decisions.`,
      severity: 'high',
      icon: Clock,
    });
  } else if (assumptions.dataStaleness > 90) {
    warnings.push({
      type: 'stale',
      message: `Data is ${assumptions.dataStaleness} days old. May need refreshing.`,
      severity: 'medium',
      icon: Clock,
    });
  }

  // Check missing relationships
  if (assumptions.missingRelatedShards.length > 0) {
    warnings.push({
      type: 'missing_relationships',
      message: `Missing expected relationships: ${assumptions.missingRelatedShards.join(', ')}`,
      severity: assumptions.missingRelatedShards.length > 2 ? 'high' : 'medium',
      icon: Link2,
    });
  }

  // Check missing required fields
  if (assumptions.missingRequiredFields.length > 0) {
    warnings.push({
      type: 'missing_fields',
      message: `Missing required fields: ${assumptions.missingRequiredFields.join(', ')}`,
      severity: 'high',
      icon: FileX,
    });
  }

  // Check service availability
  if (!assumptions.serviceAvailability.groundingService) {
    warnings.push({
      type: 'service_unavailable',
      message: 'Grounding service unavailable. Responses may not be verified.',
      severity: 'medium',
      icon: AlertTriangle,
    });
  }

  if (!assumptions.serviceAvailability.vectorSearch) {
    warnings.push({
      type: 'service_unavailable',
      message: 'Vector search unavailable. Semantic discovery disabled.',
      severity: 'low',
      icon: AlertTriangle,
    });
  }

  // Check context truncation
  if (assumptions.contextTruncated) {
    warnings.push({
      type: 'context_truncated',
      message: `Context was truncated (${assumptions.contextTokenCount} tokens). Some information may be missing.`,
      severity: 'medium',
      icon: AlertTriangle,
    });
  }

  if (warnings.length === 0) {
    return null;
  }

  const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
  const mediumSeverityWarnings = warnings.filter(w => w.severity === 'medium');
  const lowSeverityWarnings = warnings.filter(w => w.severity === 'low');

  return (
    <div className={cn('space-y-2', className)}>
      {highSeverityWarnings.map((warning, index) => (
        <Alert key={`high-${index}`} variant="destructive">
          <warning.icon className="h-4 w-4" />
          <AlertTitle>High Priority</AlertTitle>
          <AlertDescription>{warning.message}</AlertDescription>
        </Alert>
      ))}

      {mediumSeverityWarnings.map((warning, index) => (
        <Alert key={`medium-${index}`} variant="default">
          <warning.icon className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>{warning.message}</AlertDescription>
        </Alert>
      ))}

      {lowSeverityWarnings.map((warning, index) => (
        <Alert key={`low-${index}`} variant="default">
          <warning.icon className="h-4 w-4" />
          <AlertDescription>{warning.message}</AlertDescription>
        </Alert>
      ))}

      {/* Overall Quality Score */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Overall Data Quality Score</span>
          <Badge variant={assumptions.dataQualityScore >= 0.7 ? 'default' : assumptions.dataQualityScore >= 0.5 ? 'secondary' : 'destructive'}>
            {(assumptions.dataQualityScore * 100).toFixed(0)}%
          </Badge>
        </div>
      </div>
    </div>
  );
}
