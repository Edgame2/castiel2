/**
 * Forecast overview — scenarios and links to period, team, tenant, accuracy, record-actual.
 * UI inventory §3.7. Data from risk_analytics via /api/v1 (e.g. GET /api/v1/forecasts/:period/scenarios).
 */

import Link from 'next/link';

const FORECAST_LINKS = [
  { href: '/analytics/forecast/2025-Q1', title: 'Period scenario', description: 'Risk-adjusted and ML scenario for a period (example: 2025-Q1)' },
  { href: '/analytics/forecast/team', title: 'Team forecast', description: 'Team-level forecast aggregate' },
  { href: '/analytics/forecast/tenant', title: 'Tenant forecast', description: 'Tenant-level forecast aggregate' },
  { href: '/analytics/forecast/accuracy', title: 'Forecast accuracy', description: 'MAPE, bias, R²' },
  { href: '/analytics/forecast/record-actual', title: 'Record actual', description: 'Record actuals for predictions' },
];

export default function ForecastPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Forecast</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Scenario forecasts, team and tenant aggregates, and accuracy metrics. Use the links below to drill down.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FORECAST_LINKS.map(({ href, title, description }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 transition-colors block"
          >
            <h2 className="text-lg font-semibold mb-1">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            <span className="inline-block mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">Open →</span>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/analytics/competitive" className="underline hover:no-underline">
          Competitive analytics
        </Link>
        {' · '}
        <Link href="/analytics/benchmarks" className="underline hover:no-underline">
          Benchmarks
        </Link>
        {' · '}
        <Link href="/analytics/portfolios" className="underline hover:no-underline">
          Portfolios
        </Link>
      </p>
    </div>
  );
}
