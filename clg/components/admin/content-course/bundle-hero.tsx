import { Clock, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function BundleHero({
  bundle,
  assignment,
  dateEnd,
  backHref: _backHref,
}: {
  bundle: { title: string; code: string; publish_status: string; lifecycle_status?: string | null };
  assignment?: { status: string; end_date?: string | null } | null;
  dateEnd: string | null;
  backHref: string;
}) {
  return (
    <div className="card-tier-1 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="size-12 rounded-2xl bg-gradient-orange-soft flex items-center justify-center shrink-0">
          <GraduationCap className="size-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{bundle.title}</h1>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 text-[10px] uppercase font-bold"
            >
              Bundle
            </Badge>
            <Badge variant="outline" className="text-[10px] font-medium border-border/50 bg-muted/30">
              Read-only preview
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] bg-muted/50 border border-border/40 rounded px-2 py-0.5">
              {bundle.code}
            </span>
            <span className="capitalize">{bundle.publish_status}</span>
            {bundle.lifecycle_status && (
              <>
                <span className="hidden sm:inline text-border">|</span>
                <span>{bundle.lifecycle_status}</span>
              </>
            )}
          </div>
          {assignment && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
              >
                Assignment: {assignment.status}
              </Badge>
              {dateEnd && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5" />
                  Valid until {dateEnd}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
