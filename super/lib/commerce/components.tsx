import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <Badge variant="outline" className={cn('rounded-full px-2 py-0.5 text-xs font-semibold border', className)}>
      {label}
    </Badge>
  );
}
