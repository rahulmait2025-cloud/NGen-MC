import { Flame, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfileStatsProps = {
  currentStreak: number;
  bestStreak: number;
  completionPercent: number;
  completedItems: number;
  totalItems: number;
};

function StatItem({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          accent ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold tabular-nums text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function ProfileStats({
  currentStreak,
  bestStreak,
  completionPercent,
  completedItems,
  totalItems,
}: ProfileStatsProps) {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <StatItem
        icon={Flame}
        label="Streak"
        value={`${currentStreak}d`}
        accent={currentStreak > 0}
      />
      <div className="w-px h-8 bg-border/60" />
      <StatItem
        icon={Trophy}
        label="Best"
        value={`${bestStreak}d`}
      />
      <div className="w-px h-8 bg-border/60" />
      <StatItem
        icon={Target}
        label="Profile"
        value={`${completionPercent}%`}
      />
      <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
        {completedItems}/{totalItems} fields
      </p>
    </div>
  );
}
