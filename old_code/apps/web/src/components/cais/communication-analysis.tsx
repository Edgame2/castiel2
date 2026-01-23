/**
 * Communication Analysis Component
 * Analyzes communication content for sentiment, tone, and engagement
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Mail,
  Phone,
  Video,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Smile,
  Frown,
  Meh,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useAnalyzeCommunication } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { CommunicationAnalysis } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface CommunicationAnalysisProps {
  className?: string;
  opportunityId?: string;
}

export function CommunicationAnalysis({ className, opportunityId }: CommunicationAnalysisProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [communicationType, setCommunicationType] = useState<'email' | 'meeting' | 'call' | 'message'>('email');
  const [content, setContent] = useState('');
  const [analyzedData, setAnalyzedData] = useState<CommunicationAnalysis | null>(null);

  const {
    mutate: analyze,
    isPending: isAnalyzing,
    error,
  } = useAnalyzeCommunication();

  const handleAnalyze = () => {
    if (!content.trim()) return;

    analyze(
      {
        tenantId,
        communicationType,
        content,
        opportunityId,
      },
      {
        onSuccess: (data) => {
          setAnalyzedData(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to analyze communication', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="h-5 w-5 text-green-500" />;
      case 'negative':
        return <Frown className="h-5 w-5 text-red-500" />;
      case 'mixed':
        return <Meh className="h-5 w-5 text-yellow-500" />;
      default:
        return <Meh className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500';
      case 'negative':
        return 'bg-red-500';
      case 'mixed':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail;
      case 'meeting':
        return Video;
      case 'call':
        return Phone;
      default:
        return MessageSquare;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication Analysis
          </CardTitle>
          <CardDescription>
            Analyze communication content for sentiment, tone, and engagement insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="communication-type">Communication Type</Label>
                <Select
                  value={communicationType}
                  onValueChange={(value: any) => setCommunicationType(value)}
                >
                  <SelectTrigger id="communication-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter communication content to analyze..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!content.trim() || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Analyze Communication
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to analyze communication'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {analyzedData && (
            <div className="space-y-4 mt-6">
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                  <TabsTrigger value="tone">Tone</TabsTrigger>
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Sentiment Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Sentiment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          {getSentimentIcon(analyzedData.sentiment.overall)}
                          <div>
                            <p className="text-2xl font-bold capitalize">
                              {analyzedData.sentiment.overall}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(analyzedData.sentiment.confidence * 100).toFixed(0)}% confidence
                            </p>
                          </div>
                        </div>
                        {analyzedData.sentiment.breakdown && (
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Positive</span>
                              <span>{(analyzedData.sentiment.breakdown.positive * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Neutral</span>
                              <span>{(analyzedData.sentiment.breakdown.neutral * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Negative</span>
                              <span>{(analyzedData.sentiment.breakdown.negative * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Engagement Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Engagement
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-2xl font-bold">
                              {(analyzedData.engagement.depth * 100).toFixed(0)}%
                            </p>
                            <p className="text-sm text-muted-foreground">Depth</p>
                          </div>
                          {analyzedData.engagement.responseTime && (
                            <div className="text-sm">
                              <p className="text-muted-foreground">Response Time</p>
                              <p className="font-medium">
                                {analyzedData.engagement.responseTime < 1000
                                  ? `${analyzedData.engagement.responseTime}ms`
                                  : `${(analyzedData.engagement.responseTime / 1000).toFixed(1)}s`}
                              </p>
                            </div>
                          )}
                          {analyzedData.engagement.questionCount !== undefined && (
                            <div className="text-sm">
                              <p className="text-muted-foreground">Questions</p>
                              <p className="font-medium">{analyzedData.engagement.questionCount}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Communication Type Card */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Type
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = getCommunicationIcon(analyzedData.communicationType);
                            return <Icon className="h-8 w-8 text-muted-foreground" />;
                          })()}
                          <p className="text-lg font-semibold capitalize">
                            {analyzedData.communicationType}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="sentiment" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sentiment Analysis</CardTitle>
                      <CardDescription>Detailed sentiment breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={cn('h-16 w-16 rounded-full flex items-center justify-center', getSentimentColor(analyzedData.sentiment.overall))}>
                          {getSentimentIcon(analyzedData.sentiment.overall)}
                        </div>
                        <div>
                          <p className="text-2xl font-bold capitalize">{analyzedData.sentiment.overall}</p>
                          <p className="text-sm text-muted-foreground">
                            Confidence: {(analyzedData.sentiment.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      {analyzedData.sentiment.breakdown && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Positive</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-secondary rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${analyzedData.sentiment.breakdown.positive * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {(analyzedData.sentiment.breakdown.positive * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Neutral</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-secondary rounded-full h-2">
                                <div
                                  className="bg-gray-500 h-2 rounded-full"
                                  style={{ width: `${analyzedData.sentiment.breakdown.neutral * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {(analyzedData.sentiment.breakdown.neutral * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Negative</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-secondary rounded-full h-2">
                                <div
                                  className="bg-red-500 h-2 rounded-full"
                                  style={{ width: `${analyzedData.sentiment.breakdown.negative * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {(analyzedData.sentiment.breakdown.negative * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tone" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tone Analysis</CardTitle>
                      <CardDescription>Communication tone characteristics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(analyzedData.tone).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">{key}</span>
                              <span className="text-sm font-bold">{(value * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${value * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="engagement" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Engagement Metrics</CardTitle>
                      <CardDescription>Communication engagement analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Engagement Depth</p>
                          <p className="text-2xl font-bold">{(analyzedData.engagement.depth * 100).toFixed(0)}%</p>
                        </div>
                        {analyzedData.engagement.responseTime && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Response Time</p>
                            <p className="text-2xl font-bold">
                              {analyzedData.engagement.responseTime < 1000
                                ? `${analyzedData.engagement.responseTime}ms`
                                : `${(analyzedData.engagement.responseTime / 1000).toFixed(1)}s`}
                            </p>
                          </div>
                        )}
                        {analyzedData.engagement.responseRate !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Response Rate</p>
                            <p className="text-2xl font-bold">{(analyzedData.engagement.responseRate * 100).toFixed(0)}%</p>
                          </div>
                        )}
                        {analyzedData.engagement.questionCount !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Questions</p>
                            <p className="text-2xl font-bold">{analyzedData.engagement.questionCount}</p>
                          </div>
                        )}
                        {analyzedData.engagement.actionItemCount !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Action Items</p>
                            <p className="text-2xl font-bold">{analyzedData.engagement.actionItemCount}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Insights</CardTitle>
                      <CardDescription>Key findings and recommendations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Summary</h4>
                        <p className="text-sm text-muted-foreground">{analyzedData.insights.summary}</p>
                      </div>

                      {analyzedData.insights.keyFindings.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Key Findings</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {analyzedData.insights.keyFindings.map((finding, idx) => (
                              <li key={idx}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analyzedData.insights.recommendations && analyzedData.insights.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Recommendations</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {analyzedData.insights.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analyzedData.insights.riskIndicators && analyzedData.insights.riskIndicators.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            Risk Indicators
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {analyzedData.insights.riskIndicators.map((risk, idx) => (
                              <li key={idx} className="text-yellow-600">{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analyzedData.language.keywords.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {analyzedData.language.keywords.map((keyword, idx) => (
                              <Badge key={idx} variant="outline">{keyword}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {analyzedData.language.topics.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Topics</h4>
                          <div className="flex flex-wrap gap-2">
                            {analyzedData.language.topics.map((topic, idx) => (
                              <Badge key={idx} variant="secondary">{topic}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
