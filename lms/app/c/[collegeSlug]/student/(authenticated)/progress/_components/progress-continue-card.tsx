import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ContinueLearningCard } from '../../home/_components/landing-data-types';

interface ProgressContinueCardProps {
  card: ContinueLearningCard;
}

export function ProgressContinueCard({ card }: ProgressContinueCardProps) {
  const progress = card.progressPercentage;

  return (
    <Card className="border border-primary/25 bg-card rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Continue learning
          </p>
          <h2 className="text-lg font-semibold tracking-tight">{card.courseTitle}</h2>
          <p className="text-sm text-muted-foreground line-clamp-2">{card.lessonTitle}</p>
          {typeof progress === 'number' && progress > 0 ? (
            <div className="pt-2 max-w-md space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Course progress</span>
                <span className="font-semibold tabular-nums text-foreground">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(Math.max(progress, 4), 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <Button asChild className="rounded-full shrink-0">
          <Link href={card.resumeHref}>
            <PlayCircle className="size-4 mr-2" />
            Resume Learning
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
