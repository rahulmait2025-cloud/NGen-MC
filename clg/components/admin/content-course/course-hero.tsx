import { GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function CourseHero({
  displayTitle,
  displayCode,
  isVariant,
  variantInfo,
  pillar,
}: {
  displayTitle: string;
  displayCode: string;
  isVariant: boolean;
  variantInfo?: { sourceMasterCourseTitle: string } | null;
  pillar: { title: string };
}) {
  return (
    <div className="card-tier-1 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
        <div className="size-12 rounded-2xl bg-gradient-orange-soft flex items-center justify-center shrink-0">
          <GraduationCap className="size-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {displayTitle}
            </h1>
            <Badge
              variant="outline"
              className={
                isVariant
                  ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25 dark:text-indigo-400 text-[10px] uppercase font-bold'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 text-[10px] uppercase font-bold'
              }
            >
              {isVariant ? 'Variant' : 'Master course'}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-medium border-border/50 bg-muted/30">
              Read-only preview
            </Badge>
          </div>
          {isVariant && variantInfo && (
            <p className="text-sm text-muted-foreground">
              Based on{' '}
              <span className="font-medium text-foreground/90">
                {variantInfo.sourceMasterCourseTitle}
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] bg-muted/50 border border-border/40 rounded px-2 py-0.5">
              {displayCode}
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="font-medium text-primary/90 uppercase tracking-wide text-[10px]">
              {pillar.title}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
