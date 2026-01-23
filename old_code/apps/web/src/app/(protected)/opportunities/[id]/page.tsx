/**
 * Opportunity Detail Page
 * Displays opportunity details with related shards, risk analysis, and recommendations
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useOpportunity } from '@/hooks/use-opportunities';
import { handleApiError } from '@/lib/api/client';
import type { Shard } from '@/types/api';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const { data: opportunity, isLoading, error, refetch } = useOpportunity(opportunityId, true, !!opportunityId);
  const errorMessage = error ? handleApiError(error) : null;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-10 pb-16 md:block">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load opportunity</AlertTitle>
          <AlertDescription>
            {typeof errorMessage === 'string' ? errorMessage : 'An error occurred while loading the opportunity. Please try again.'}
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/opportunities')}
              >
                Back to Opportunities
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="space-y-6 p-10 pb-16 md:block">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Opportunity not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/opportunities')}
            >
              Back to Opportunities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const oppData = opportunity.opportunity.structuredData as any;

  return (
    <div className="space-y-6 p-10 pb-16 md:block">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/opportunities">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {oppData?.name || opportunity.opportunity.name || 'Unnamed Opportunity'}
            </h2>
            <p className="text-muted-foreground">Opportunity Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/shards/${opportunity.opportunity.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Opportunity
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/risk-analysis/opportunities/${opportunity.opportunity.id}`)}
          >
            View Risk Analysis
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Opportunity Details */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Stage</h3>
                <p className="text-lg font-semibold">{oppData?.stage || 'Unknown'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <p className="text-lg font-semibold">{oppData?.status || 'Unknown'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Value</h3>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: oppData?.currency || 'USD',
                  }).format(oppData?.value || 0)}
                </p>
              </div>
              {oppData?.expectedRevenue && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Expected Revenue</h3>
                  <p className="text-lg font-semibold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: oppData?.currency || 'USD',
                    }).format(oppData.expectedRevenue)}
                  </p>
                </div>
              )}
              {oppData?.closeDate && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Close Date</h3>
                  <p className="text-lg font-semibold">
                    {new Date(oppData.closeDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {oppData?.probability && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Win Probability</h3>
                  <p className="text-lg font-semibold">{(oppData.probability * 100).toFixed(0)}%</p>
                </div>
              )}
              {oppData?.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="text-sm">{oppData.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk Summary */}
        {opportunity.riskEvaluation && (
          <Card className="col-span-1">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Risk Summary</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Risk Score</h4>
                  <p className="text-2xl font-bold">
                    {(opportunity.riskEvaluation.riskScore * 100).toFixed(0)}%
                  </p>
                </div>
                {opportunity.riskEvaluation.revenueAtRisk && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Revenue at Risk</h4>
                    <p className="text-lg font-semibold text-destructive">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: oppData?.currency || 'USD',
                      }).format(opportunity.riskEvaluation.revenueAtRisk)}
                    </p>
                  </div>
                )}
                {opportunity.riskEvaluation.risks && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Risk Count</h4>
                    <p className="text-lg font-semibold">
                      {opportunity.riskEvaluation.risks.length} risks detected
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related Shards */}
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Related Shards</h3>
            <div className="space-y-4">
              {opportunity.relatedShards.account && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Account</h4>
                  <p className="text-sm">
                    {(opportunity.relatedShards.account.structuredData as any)?.name ||
                      opportunity.relatedShards.account.name}
                  </p>
                </div>
              )}
              {opportunity.relatedShards.contact && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                  <p className="text-sm">
                    {(opportunity.relatedShards.contact.structuredData as any)?.name ||
                      opportunity.relatedShards.contact.name}
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Documents</h4>
                <p className="text-sm">{opportunity.relatedShards.documents.length} documents</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Tasks</h4>
                <p className="text-sm">{opportunity.relatedShards.tasks.length} tasks</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Meetings</h4>
                <p className="text-sm">{opportunity.relatedShards.meetings.length} meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

