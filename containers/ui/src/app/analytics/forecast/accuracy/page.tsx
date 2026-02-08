/**
 * Forecast accuracy (MAPE, bias, R²). UI inventory §3.7.
 * Placeholder until risk_analytics exposes accuracy API (e.g. GET /api/v1/forecasts/accuracy).
 */

import Link from 'next/link';

export default function ForecastAccuracyPage() {
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/analytics/forecast" className="text-sm font-medium hover:underline">
          Forecast
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Accuracy</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Forecast accuracy</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        MAPE, bias, and R² metrics. Data will be loaded from the forecasting API when available.
      </p>
      <Link href="/analytics/forecast" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to Forecast
      </Link>
    </div>
  );
}
