'use client';

export interface MetricItem {
  label: string;
  value: string;
  accent?: boolean;
}

export function MetricCarousel({ items }: { items: MetricItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-[1.25rem] border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-5 sm:py-4"
        >
          <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {item.label}
          </p>
          <p
            className={`truncate text-lg font-bold tracking-tight sm:text-xl ${
              item.accent ? 'text-primary' : 'text-foreground'
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
