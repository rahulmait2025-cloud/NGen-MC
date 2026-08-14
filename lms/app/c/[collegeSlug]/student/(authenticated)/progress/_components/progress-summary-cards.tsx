import { Card, CardContent } from '@/components/ui/card';
import type { ProgressSummaryMetric } from '../load-progress-data';

interface ProgressSummaryCardsProps {
  metrics: ProgressSummaryMetric[];
}

export function ProgressSummaryCards({ metrics }: ProgressSummaryCardsProps) {
  if (metrics.length === 0) {
    return (
      <Card className="border border-border/60 bg-card rounded-2xl">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Progress metrics will appear once you start watching lessons in your enrolled courses.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="border border-border/60 bg-card rounded-2xl transition-[border-color] duration-200 hover:border-primary/30"
        >
          <CardContent className="p-4 sm:p-5 flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {metric.label}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-[28px] font-semibold tracking-tight tabular-nums leading-none">
                {metric.value}
              </span>
              {metric.unit ? (
                <span className="text-xs font-medium text-muted-foreground">{metric.unit}</span>
              ) : null}
            </div>
            <span className="text-[11px] text-muted-foreground/80">{metric.description}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
