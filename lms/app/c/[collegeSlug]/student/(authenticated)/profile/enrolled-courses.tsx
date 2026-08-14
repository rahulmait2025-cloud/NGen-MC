import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

type Course = {
  id: string;
  title: string;
  pillarTitle: string;
  progressPercentage: number;
  learnHref: string;
};

type EnrolledCoursesProps = {
  courses: Course[];
  collegeSlug: string;
};

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative h-9 w-9 shrink-0">
      <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/40"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition duration-300 ease-[var(--ease-out)]"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-foreground">
        {percentage}
      </span>
    </div>
  );
}

export function EnrolledCourses({ courses, collegeSlug }: EnrolledCoursesProps) {
  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title="No courses yet"
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/c/${collegeSlug}/student/courses`}>
              Browse courses
            </Link>
          </Button>
        }
      />
    );
  }

    return (
      <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
        {courses.slice(0, 5).map((course) => (
          <Link
            key={course.id}
            href={course.learnHref}
            className={cn(
              'flex items-center gap-3.5 px-4 py-3.5',
              'transition-colors duration-150 hover:bg-muted/30',
            )}
          >
          <ProgressRing percentage={course.progressPercentage} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{course.pillarTitle}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </Link>
      ))}
      {courses.length > 5 && (
        <Link
          href={`/c/${collegeSlug}/student/my-courses`}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline py-3"
        >
          View all {courses.length} courses
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
