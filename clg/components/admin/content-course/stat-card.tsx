import type { Layers } from 'lucide-react';

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Layers;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card-tier-1 rounded-xl p-4 flex items-center gap-3 min-w-0">
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}
