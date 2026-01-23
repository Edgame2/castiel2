/**
 * Early Warning Signal Component
 * Individual early warning signal display
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  User,
  Calendar,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { EarlyWarningSignal as EarlyWarningSignalType } from '@/types/risk-analysis';

interface EarlyWarningSignalProps {
  signal: EarlyWarningSignalType;
  onAcknowledge?: (id: string) => void;
}

export function EarlyWarningSignal({ signal, onAcknowledge }: EarlyWarningSignalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get severity config
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badge: 'destructive' as const,
        };
      case 'medium':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badge: 'default' as const,
        };
      case 'low':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badge: 'secondary' as const,
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badge: 'secondary' as const,
        };
    }
  };

  const severityConfig = getSeverityConfig(signal.severity);

  // Get signal type label
  const getSignalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stage_stagnation: 'Stage Stagnation',
      activity_drop: 'Activity Drop',
      stakeholder_churn: 'Stakeholder Churn',
      risk_acceleration: 'Risk Acceleration',
      budget_concern: 'Budget Concern',
      timeline_slip: 'Timeline Slip',
    };
    return labels[type] || type;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <Card
      className={`${severityConfig.bgColor} ${severityConfig.borderColor} border-l-4 ${
        !signal.acknowledgedAt ? 'shadow-sm' : ''
      }`}
    >
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 mt-0.5 ${severityConfig.color}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{getSignalTypeLabel(signal.signalType)}</h4>
                  <Badge variant={severityConfig.badge} className="text-xs">
                    {signal.severity}
                  </Badge>
                  {!signal.acknowledgedAt && (
                    <Badge variant="outline" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{signal.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(signal.detectedAt)}
                  </div>
                  {signal.acknowledgedAt && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Acknowledged {formatDate(signal.acknowledgedAt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!signal.acknowledgedAt && onAcknowledge && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAcknowledge(signal.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Acknowledge
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </Button>
              </div>
            </div>

            {/* Evidence */}
            {isExpanded && signal.evidence && signal.evidence.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Evidence
                </h5>
                <div className="space-y-2">
                  {signal.evidence.map((evidence, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground bg-white/50 p-2 rounded border"
                    >
                      <div className="font-medium">{evidence.type}</div>
                      <div className="text-xs mt-1">{evidence.label}</div>
                      <div className="text-xs mt-1 text-muted-foreground">
                        <strong>Value:</strong> {String(evidence.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

