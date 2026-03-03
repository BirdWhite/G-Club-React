'use client';

import { CATEGORY_CONFIG } from '@/lib/calendar/constants';
import type { CalendarEventCategory } from '@/types/models';

interface CategoryBadgeProps {
  category: CalendarEventCategory;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bgColor} ${config.textColor} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span
        className={`inline-block rounded-full ${size === 'sm' ? 'w-1.5 h-1.5 mr-1' : 'w-2 h-2 mr-1.5'}`}
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
