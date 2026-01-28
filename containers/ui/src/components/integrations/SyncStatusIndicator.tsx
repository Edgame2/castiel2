/**
 * SyncStatusIndicator - Displays sync status with optional last sync time
 */

interface SyncStatusIndicatorProps {
  status: 'completed' | 'failed' | 'running' | 'queued';
  lastSync?: Date | string | null;
  className?: string;
}

export function SyncStatusIndicator({ status, lastSync, className = '' }: SyncStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      case 'queued':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
      {lastSync && (
        <span className="text-xs text-gray-500">
          {new Date(lastSync).toLocaleString()}
        </span>
      )}
    </div>
  );
}
