/**
 * Risk Analysis Page for Opportunity
 * Main page for viewing risk analysis of an opportunity
 */

'use client';

import { useParams } from 'next/navigation';
import { RiskOverview } from '@/components/risk-analysis/risk-overview';
import { RiskDetailsPanel } from '@/components/risk-analysis/risk-details-panel';
import { RiskTimeline } from '@/components/risk-analysis/risk-timeline';
import { RiskMitigationPanel } from '@/components/risk-analysis/risk-mitigation-panel';
import { EarlyWarningPanel } from '@/components/early-warnings/early-warning-panel';
import { SimulationPanel } from '@/components/simulation/simulation-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingUp, Clock, Shield, Bell, Play } from 'lucide-react';

export default function OpportunityRiskAnalysisPage() {
  const params = useParams();
  const opportunityId = params.opportunityId as string;

  if (!opportunityId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-semibold">Opportunity ID required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Risk Analysis</h1>
        <p className="text-muted-foreground">
          Comprehensive risk evaluation and mitigation for this opportunity
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="details">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="mitigation">
            <Shield className="h-4 w-4 mr-2" />
            Mitigation
          </TabsTrigger>
          <TabsTrigger value="warnings">
            <Bell className="h-4 w-4 mr-2" />
            Warnings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <RiskOverview opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <RiskDetailsPanel opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <RiskTimeline opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="mitigation" className="mt-4">
          <RiskMitigationPanel opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="warnings" className="mt-4">
          <EarlyWarningPanel opportunityId={opportunityId} />
        </TabsContent>
      </Tabs>

      {/* Simulation Section */}
      <div className="mt-6">
        <SimulationPanel opportunityId={opportunityId} />
      </div>
    </div>
  );
}


