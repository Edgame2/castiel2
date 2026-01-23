/**
 * Grounding Warning Component
 * Displays warnings when grounding service is unavailable
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroundingWarningProps {
  warnings: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    impact?: string;
  }>;
  className?: string;
}

export function GroundingWarning({ warnings, className }: GroundingWarningProps) {
  const groundingWarnings = warnings.filter(w => w.type === 'ungrounded_response');

  if (groundingWarnings.length === 0) {
    return null;
  }

  const warning = groundingWarnings[0]; // Usually only one grounding warning

  return (
    <Alert 
      variant={warning.severity === 'high' ? 'destructive' : 'default'} 
      className={cn(className)}
    >
      <ShieldX className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Response Not Verified
        <Badge variant="outline" className="text-xs">
          {warning.severity === 'high' ? 'High Priority' : warning.severity === 'medium' ? 'Warning' : 'Info'}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="text-sm">{warning.message}</div>
        {warning.impact && (
          <div className="text-xs text-muted-foreground mt-2">
            <strong>Impact:</strong> {warning.impact}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
