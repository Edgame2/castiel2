"use client";

import type React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  opportunities,
  getOpportunity,
  getRiskData,
  getRecommendations,
} from "@/data/mock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { OverviewTab } from "./OverviewTab";
import { RiskTab } from "./RiskTab";
import { RecommendationsTab } from "./RecommendationsTab";
import { ArrowLeft } from "lucide-react";

export default function OpportunityDetailPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const opp = getOpportunity(id);
  const riskData = getRiskData(id) ?? getRiskData(opportunities[0]?.id);
  const recommendations = getRecommendations(id);

  if (!opp) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Opportunity not found.</p>
        <Button variant="outline" asChild>
          <Link href="/">Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/" aria-label="Back to list">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{opp.name}</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab opportunity={opp} />
        </TabsContent>
        <TabsContent value="risk" className="mt-4">
          {riskData && (
            <RiskTab opportunityId={opp.id} riskData={riskData} />
          )}
        </TabsContent>
        <TabsContent value="recommendations" className="mt-4">
          <RecommendationsTab opportunityId={opp.id} recommendations={recommendations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
