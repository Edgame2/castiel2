/**
 * StatusBadge - Reusable status badge component
 * Displays status with appropriate color coding
 */

interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected' | 'syncing' | 'connected' | 'error' | 'completed' | 'failed' | 'running' | 'queued' | 'pending_review' | 'approved' | 'rejected' | 'expired' | 'resolved' | 'pending' | 'ignored';
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, showLabel = true, className = '' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'completed':
      case 'approved':
      case 'resolved':
        return {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-800 dark:text-green-200',
          label: 'Healthy',
        };
      case 'degraded':
      case 'syncing':
      case 'running':
      case 'queued':
      case 'pending_review':
      case 'pending':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900',
          text: 'text-yellow-800 dark:text-yellow-200',
          label: status === 'syncing' ? 'Syncing' : status === 'running' ? 'Running' : status === 'queued' ? 'Queued' : status === 'pending_review' ? 'Pending Review' : 'Pending',
        };
      case 'unhealthy':
      case 'error':
      case 'failed':
      case 'rejected':
        return {
          bg: 'bg-red-100 dark:bg-red-900',
          text: 'text-red-800 dark:text-red-200',
          label: status === 'unhealthy' ? 'Unhealthy' : status === 'error' ? 'Error' : status === 'failed' ? 'Failed' : 'Rejected',
        };
      case 'disconnected':
      case 'expired':
      case 'ignored':
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          label: status === 'disconnected' ? 'Disconnected' : status === 'expired' ? 'Expired' : 'Ignored',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          label: status,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      {showLabel ? config.label : status}
    </span>
  );
}
