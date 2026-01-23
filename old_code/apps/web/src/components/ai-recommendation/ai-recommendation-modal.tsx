/**
 * AI Recommendation Modal
 * 
 * Generic modal for displaying AI-powered recommendations across the platform.
 * Supports multiple options, approval workflow, and type-specific rendering.
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type {
  AIRecommendationResponse,
  RecommendationType,
  RecommendationOption,
} from '@castiel/shared-types';

interface AIRecommendationModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  recommendationType: RecommendationType;
  onGenerate: () => Promise<AIRecommendationResponse<T>>;
  onApply: (recommendation: T, optionIndex: number) => Promise<void>;
  renderOption?: (recommendation: T, optionIndex: number) => React.ReactNode;
  title?: string;
  description?: string;
}

export function AIRecommendationModal<T = any>({
  isOpen,
  onClose,
  recommendationType,
  onGenerate,
  onApply,
  renderOption,
  title,
  description,
}: AIRecommendationModalProps<T>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [response, setResponse] = useState<AIRecommendationResponse<T> | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [editedRecommendation, setEditedRecommendation] = useState<T | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await onGenerate();
      setResponse(result);
      setSelectedOptionIndex(0);
      setEditedRecommendation(null);
      toast.success('Recommendation generated successfully');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to generate recommendation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!response) return;

    const recommendation = editedRecommendation || response.options[selectedOptionIndex].recommendation;

    setIsApplying(true);
    try {
      await onApply(recommendation, selectedOptionIndex);
      toast.success('Recommendation applied successfully');
      onClose();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to apply recommendation');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setResponse(null);
    setSelectedOptionIndex(0);
    setEditedRecommendation(null);
    onClose();
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {title || 'AI Recommendation'}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Generate Button */}
          {!response && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Sparkles className="h-16 w-16 text-purple-500 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Generate AI-powered recommendations to help you get started
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Recommendations
              </Button>
            </div>
          )}

          {/* Options Display */}
          {response && response.options.length > 0 && (
            <div className="space-y-4">
              {/* Option Selector (if multiple options) */}
              {response.options.length > 1 && (
                <Tabs
                  value={String(selectedOptionIndex)}
                  onValueChange={(value) => setSelectedOptionIndex(Number(value))}
                >
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${response.options.length}, 1fr)` }}>
                    {response.options.map((option, index) => (
                      <TabsTrigger key={index} value={String(index)} className="flex items-center gap-2">
                        Option {index + 1}
                        <Badge variant={getRiskBadgeVariant(option.riskLevel)} className="ml-1">
                          {option.riskLevel}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {response.options.map((option, index) => (
                    <TabsContent key={index} value={String(index)}>
                      <OptionCard option={option} index={index} renderOption={renderOption} />
                    </TabsContent>
                  ))}
                </Tabs>
              )}

              {/* Single Option Display */}
              {response.options.length === 1 && (
                <OptionCard
                  option={response.options[0]}
                  index={0}
                  renderOption={renderOption}
                />
              )}

              {/* Metadata */}
              <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <p className="font-medium">{response.metadata.model}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <p className="font-medium">
                      {Math.round(response.options[selectedOptionIndex].confidence * 100)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tokens:</span>
                    <p className="font-medium">{response.metadata.tokens.total}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">{response.metadata.processingTime.toFixed(2)}s</p>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getRiskIcon(response.options[selectedOptionIndex].riskLevel)}
                  <span className="text-sm text-muted-foreground">
                    {response.options[selectedOptionIndex].riskLevel === 'low' &&
                      'Low risk - Safe to apply'}
                    {response.options[selectedOptionIndex].riskLevel === 'medium' &&
                      'Medium risk - Review recommended'}
                    {response.options[selectedOptionIndex].riskLevel === 'high' &&
                      'High risk - Carefully review before applying'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGenerate} disabled={isGenerating || isApplying}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Regenerate
                  </Button>
                  <Button variant="outline" onClick={handleClose} disabled={isApplying}>
                    Cancel
                  </Button>
                  <Button onClick={handleApply} disabled={isApplying}>
                    {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Apply
                  </Button>
                </div>
              </div>

              {/* Suggested Next Action */}
              {response.suggestedNextAction && (
                <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Suggested Next Step</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {response.suggestedNextAction.message}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Continue
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for rendering an option card
interface OptionCardProps<T = any> {
  option: RecommendationOption<T>;
  index: number;
  renderOption?: (recommendation: T, optionIndex: number) => React.ReactNode;
}

function OptionCard<T = any>({ option, index, renderOption }: OptionCardProps<T>) {
  return (
    <Card className="p-4 space-y-4">
      {/* Reasoning */}
      <div>
        <h4 className="text-sm font-medium mb-2">Why this recommendation?</h4>
        <p className="text-sm text-muted-foreground">{option.reasoning}</p>
      </div>

      {/* Custom Rendering or JSON Display */}
      <div>
        <h4 className="text-sm font-medium mb-2">Details</h4>
        {renderOption ? (
          renderOption(option.recommendation, index)
        ) : (
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {JSON.stringify(option.recommendation, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}
