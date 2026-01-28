/**
 * IntegrationLogo - Displays integration logo/icon
 */

interface IntegrationLogoProps {
  integrationType: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IntegrationLogo({ integrationType, size = 'md', className = '' }: IntegrationLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  // Map integration types to emoji/icons (in a real app, these would be actual logos)
  const getLogo = () => {
    const type = integrationType.toLowerCase();
    if (type.includes('salesforce')) return '⚡';
    if (type.includes('hubspot')) return '🟠';
    if (type.includes('microsoft') || type.includes('office')) return '🔷';
    if (type.includes('google')) return '🔴';
    if (type.includes('slack')) return '💬';
    if (type.includes('zoom') || type.includes('meeting')) return '📹';
    return '🔌';
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg ${className}`}
      title={integrationType}
    >
      {getLogo()}
    </div>
  );
}
