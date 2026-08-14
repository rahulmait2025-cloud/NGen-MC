import * as React from 'react';
import { Layers, Play } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { studentLandingCardClass } from '@/lib/utils/landing-card-class';

function StudentLandingCard({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card className={cn(studentLandingCardClass, className)} {...props}>
      {children}
    </Card>
  );
}

export type StudentPaidCourseCardProps = {
  title: string;
  description?: string | null;
  pillarLabel?: string;
  moduleCount?: number;
  videoCount?: number;
  badge?: React.ReactNode;
  topRightBadge?: React.ReactNode;
  media?: React.ReactNode;
  primaryAction: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  className?: string;
};

export function StudentPaidCourseCard({
  title,
  description,
  pillarLabel,
  moduleCount,
  videoCount,
  badge,
  topRightBadge,
  media,
  primaryAction,
  secondaryAction,
  className,
}: StudentPaidCourseCardProps) {
  return (
    <StudentLandingCard className={cn('group flex h-full flex-col overflow-hidden', className)}>
      <div className="relative h-40 overflow-hidden border-b border-border bg-muted/20">
        {media ?? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20" />
            <div className="absolute bottom-4 left-4 rounded-xl border border-border bg-muted/80 p-2.5">
              <Layers className="size-5 text-primary" />
            </div>
          </>
        )}
        {topRightBadge ? <div className="absolute top-4 right-4">{topRightBadge}</div> : null}
      </div>

      <CardHeader className="gap-3 px-6 pt-5 pb-0">
        {badge ? <div className="flex flex-wrap gap-1.5">{badge}</div> : null}
        <CardTitle className="text-lg font-bold leading-snug landing-heading group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        {pillarLabel ? (
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500/80 dark:text-orange-400/80">
            {pillarLabel}
          </p>
        ) : null}
        <CardDescription className="line-clamp-3 text-sm leading-relaxed">
          {description || 'Structured learning path inside your college workspace.'}
        </CardDescription>
      </CardHeader>

      {(moduleCount != null || videoCount != null) && (
        <CardContent className="px-6 pt-4 pb-0">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {moduleCount != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1">
                <Layers className="size-3.5 text-orange-500 dark:text-orange-400/70" />
                {moduleCount} modules
              </span>
            ) : null}
            {videoCount != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1">
                <Play className="size-3.5 text-orange-500 dark:text-orange-400/70" />
                {videoCount} videos
              </span>
            ) : null}
          </div>
        </CardContent>
      )}

      <CardFooter className="mt-auto flex gap-3 px-6 pb-6 pt-5">
        {secondaryAction ? (
          <StudentCtaButton
            href={secondaryAction.href}
            variant="secondary"
            showArrow={false}
            className="flex-1"
          >
            {secondaryAction.label}
          </StudentCtaButton>
        ) : null}
        <StudentCtaButton href={primaryAction.href} className={cn('flex-1', !secondaryAction && 'w-full')}>
          {primaryAction.label}
        </StudentCtaButton>
      </CardFooter>
    </StudentLandingCard>
  );
}
