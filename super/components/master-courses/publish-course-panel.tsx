'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Globe, EyeOff, Loader2, AlertTriangle, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MasterCoursesRow, CoursePricePlansRow } from '@/types/database';
import {
  validateThenPublishCourseAction,
  unpublishCourseAction,
} from '@/app/(app)/master-courses/course-publish-actions';
import {
  publishBootcampCourseAction,
  unpublishBootcampCourseAction,
} from '@/app/(app)/bootcamps/actions';
import { getPricePlansForCourseAction } from '@/app/(app)/course-pricing/price-plan-actions';

interface Props {
  courseId: string;
  course: MasterCoursesRow;
  /**
   * Pillar (default) or Bootcamp context.
   * Bootcamp courses use the bootcamp-aware publish/unpublish actions,
   * which never trigger CollegeAdmin/assignment flows.
   */
  context?: 'pillar' | 'bootcamp';
  /** Bootcamp parent (required when context='bootcamp'). */
  bootcampId?: string;
}

function usePublishCourseMutation(
  courseId: string,
  publishStatus: MasterCoursesRow['publish_status'],
  context: 'pillar' | 'bootcamp',
  bootcampId?: string,
) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isPublished = publishStatus === 'published';
  const isBootcamp = context === 'bootcamp';

  const refresh = useCallback(() => router.refresh(), [router]);

  const publish = async () => {
    setBusy(true);
    try {
      if (isBootcamp) {
        if (!bootcampId) {
          toast.error('Bootcamp ID is required.');
          return;
        }
        const fd = new FormData();
        fd.append('bootcamp_id', bootcampId);
        fd.append('course_id', courseId);
        const out = await publishBootcampCourseAction(fd);
        if (out.ok) {
          toast.success(out.message ?? 'Course published');
          refresh();
        } else {
          const errText = out.error ?? 'Publish failed';
          if (errText.startsWith('Cannot publish: ')) {
            const reasons = errText.replace('Cannot publish: ', '').split('; ');
            toast.error(
              <div className="flex flex-col gap-1.5 py-0.5">
                <span className="font-semibold text-sm text-destructive">Publishing Blocked:</span>
                <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground font-medium">
                  {reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>,
              { duration: 6000 }
            );
          } else {
            toast.error(errText);
          }
        }
        return;
      }
      const out = await validateThenPublishCourseAction(courseId);
      if ('ok' in out && !out.ok) {
        toast.error((out as { error: string }).error);
        return;
      }
      if (!('course' in out) || !out.course) {
        const issues = 'validation' in out ? out.validation.issues : [];
        const errors = issues.filter((i) => i.severity === 'error');
        if (errors.length > 0) {
          toast.error(
            <div className="flex flex-col gap-1.5 py-0.5">
              <span className="font-semibold text-sm text-destructive">Publishing Blocked:</span>
              <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground font-medium">
                {errors.map((err, index) => (
                  <li key={index}>{err.message}</li>
                ))}
              </ul>
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.error('Publishing blocked.');
        }
        return;
      }
      toast.success('Course published');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      if (isBootcamp) {
        if (!bootcampId) {
          toast.error('Bootcamp ID is required.');
          return;
        }
        const fd = new FormData();
        fd.append('bootcamp_id', bootcampId);
        fd.append('course_id', courseId);
        const out = await unpublishBootcampCourseAction(fd);
        if (out.ok) {
          toast.success(out.message ?? 'Course unpublished');
          refresh();
        } else {
          toast.error(out.error ?? 'Unpublish failed');
        }
        return;
      }
      await unpublishCourseAction(courseId);
      toast.success('Course unpublished');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unpublish failed');
    } finally {
      setBusy(false);
    }
  };

  return { busy, isPublished, publish, unpublish };
}

/**
 * Inline header actions — anchor id for "Go to Publish" links from Assignments.
 */
export function PublishCourseHeaderActions({ courseId, course, context = 'pillar', bootcampId }: Props) {
  const router = useRouter();
  const publishMutation = usePublishCourseMutation(
    courseId,
    course.publish_status,
    context,
    bootcampId,
  );
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [plans, setPlans] = useState<CoursePricePlansRow[]>([]);
  const isBootcamp = context === 'bootcamp';

  useEffect(() => {
    async function fetchPricing() {
      try {
        const result = await getPricePlansForCourseAction(courseId);
        if (result.ok && Array.isArray(result.data)) {
          setPlans(result.data);
        }
      } catch (e) {
        console.error('Failed to fetch pricing', e);
      }
    }
    fetchPricing();
  }, [courseId]);

  const activePlans = plans.filter((p) => p.is_active);

  const formatPlanPrice = (plan: CoursePricePlansRow) => {
    const price = plan.price_minor / 100;
    const currencySymbol = plan.currency === 'INR' ? '₹' : plan.currency;
    return `${currencySymbol}${price.toLocaleString('en-IN')}`;
  };

  const handleSetPricing = () => {
    if (context === 'pillar') {
      const el = document.getElementById('course-pricing');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    router.push(`/course-pricing?courseId=${courseId}`);
  };

  return (
    <div id="course-publish" className="flex flex-wrap items-center gap-2">
      {/* Dynamic pricing display / selector */}
      {activePlans.length === 0 ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:bg-amber-950/70 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900"
          onClick={handleSetPricing}
        >
          <IndianRupee className="mr-1.5 size-3.5 shrink-0" />
          Set Pricing
        </Button>
      ) : activePlans.length === 1 ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-900"
          onClick={handleSetPricing}
        >
          <IndianRupee className="mr-1.5 size-3.5 shrink-0" />
          {formatPlanPrice(activePlans[0])}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-900 flex items-center gap-1"
            >
              <IndianRupee className="size-3.5 shrink-0" />
              <span>
                {formatPlanPrice(activePlans.find((p) => p.is_default) || activePlans[0])}
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-800/80 dark:text-emerald-100 px-1.5 py-0.5 rounded-full font-medium ml-1">
                +{activePlans.length - 1} plans
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground px-2 py-1.5">
              Active Price Plans ({activePlans.length})
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activePlans.map((plan) => (
              <DropdownMenuItem
                key={plan.id}
                onClick={handleSetPricing}
                className="flex justify-between items-center cursor-pointer py-2 px-2"
              >
                <span className="font-medium text-sm truncate max-w-[150px]">
                  {plan.plan_name}
                </span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatPlanPrice(plan)}
                  {plan.is_default && (
                    <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-1 py-0.5 rounded-md font-normal">
                      Default
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSetPricing}
              className="text-center justify-center font-medium text-primary hover:text-primary/95 cursor-pointer py-1.5 text-xs"
            >
              Manage Pricing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Publish/Unpublish status control */}
      {!publishMutation.isPublished ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-900"
          disabled={publishMutation.busy}
          onClick={() => void publishMutation.publish()}
          title={
            isBootcamp
              ? 'Makes the course visible to bootcamp students in the LMS. Does NOT touch CollegeAdmin or assignments.'
              : 'Makes the course assignable to colleges and syncs module videos into lessons when needed.'
          }
        >
          {publishMutation.busy ? <Loader2 className="mr-2 size-4 shrink-0 animate-spin" /> : <Globe className="mr-2 size-4 shrink-0" />}
          Publish course
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-red-200 bg-red-50 text-red-950 hover:bg-red-100 hover:text-red-950 dark:bg-red-950/70 dark:border-red-600 dark:text-red-200 dark:hover:bg-red-900"
          disabled={publishMutation.busy}
          onClick={() => setShowUnpublishConfirm(true)}
        >
          {publishMutation.busy ? <Loader2 className="mr-2 size-4 shrink-0 animate-spin" /> : <EyeOff className="mr-2 size-4 shrink-0" />}
          Unpublish
        </Button>
      )}

      <Dialog open={showUnpublishConfirm} onOpenChange={(open) => !open && setShowUnpublishConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Unpublish Course?
            </DialogTitle>
            <DialogDescription>
              {isBootcamp
                ? 'Unpublish this bootcamp course? It will be hidden from bootcamp students until published again.'
                : 'Unpublish this course? It will no longer be eligible for college assignment until published again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnpublishConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={publishMutation.busy}
              onClick={() => {
                void publishMutation.unpublish();
                setShowUnpublishConfirm(false);
              }}
            >
              {publishMutation.busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Legacy / standalone page: full card layout */
export function PublishCoursePanel({ courseId, course, context = 'pillar', bootcampId }: Props) {
  const router = useRouter();
  const publishMutation = usePublishCourseMutation(
    courseId,
    course.publish_status,
    context,
    bootcampId,
  );
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [plans, setPlans] = useState<CoursePricePlansRow[]>([]);
  const isBootcamp = context === 'bootcamp';

  useEffect(() => {
    async function fetchPricing() {
      try {
        const result = await getPricePlansForCourseAction(courseId);
        if (result.ok && Array.isArray(result.data)) {
          setPlans(result.data);
        }
      } catch (e) {
        console.error('Failed to fetch pricing', e);
      }
    }
    fetchPricing();
  }, [courseId]);

  const activePlans = plans.filter((p) => p.is_active);

  const formatPlanPrice = (plan: CoursePricePlansRow) => {
    const price = plan.price_minor / 100;
    const currencySymbol = plan.currency === 'INR' ? '₹' : plan.currency;
    return `${currencySymbol}${price.toLocaleString('en-IN')}`;
  };

  const handleSetPricing = () => {
    if (context === 'pillar') {
      const el = document.getElementById('course-pricing');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    router.push(`/course-pricing?courseId=${courseId}`);
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Publish</CardTitle>
            <CardDescription>
              {isBootcamp
                ? 'Make this course visible to bootcamp students in the LMS. Does NOT touch CollegeAdmin or create college assignments.'
                : 'Make this course assignable to colleges. Module videos are synced to lessons on publish when needed.'}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="capitalize">
            {course.publish_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic pricing display / selector */}
          {activePlans.length === 0 ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto h-9"
              onClick={handleSetPricing}
            >
              <IndianRupee className="mr-1.5 size-3.5 shrink-0" />
              Configure Pricing
            </Button>
          ) : activePlans.length === 1 ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto h-9 border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-900"
              onClick={handleSetPricing}
            >
              <IndianRupee className="mr-1.5 size-3.5 shrink-0" />
              {formatPlanPrice(activePlans[0])}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-9 border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-900 flex items-center justify-center gap-1"
                >
                  <IndianRupee className="size-3.5 shrink-0" />
                  <span>
                    {formatPlanPrice(activePlans.find((p) => p.is_default) || activePlans[0])}
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-800/80 dark:text-emerald-100 px-1.5 py-0.5 rounded-full font-medium ml-1">
                    +{activePlans.length - 1} plans
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground px-2 py-1.5">
                  Active Price Plans ({activePlans.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activePlans.map((plan) => (
                  <DropdownMenuItem
                    key={plan.id}
                    onClick={handleSetPricing}
                    className="flex justify-between items-center cursor-pointer py-2 px-2"
                  >
                    <span className="font-medium text-sm truncate max-w-[150px]">
                      {plan.plan_name}
                    </span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatPlanPrice(plan)}
                      {plan.is_default && (
                        <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-1 py-0.5 rounded-md font-normal">
                          Default
                        </span>
                      )}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSetPricing}
                  className="text-center justify-center font-medium text-primary hover:text-primary/95 cursor-pointer py-1.5 text-xs"
                >
                  Manage Pricing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Publish/Unpublish status control */}
          {!publishMutation.isPublished ? (
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto h-9"
              disabled={publishMutation.busy}
              onClick={() => void publishMutation.publish()}
            >
              {publishMutation.busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Globe className="mr-2 size-4" />}
              Publish course
            </Button>
          ) : (
            <Button className="w-full sm:w-auto border-red-200 bg-red-50 text-red-950 hover:bg-red-100 hover:text-red-950 dark:bg-red-950/70 dark:border-red-600 dark:text-red-200 dark:hover:bg-red-900 h-9" variant="outline" disabled={publishMutation.busy} onClick={() => setShowUnpublishConfirm(true)}>
              {publishMutation.busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <EyeOff className="mr-2 size-4" />}
              Unpublish course
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={showUnpublishConfirm} onOpenChange={(open) => !open && setShowUnpublishConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Unpublish Course?
            </DialogTitle>
            <DialogDescription>
              {isBootcamp
                ? 'Unpublish this bootcamp course? It will be hidden from bootcamp students until published again.'
                : 'Unpublish this course? It will no longer be eligible for college assignment until published again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnpublishConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={publishMutation.busy}
              onClick={() => {
                void publishMutation.unpublish();
                setShowUnpublishConfirm(false);
              }}
            >
              {publishMutation.busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
