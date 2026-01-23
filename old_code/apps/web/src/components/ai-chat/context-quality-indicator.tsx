/**
 * Context Quality Indicator Component
 * Displays context quality metrics for AI Chat responses
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ContextQuality } from '@/lib/api/insights';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContextQualityIndicatorProps {
  contextQuality: ContextQuality;
  className?: string;
  compact?: boolean;
}

export function ContextQualityIndicator({ contextQuality, className, compact = false }: ContextQualityIndicatorProps) {
  const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

  const qualityColor = contextQuality.qualityScore >= 0.7 ? 'text-green-600' : 
                       contextQuality.qualityScore >= 0.5 ? 'text-yellow-600' : 
                       'text-red-600';

  const qualityIcon = contextQuality.qualityScore >= 0.7 ? CheckCircle2 :
                      contextQuality.qualityScore >= 0.5 ? AlertTriangle :
                      XCircle;

  const Icon = qualityIcon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2', className)}>
              <Icon className={cn('h-4 w-4', qualityColor)} />
              <Badge variant={contextQuality.qualityScore >= 0.7 ? 'default' : contextQuality.qualityScore >= 0.5 ? 'secondary' : 'destructive'}>
                {formatPercent(contextQuality.qualityScore)}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <div>Quality: {formatPercent(contextQuality.qualityScore)}</div>
              <div>Sources: {contextQuality.sourceCount}</div>
              <div>Relevance: {formatPercent(contextQuality.averageRelevance)}</div>
              {contextQuality.truncated && <div className="text-orange-600">Truncated</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Quality Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', qualityColor)} />
            <span className="text-sm font-medium">Context Quality</span>
          </div>
          <Badge variant={contextQuality.qualityScore >= 0.7 ? 'default' : contextQuality.qualityScore >= 0.5 ? 'secondary' : 'destructive'}>
            {formatPercent(contextQuality.qualityScore)}
          </Badge>
        </div>
        <Progress value={contextQuality.qualityScore * 100} className="h-2" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Sources</div>
          <div className="font-medium">{contextQuality.sourceCount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Relevance</div>
          <div className="font-medium">{formatPercent(contextQuality.averageRelevance)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Completeness</div>
          <div className="font-medium">{formatPercent(contextQuality.completeness)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Tokens</div>
          <div className="font-medium">{contextQuality.totalTokens.toLocaleString()}</div>
        </div>
      </div>

      {/* Warnings */}
      {contextQuality.warnings.length > 0 && (
        <div className="space-y-2">
          {contextQuality.warnings.map((warning, index) => (
            <Alert key={index} variant={warning.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div className="font-medium">{warning.message}</div>
                {warning.impact && (
                  <div className="text-muted-foreground mt-1">{warning.impact}</div>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Truncation Warning */}
      {contextQuality.truncated && (
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Context was truncated from {contextQuality.totalTokens.toLocaleString()} to {contextQuality.tokenLimit.toLocaleString()} tokens.
            {contextQuality.truncatedSections && contextQuality.truncatedSections.length > 0 && (
              <div className="mt-1 text-muted-foreground">
                Truncated sections: {contextQuality.truncatedSections.join(', ')}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Missing Sources */}
      {contextQuality.missingExpectedSources.length > 0 && (
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Missing expected sources: {contextQuality.missingExpectedSources.join(', ')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
