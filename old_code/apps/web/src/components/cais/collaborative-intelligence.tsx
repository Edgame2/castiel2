/**
 * Collaborative Intelligence Component
 * Team learning and knowledge sharing
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Users,
  TrendingUp,
  Brain,
  RefreshCw,
  Send,
  AlertTriangle,
  Lightbulb,
  Target,
} from 'lucide-react';
import { useLearnTeamPattern } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface CollaborativeIntelligenceProps {
  className?: string;
  teamId?: string;
}

export function CollaborativeIntelligence({ className, teamId }: CollaborativeIntelligenceProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localTeamId, setLocalTeamId] = useState(teamId || '');
  const [patternType, setPatternType] = useState<'success' | 'failure' | 'preference' | 'expertise'>('success');
  const [pattern, setPattern] = useState('');
  const [learnedPattern, setLearnedPattern] = useState<any>(null);

  const {
    mutate: learn,
    isPending: isLearning,
    error,
  } = useLearnTeamPattern();

  const handleLearn = () => {
    if (!localTeamId || !patternType || !pattern) return;

    let patternObj: any;
    try {
      patternObj = JSON.parse(pattern);
    } catch (e) {
      patternObj = { raw: pattern };
    }

    learn(
      {
        tenantId,
        teamId: localTeamId,
        patternType,
        pattern: patternObj,
      },
      {
        onSuccess: (data) => {
          setLearnedPattern(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to learn team pattern', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaborative Intelligence
          </CardTitle>
          <CardDescription>
            Team learning and knowledge sharing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="team-id">Team ID</Label>
                <Input
                  id="team-id"
                  value={localTeamId}
                  onChange={(e) => setLocalTeamId(e.target.value)}
                  placeholder="Enter team ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pattern-type">Pattern Type</Label>
                <Select value={patternType} onValueChange={(value: any) => setPatternType(value)}>
                  <SelectTrigger id="pattern-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="preference">Preference</SelectItem>
                    <SelectItem value="expertise">Expertise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pattern">Pattern Data (JSON)</Label>
              <Textarea
                id="pattern"
                placeholder='Enter pattern data as JSON (e.g., {"context": "tech:large:proposal", "action": "...", "outcome": 0.8})'
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleLearn}
              disabled={!localTeamId || !patternType || !pattern || isLearning}
              className="w-full"
            >
              {isLearning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Learning...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Learn Pattern
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Learning Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to learn team pattern'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {learnedPattern && (
            <div className="space-y-4 mt-6">
              {/* Pattern Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Learned Pattern</CardTitle>
                  <CardDescription>Team pattern learning results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Pattern ID</p>
                      <p className="text-sm font-mono">{learnedPattern.patternId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Pattern Type</p>
                      <Badge variant="outline" className="capitalize">{learnedPattern.patternType}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(learnedPattern.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{((learnedPattern.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {learnedPattern.pattern?.frequency !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Frequency</p>
                        <p className="text-lg font-bold">{learnedPattern.pattern.frequency}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Pattern Details
                    </h4>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64">
                      {JSON.stringify(learnedPattern.pattern || learnedPattern, null, 2)}
                    </pre>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Detected At</span>
                      <span className="text-sm">
                        {new Date(learnedPattern.detectedAt || learnedPattern.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
