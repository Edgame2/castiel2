/**
 * Forecast Page
 * Comprehensive forecast analysis with decomposition, consensus, and commitment
 */

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ForecastDecomposition } from '@/components/cais/forecast-decomposition';
import { ConsensusForecast } from '@/components/cais/consensus-forecast';
import { ForecastCommitment } from '@/components/cais/forecast-commitment';
import { PieChart, Users, Target } from 'lucide-react';

export default function ForecastPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Forecast Analysis</h1>
        <p className="text-muted-foreground">
          Comprehensive forecast analysis with decomposition, consensus, and commitment insights
        </p>
      </div>

      <Tabs defaultValue="decomposition" className="space-y-6">
        <TabsList>
          <TabsTrigger value="decomposition" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Decomposition
          </TabsTrigger>
          <TabsTrigger value="consensus" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Consensus
          </TabsTrigger>
          <TabsTrigger value="commitment" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Commitment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decomposition">
          <ForecastDecomposition />
        </TabsContent>

        <TabsContent value="consensus">
          <ConsensusForecast />
        </TabsContent>

        <TabsContent value="commitment">
          <ForecastCommitment />
        </TabsContent>
      </Tabs>
    </div>
  );
}
