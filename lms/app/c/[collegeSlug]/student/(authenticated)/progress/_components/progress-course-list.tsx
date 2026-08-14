import Link from 'next/link';
import { BookOpen, ChevronRight, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { ProgressCourseRow } from '../load-progress-data';

interface ProgressCourseListProps {
  courses: ProgressCourseRow[];
  collegeSlug: string;
}

export function ProgressCourseList({ courses, collegeSlug }: ProgressCourseListProps) {
  return (
    <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/40 px-5 sm:px-6 py-4">
        <CardTitle className="text-base font-semibold tracking-tight">Course progress</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5 font-normal">
          Enrolled courses from your college workspace
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {courses.length === 0 ? (
          <div className="px-5 sm:px-6 py-10 text-center text-sm text-muted-foreground">
            No enrolled courses yet. Browse{' '}
            <Link
              href={`/c/${collegeSlug}/student/courses`}
              className="font-semibold text-primary hover:underline"
            >
              free courses
            </Link>{' '}
            or check with your college for assignments.
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {courses.map((course) => (
              <li
                key={course.id}
                className="px-5 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {course.pillarTitle}
                    </p>
                    <h3 className="font-semibold text-foreground truncate">{course.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3.5" />
                      {course.moduleCount} modules
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Video className="size-3.5" />
                      {course.videoCount} lessons
                    </span>
                  </div>
                  <div className="flex items-center gap-3 max-w-md">
                    <Progress value={course.progressPercentage} className="h-1.5 flex-1" />
                    <span className="text-xs font-semibold tabular-nums shrink-0">
                      {Math.round(course.progressPercentage)}%
                    </span>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full shrink-0">
                  <Link href={course.learnHref}>
                    {course.progressPercentage > 0 ? 'Continue' : 'Start'}
                    <ChevronRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
