import type { LucideIcon } from 'lucide-react';
import { KPIWidget } from '@/components/analytics/premium-card';

export interface LearningKpiItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export function LearningKpiGrid({ items }: { items: LearningKpiItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <KPIWidget
          key={item.title}
          label={item.title}
          value={String(item.value)}
          icon={item.icon}
        />
      ))}
    </div>
  );
}
