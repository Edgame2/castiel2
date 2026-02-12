/**
 * ConfidenceScore - Displays confidence score with progress bar
 */

interface ConfidenceScoreProps {
  score: number; // 0-1
  showLabel?: boolean;
  colorScheme?: 'default' | 'success-danger';
  className?: string;
}

export function ConfidenceScore({
  score,
  showLabel = true,
  colorScheme = 'default',
  className = '',
}: ConfidenceScoreProps) {
  const percentage = Math.round(score * 100);
  
  const getColor = () => {
    if (colorScheme === 'success-danger') {
      if (score >= 0.8) return 'bg-green-600';
      if (score >= 0.6) return 'bg-yellow-600';
      return 'bg-red-600';
    }
    return 'bg-blue-600';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && <span className="text-xs text-gray-500">Confidence:</span>}
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[100px]">
        <div
          className={`h-2 rounded-full ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
        {percentage}%
      </span>
    </div>
  );
}
