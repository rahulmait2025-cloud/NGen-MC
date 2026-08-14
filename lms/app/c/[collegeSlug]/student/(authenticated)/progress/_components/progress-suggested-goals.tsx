import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SuggestedGoal } from '../load-progress-data';

interface ProgressSuggestedGoalsProps {
  goals: SuggestedGoal[];
  programmePct: number;
}

export function ProgressSuggestedGoals({ goals, programmePct }: ProgressSuggestedGoalsProps) {
  const completedCount = goals.filter((g) => g.current >= g.target).length;

  return (
    <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/40 px-5 sm:px-6 py-4 flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold tracking-tight">Suggested goals</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5 font-normal">
            Based on your recent learning activity — not stored as XP rewards
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Programme
          </p>
          <p className="text-base font-semibold tabular-nums">{programmePct}%</p>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Programme progress</span>
            <span className="font-semibold tabular-nums">{programmePct}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.max(programmePct, 3)}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {completedCount} of {goals.length} suggested goals met this week
        </p>

        <ul className="space-y-2.5">
          {goals.map((goal) => {
            const isDone = goal.current >= goal.target;
            const pct = Math.round((goal.current / goal.target) * 100);
            const Icon = isDone ? CheckCircle2 : Circle;
            return (
              <li key={goal.label} className="flex items-center gap-3">
                <Icon
                  className={
                    isDone
                      ? 'size-4 text-primary shrink-0'
                      : 'size-4 text-muted-foreground/40 shrink-0'
                  }
                  strokeWidth={isDone ? 2.25 : 1.75}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        isDone
                          ? 'text-xs font-medium text-muted-foreground line-through'
                          : 'text-xs font-semibold text-foreground'
                      }
                    >
                      {goal.label}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground shrink-0">
                      {goal.current}/{goal.target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={
                        isDone
                          ? 'h-full bg-primary rounded-full'
                          : 'h-full bg-primary/60 rounded-full'
                      }
                      style={{ width: `${Math.max(Math.min(pct, 100), 4)}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
