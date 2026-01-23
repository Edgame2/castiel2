'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

/**
 * Badge component for displaying document category
 */
export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  // Map categories to colors
  const getColorClass = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'financial':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'hr':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'legal':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'technical':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'general':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-orange-50 text-orange-700 border-orange-200';
    }
  };

  return (
    <Badge variant="outline" className={cn('text-xs', getColorClass(category), className)}>
      {category}
    </Badge>
  );
}
