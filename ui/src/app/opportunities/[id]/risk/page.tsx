/**
 * Opportunity risk page — real APIs: latest-evaluation, risk-predictions, risk-velocity.
 * No mock data. ExplainabilityCard and SimilarWonDealsCard fetch their own data via opportunityId.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExplainabilityCard } from '@/components/risk/ExplainabilityCard';
import { RiskGauge } from '@/components/risk/RiskGauge';
import { RiskTrajectoryChart } from '@/components/risk/RiskTrajectoryChart';
import { RiskVelocityChart } from '@/components/risk/RiskVelocityChart';
import { SimilarWonDealsCard } from '@/components/risk/SimilarWonDealsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';
import type { RiskTrajectoryHorizons } from '@/components/risk/RiskTrajectoryChart';

interface LatestEvaluation {
  riskScore?: number;
}

interface RiskPredictionsResponse {
  horizons?: RiskTrajectoryHorizons;
  predictionDate?: string | null;
}

interface RiskVelocityResponse {
  velocity?: number;
  acceleration?: number;
  dataPoints?: number;
}

export default function OpportunityRiskPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [currentRisk, setCurrentRisk] = useState<number | null>(null);
  const [horizons, setHorizons] = useState<RiskTrajectoryHorizons>({});
  const [predictionDate, setPredictionDate] = useState<string | null>(null);
  const [velocity, setVelocity] = useState<number>(0);
  const [acceleration, setAcceleration] = useState<number>(0);
  const [dataPoints, setDataPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    setCurrentRisk(null);
    setHorizons({});
    setPredictionDate(null);
    setVelocity(0);
    setAcceleration(0);
    setDataPoints(0);

    try {
      const [evalRes, predictionsRes, velocityRes] = await Promise.all([
        apiFetch(`/api/v1/risk/opportunities/${id}/latest-evaluation`),
        apiFetch(`/api/v1/opportunities/${id}/risk-predictions`),
        apiFetch(`/api/v1/opportunities/${id}/risk-velocity`),
      ]);

      if (evalRes.ok) {
        const data: LatestEvaluation = await evalRes.json();
        const score = typeof data.riskScore === 'number' ? Math.min(1, Math.max(0, data.riskScore)) : 0;
        setCurrentRisk(score);
      }

      if (predictionsRes.ok) {
        const data: RiskPredictionsResponse = await predictionsRes.json();
        if (data.horizons && typeof data.horizons === 'object') {
          setHorizons(data.horizons);
        }
        if (data.predictionDate != null) setPredictionDate(data.predictionDate);
      }

      if (velocityRes.ok) {
        const data: RiskVelocityResponse = await velocityRes.json();
        setVelocity(typeof data.velocity === 'number' ? data.velocity : 0);
        setAcceleration(typeof data.acceleration === 'number' ? data.acceleration : 0);
        setDataPoints(typeof data.dataPoints === 'number' ? data.dataPoints : 0);
      }

      if (!evalRes.ok && !predictionsRes.ok && !velocityRes.ok) {
        setError(GENERIC_ERROR_MESSAGE);
      }
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!id) return null;

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
            ← Opportunity {id}
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">Risk</h1>
        <p className="text-muted-foreground mb-6">Risk score, trajectory, velocity, drivers.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[140px] rounded-lg" />
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[80px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
          ← Opportunity {id}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Risk</h1>
      <p className="text-muted-foreground mb-6">
        Risk score, trajectory, velocity, drivers.
      </p>
      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <RiskGauge
            value={currentRisk ?? 0}
            label="Current risk"
          />
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <RiskTrajectoryChart
            horizons={horizons}
            predictionDate={predictionDate}
            title="Risk trajectory"
          />
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <RiskVelocityChart
            velocity={velocity}
            acceleration={acceleration}
            dataPoints={dataPoints}
            title="Risk velocity"
          />
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <SimilarWonDealsCard opportunityId={id} title="Deals like this" />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <ExplainabilityCard opportunityId={id} variant="risk" title="Risk drivers" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-2">
        <Link href={`/opportunities/${id}/remediation`} className="text-sm font-medium hover:underline">
          Remediation →
        </Link>
        <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
          ← Opportunity
        </Link>
      </div>
    </div>
  );
}
