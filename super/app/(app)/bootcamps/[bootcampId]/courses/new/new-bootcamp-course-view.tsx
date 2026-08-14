'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { CreateCourseDialog } from '@/components/master-courses/create-course-dialog';

interface NewBootcampCourseViewProps {
  bootcampId: string;
  bootcampTitle: string;
}

/**
 * Wraps the full Master Course creation dialog (reused from Pillar flow) for
 * the Bootcamp context. This guarantees Bootcamp course creation supports the
 * same fields and UX as Pillar course creation.
 *
 * The dialog opens immediately when the page loads, then the SuperAdmin can
 * either fill it out or click Cancel/Back to return to the bootcamp detail page.
 * After a successful create, the SuperAdmin is navigated to the new course's
 * manage page.
 */
export function NewBootcampCourseView({ bootcampId, bootcampTitle }: NewBootcampCourseViewProps) {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href={`/bootcamps/${bootcampId}`}>
            <ArrowLeft className="size-4 mr-1" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Paid Course</h1>
          <p className="text-muted-foreground text-sm">
            Create a new paid course in <span className="font-medium">{bootcampTitle}</span>.
          </p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed border-border/60 bg-card/30 p-10 text-center space-y-4">
        <h2 className="text-lg font-semibold">Opening paid course editor…</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The same full course creation experience used for Pillar courses is available for Paid Course Builder.
          Configure the title, code, slug, short description, curriculum points, FAQs, and publish status.
          Visibility toggles for college admins and students stay off for builder courses.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <CreateCourseDialog
            context="bootcamp"
            bootcampId={bootcampId}
            mode="button"
            defaultOpen
            hideTrigger
            onSuccess={({ id }) => {
              if (id) {
                router.push(`/bootcamps/${bootcampId}/courses/${id}`);
              } else {
                router.push(`/bootcamps/${bootcampId}`);
              }
              router.refresh();
            }}
          />
          <Button variant="ghost" asChild>
            <Link href={`/bootcamps/${bootcampId}`}>Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
