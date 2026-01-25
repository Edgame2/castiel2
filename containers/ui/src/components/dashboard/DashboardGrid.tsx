/**
 * DashboardGrid – responsive grid of widgets (Plan §6.3, §890).
 * Widget types from backend; maps type to component. For now accepts children.
 */

type DashboardGridProps = {
  children: React.ReactNode;
  className?: string;
};

export function DashboardGrid({ children, className = '' }: DashboardGridProps) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      data-dashboard-grid
    >
      {children}
    </div>
  );
}
