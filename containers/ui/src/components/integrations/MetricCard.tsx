/**
 * MetricCard - Displays a metric with optional change indicator and icon
 */

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number; // Percentage change
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ title, value, change, icon, trend, className = '' }: MetricCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(2)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(2)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`p-4 border rounded ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-gray-500">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-lg font-semibold">{formatValue(value)}</p>
        {change !== undefined && (
          <span className={`text-xs ${getTrendColor()}`}>
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
