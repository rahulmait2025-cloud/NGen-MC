'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Play, ArrowRight, FileCode, CheckCircle2, Layers, Package, GraduationCap } from 'lucide-react';
import type { EntitledCourseListItem } from '@/lib/services/student-courses';
import type { StudentPurchasedBundle } from '@/lib/services/student-purchased-bundles';
import type { MyCourseRow, YoutubeMyCourseRow } from '@/lib/student/my-courses-types';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { BundleCard } from './my-bundles-panel';
import { buildEnrolledBootcampHubHref } from '@/lib/student/bootcamp-routes';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { unenrollFreeDbCourseAction } from '../free-courses/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type { MyCourseRow, YoutubeMyCourseRow };

type TabKey = 'courses' | 'sheets' | 'bootcamp' | 'bundles' | 'free';

interface MyCoursesTabsProps {
  courses: MyCourseRow[];
  bundles?: StudentPurchasedBundle[];
  sheets?: Array<{
    id: string;
    title: string;
    description_md: string;
    is_active: boolean;
    isEnrolled: boolean;
    categoriesCount: number;
    problemsCount: number;
    completedCount: number;
  }>;
  collegeSlug: string;
  showBootcampCard?: boolean;
  /** Whether the Job Ready Bootcamp feature flag is enabled platform-wide. When false, the bootcamp tab/entry point is hidden entirely, even for already-enrolled students. */
  bootcampFeatureEnabled?: boolean;
  initialTab?: string;
  expiringCoursesMap?: Map<string, number>;
}

type SheetListItem = NonNullable<MyCoursesTabsProps['sheets']>[number];

const EMPTY_BUNDLES: StudentPurchasedBundle[] = [];
const EMPTY_SHEETS: SheetListItem[] = [];
const EMPTY_EXPIRING_MAP = new Map<string, number>();

const TAB_DEFINITIONS: { key: TabKey; label: string }[] = [
  { key: 'courses', label: 'Courses' },
  { key: 'sheets', label: 'Sheets' },
  { key: 'bootcamp', label: 'Job Ready Bootcamp' },
  { key: 'bundles', label: 'Bundles' },
  { key: 'free', label: 'Free' },
];

function resolveInitialTab(
  initialTab?: string,
  showBootcampCard = false,
  bootcampFeatureEnabled = false,
): TabKey {
  if (initialTab === 'job-ready-bootcamp' || initialTab === 'bootcamp') {
    if (!bootcampFeatureEnabled) return 'courses';
    return showBootcampCard ? 'bootcamp' : 'courses';
  }
  if (initialTab === 'sheets') {
    return 'sheets';
  }
  if (
    initialTab === 'courses'
    || initialTab === 'free'
    || initialTab === 'bundles'
  ) {
    return initialTab;
  }
  return 'courses';
}

function isEntitledCourse(course: MyCourseRow): course is EntitledCourseListItem {
  return !('is_youtube' in course && course.is_youtube);
}

function isFreeCourse(course: MyCourseRow): boolean {
  if ('is_youtube' in course && course.is_youtube) return true;
  if (!isEntitledCourse(course)) return false;
  if (course.is_free) return true;
  if (course.pricing_model === 'free') return true;
  const price = course.selling_price;
  if (price != null && Number(price) === 0) return true;
  return false;
}

/**
 * Stable dedupe/render key by exact learning-product identity.
 * Variants keep their own identity and are never collapsed into the parent master course.
 */
function courseDedupeKey(course: MyCourseRow): string {
  if ('is_youtube' in course && course.is_youtube) return `youtube:${course.playlist_id}`;
  if (isEntitledCourse(course) && course.variant_id) return `course_variant:${course.variant_id}`;
  return `master_course:${course.id}`;
}

/** Normalized renderable My Courses item — single source of truth for counts + cards. */
type MyCourseItem =
  | { kind: 'bootcamp'; key: string }
  | { kind: 'course'; key: string; course: MyCourseRow }
  | { kind: 'bundle'; key: string; bundle: StudentPurchasedBundle }
  | {
      kind: 'sheet';
      key: string;
      sheet: {
        id: string;
        title: string;
        description_md: string;
        is_active: boolean;
        isEnrolled: boolean;
        categoriesCount: number;
        problemsCount: number;
        completedCount: number;
      };
    };

function dedupeCourseRows(rows: MyCourseRow[]): MyCourseRow[] {
  const seen = new Set<string>();
  const result: MyCourseRow[] = [];
  for (const row of rows) {
    const key = courseDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function CourseCard({ course, collegeSlug, daysUntilExpiry: _daysUntilExpiry, priority = false }: { course: MyCourseRow; collegeSlug: string; daysUntilExpiry?: number | null; priority?: boolean }) {
  const router = useRouter();
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  const isYoutube = 'is_youtube' in course && course.is_youtube;
  const isVariant = isEntitledCourse(course) && !!course.variant_id;
  const displayTitle = isYoutube
    ? course.title
    : isEntitledCourse(course)
      ? (course.variant_title ?? course.title)
      : course.title;
  const learnUrl =
    'learnHref' in course && course.learnHref
      ? course.learnHref
      : 'is_youtube' in course && course.is_youtube
        ? `/c/${collegeSlug}/student/courses/youtube/${course.playlist_id}`
        : (() => {
            const entitled = course as EntitledCourseListItem;
            return buildLearnHref(
              collegeSlug,
              entitled.slug || entitled.id,
              isVariant ? { variantId: entitled.variant_id } : undefined,
            );
          })();
  const thumbnailUrl =
    isYoutube && 'thumbnail_url' in course
      ? course.thumbnail_url
      : isEntitledCourse(course)
        ? course.thumbnail_url ?? null
        : null;

  const isFree = isFreeCourse(course);
  const isComplete = (course.progress_percentage ?? 0) >= 100;
  const isStarted = (course.progress_percentage ?? 0) > 0;
  const moduleCount = course.module_count ?? 0;
  const videoCount = course.video_count ?? 0;
  const totalVideoItems = course.progress_total_video_items ?? 0;
  const completedVideoItems = course.progress_completed_video_items ?? 0;
  const lessonsLeft = totalVideoItems > 0
    ? Math.max(0, totalVideoItems - completedVideoItems)
    : Math.max(0, videoCount - Math.round(((course.progress_percentage ?? 0) / 100) * videoCount));
  const allVideoLessonsDone = lessonsLeft === 0 && (totalVideoItems > 0 || videoCount > 0);
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);

  const handleUnenroll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUnenrollDialog(true);
  };

  const confirmUnenroll = async () => {
    setShowUnenrollDialog(false);
    setIsUnenrolling(true);
    try {
      const res = await unenrollFreeDbCourseAction(collegeSlug, course.id);
      if (res.ok) {
        toast.success('Unenrolled successfully.');
        router.refresh();
      } else {
        toast.error(res.error || 'Could not unenroll');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsUnenrolling(false);
    }
  };

  if (isFree) {
    return (
      <>
      <div className="group flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/20 hover:shadow-md transition-[border-color,box-shadow] duration-200 active:scale-[0.98] sm:active:scale-100">
        <Link
          href={learnUrl}
          className="aspect-video relative overflow-hidden block"
          aria-label={isComplete ? `Completed: ${displayTitle}` : `Continue: ${displayTitle}`}
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={displayTitle}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              referrerPolicy="no-referrer"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-primary/35" />
            </div>
          )}
          {isComplete && (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/90 text-success-foreground px-2.5 py-1 text-xs font-semibold shadow-sm">
                <CheckCircle2 className="size-3.5" />
                Completed
              </span>
            </div>
          )}
        </Link>

        <div className="p-5 flex flex-col justify-between flex-1">
          <div className="space-y-2">
            <Link
              href={learnUrl}
              className="block group-hover:text-primary transition-colors"
              aria-label={isComplete ? `Completed: ${displayTitle}` : `Continue: ${displayTitle}`}
            >
              <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                {displayTitle}
              </h3>
            </Link>
            <div className="flex items-center text-xs text-foreground/65">
              {!isYoutube && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary/60" />
                  <span className="font-bold text-foreground/80">{moduleCount}</span>
                  <span>modules</span>
                </span>
              )}
              {!isYoutube && <span className="mx-2 text-border">·</span>}
              <span className="flex items-center gap-1.5">
                {isComplete ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-success" />
                    <span className="font-bold text-success">All done</span>
                  </>
                ) : allVideoLessonsDone ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-success" />
                    <span className="font-bold text-success">Videos done</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 text-primary/60" />
                    <span className="font-bold text-foreground/80">{lessonsLeft}</span>
                    <span>lessons left</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {isStarted && !isComplete && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/65 font-medium">Progress</span>
                <span className="font-bold text-foreground tabular-nums">{course.progress_percentage}%</span>
              </div>
              <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-[width] duration-300"
                  style={{ width: `${course.progress_percentage}%`, transitionTimingFunction: 'var(--ease-out)' }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4 pt-4 border-t border-border/40">
            <Button asChild size="sm" className="flex-1 rounded-xl text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Link href={learnUrl}>{isComplete ? 'Review' : isStarted ? 'Resume' : 'Start'}</Link>
            </Button>
            <Button
              onClick={handleUnenroll}
              disabled={isUnenrolling}
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl text-xs border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              {isUnenrolling ? 'Unenrolling...' : 'Unenroll'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unenroll from this course?</DialogTitle>
            <DialogDescription>
              You will lose access to &ldquo;{displayTitle}&rdquo; and all its content. You can re-enroll later if available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnenrollDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmUnenroll}
              disabled={isUnenrolling}
            >
              {isUnenrolling ? 'Unenrolling...' : 'Unenroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  return (
    <>
    <Link
      href={learnUrl}
      className="group block bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/20 hover:shadow-md transition-[border-color,box-shadow] duration-200 active:scale-[0.98] sm:active:scale-100"
      aria-label={isComplete ? `Completed: ${displayTitle}` : `Continue: ${displayTitle}`}
    >
      <div className="aspect-video relative overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={displayTitle}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            referrerPolicy="no-referrer"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary/35" />
          </div>
        )}
        {isComplete && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/90 text-success-foreground px-2.5 py-1 text-xs font-semibold shadow-sm">
              <CheckCircle2 className="size-3.5" />
              Completed
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
            {displayTitle}
          </h3>
          <div className="flex items-center text-xs text-foreground/65">
            {!isYoutube && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary/60" />
                <span className="font-bold text-foreground/80">{moduleCount}</span>
                <span>modules</span>
              </span>
            )}
            {!isYoutube && <span className="mx-2 text-border">·</span>}
            <span className="flex items-center gap-1.5">
              {isComplete ? (
                <>
                  <CheckCircle2 className="size-3.5 text-success" />
                  <span className="font-bold text-success">All done</span>
                </>
              ) : allVideoLessonsDone ? (
                <>
                  <CheckCircle2 className="size-3.5 text-success" />
                  <span className="font-bold text-success">Videos done</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5 text-primary/60" />
                  <span className="font-bold text-foreground/80">{lessonsLeft}</span>
                  <span>lessons left</span>
                </>
              )}
            </span>
          </div>
        </div>

        {isStarted && !isComplete && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/65 font-medium">Progress</span>
              <span className="font-bold text-foreground tabular-nums">{course.progress_percentage}%</span>
            </div>
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-300"
                style={{ width: `${course.progress_percentage}%`, transitionTimingFunction: 'var(--ease-out)' }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>

      <Dialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unenroll from this course?</DialogTitle>
            <DialogDescription>
              You will lose access to &ldquo;{displayTitle}&rdquo; and all its content. You can re-enroll later if available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnenrollDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmUnenroll}
              disabled={isUnenrolling}
            >
              {isUnenrolling ? 'Unenrolling...' : 'Unenroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SheetCard({
  sheet,
  collegeSlug,
}: {
  sheet: {
    id: string;
    title: string;
    description_md: string;
    categoriesCount: number;
    problemsCount: number;
    completedCount: number;
  };
  collegeSlug: string;
}) {
  const pct = sheet.problemsCount > 0 ? Math.round((sheet.completedCount / sheet.problemsCount) * 100) : 0;
  const sheetSlug = encodeURIComponent(sheet.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u00C0-\u024F\u0400-\u04FF]+/g, '-').replace(/(^-|-$)/g, ''));
  const learnUrl = `/c/${collegeSlug}/student/sheets/${sheetSlug}`;

  return (
    <Link
      href={learnUrl}
      className="group block bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/20 hover:shadow-md transition-[border-color,box-shadow] duration-200 active:scale-[0.98] sm:active:scale-100"
    >
      <div className="aspect-video bg-gradient-to-br from-primary/15 to-primary/5 relative overflow-hidden flex items-center justify-center">
        <FileCode className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform duration-200" />
        <div className="absolute top-2.5 right-2.5">
          <Badge className="bg-primary/10 text-primary border-primary/20">
            DSA Sheet
          </Badge>
        </div>
      </div>

      <div className="p-5 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-foreground line-clamp-1 leading-snug">
            {sheet.title}
          </h3>
          <div className="flex items-center text-xs text-foreground/65">
            <span className="flex items-center gap-1.5">
              <FileCode className="size-3.5 text-primary/60" />
              <span className="font-bold text-foreground/80">{sheet.categoriesCount}</span>
              <span>categories</span>
            </span>
            <span className="mx-2 text-border">·</span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-primary/60" />
              <span className="font-bold text-foreground/80">{sheet.completedCount}/{sheet.problemsCount}</span>
              <span>done</span>
            </span>
          </div>
        </div>

        {pct > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/65 font-medium">Progress</span>
              <span className="font-bold text-foreground tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, transitionTimingFunction: 'var(--ease-out)' }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function BootcampProgramCard({ collegeSlug }: { collegeSlug: string }) {
  return (
    <Link
      href={buildEnrolledBootcampHubHref(collegeSlug)}
      className="group block bg-card border border-primary/20 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-[border-color,box-shadow] duration-200 active:scale-[0.98] sm:active:scale-100"
    >
      <div className="aspect-video bg-gradient-to-br from-primary/15 to-primary/5 relative overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-12 rounded-2xl bg-primary/15 flex items-center justify-center">
            <BookOpen className="size-6 text-primary/70" />
          </div>
          <span className="text-xs font-medium text-primary/70">6 Career Pillars</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-sm text-foreground leading-snug">
          Job Ready Bootcamp
        </h3>
      </div>
    </Link>
  );
}

const EMPTY_TAB_CONFIG: Record<
  TabKey,
  { message: string; description: string; exploreLabel: string; exploreSegment: string; icon: React.ElementType }
> = {
  courses: {
    message: 'No courses enrolled yet',
    description: 'Browse our catalog and enroll in courses to start learning.',
    exploreLabel: 'Browse courses',
    exploreSegment: 'courses',
    icon: BookOpen,
  },
  sheets: {
    message: 'No DSA sheets started yet',
    description: 'Practice data structures and problems with structured sheets.',
    exploreLabel: 'Explore DSA sheets',
    exploreSegment: 'sheets',
    icon: Layers,
  },
  free: {
    message: 'No free courses started yet',
    description: 'Explore free courses to get started with no commitment.',
    exploreLabel: 'Explore free courses',
    exploreSegment: 'free-courses',
    icon: Play,
  },
  bundles: {
    message: 'No learning bundles purchased yet',
    description: 'Get curated bundles of courses at a discounted price.',
    exploreLabel: 'Explore learning bundles',
    exploreSegment: 'bundles',
    icon: Package,
  },
  bootcamp: {
    message: 'Enroll in Job Ready Bootcamp',
    description: 'A structured program to make you job-ready with 6 career pillars.',
    exploreLabel: 'Explore Job Ready Bootcamp',
    exploreSegment: 'bootcamp',
    icon: GraduationCap,
  },
};

function EmptyTabState({
  tab,
  collegeSlug,
}: {
  tab: TabKey;
  collegeSlug: string;
}) {
  const config = EMPTY_TAB_CONFIG[tab];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="size-5 text-primary/60" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{config.message}</p>
      <p className="text-xs text-foreground/60 mb-4 max-w-[280px]">{config.description}</p>
      <Link
        href={`/c/${collegeSlug}/student/${config.exploreSegment}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {config.exploreLabel}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function ItemsGrid({
  items,
  collegeSlug,
  currentPage,
  itemsPerPage,
  onPageChange,
  expiringCoursesMap,
}: {
  items: MyCourseItem[];
  collegeSlug: string;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  expiringCoursesMap?: Map<string, number>;
}) {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginated = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const pageNumbers = (() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }
    return pages;
  })();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginated.map((item, index) => {
          if (item.kind === 'bootcamp') {
            return <BootcampProgramCard key={item.key} collegeSlug={collegeSlug} />;
          }
          if (item.kind === 'bundle') {
            return <BundleCard key={item.key} bundle={item.bundle} />;
          }
          if (item.kind === 'sheet') {
            return <SheetCard key={item.key} sheet={item.sheet} collegeSlug={collegeSlug} />;
          }
          return (
            <CourseCard
              key={item.key}
              course={item.course}
              collegeSlug={collegeSlug}
              priority={index < 3}
              daysUntilExpiry={
                !('is_youtube' in item.course) && 'id' in item.course
                  ? expiringCoursesMap?.get(item.course.id)
                  : null
              }
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination className="pt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-label="Go to previous page"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>

            {pageNumbers.map((page) => (
              <PaginationItem key={page}>
                {page === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={currentPage === page}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-label="Go to next page"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange(currentPage + 1);
                }}
                className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}

function TabPanel({
  tabKey,
  collegeSlug,
  currentPage,
  itemsPerPage,
  setCurrentPage,
  tabItems,
  expiringCoursesMap,
}: {
  tabKey: TabKey;
  collegeSlug: string;
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  tabItems: Record<TabKey, MyCourseItem[]>;
  expiringCoursesMap?: Map<string, number>;
}) {
  const items = tabItems[tabKey];

  if (items.length === 0) {
    return <EmptyTabState tab={tabKey} collegeSlug={collegeSlug} />;
  }

  return (
    <div className="space-y-4">
      <ItemsGrid
        items={items}
        collegeSlug={collegeSlug}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        expiringCoursesMap={expiringCoursesMap}
      />
    </div>
  );
}

export function MyCoursesTabs({
  courses,
  bundles = EMPTY_BUNDLES,
  sheets = EMPTY_SHEETS,
  collegeSlug,
  showBootcampCard = false,
  bootcampFeatureEnabled = false,
  initialTab,
  expiringCoursesMap = EMPTY_EXPIRING_MAP,
}: MyCoursesTabsProps) {
  const [tab, setTab] = useState<TabKey>(() =>
    resolveInitialTab(initialTab, showBootcampCard, bootcampFeatureEnabled),
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const visibleTabDefinitions = useMemo(
    () => TAB_DEFINITIONS.filter((t) => t.key !== 'bootcamp' || bootcampFeatureEnabled),
    [bootcampFeatureEnabled],
  );

  const rows = courses as MyCourseRow[];

  // Single normalized source of truth: every tab renders from these arrays,
  // and every count is derived from the exact array it renders.
  const tabItems = useMemo<Record<TabKey, MyCourseItem[]>>(() => {
    const dedupedRows = dedupeCourseRows(rows);

    const allCourseItems: MyCourseItem[] = dedupedRows.map((course) => ({
      kind: 'course',
      key: courseDedupeKey(course),
      course,
    }));
    const courseItems = allCourseItems.filter(
      (item) => item.kind === 'course' && !isFreeCourse(item.course),
    );
    const freeItems = allCourseItems.filter(
      (item) => item.kind === 'course' && isFreeCourse(item.course),
    );
    const bundleItems: MyCourseItem[] = bundles.map((bundle) => ({
      kind: 'bundle',
      key: `bundle:${bundle.id}`,
      bundle,
    }));
    const bootcampItems: MyCourseItem[] = showBootcampCard
      ? [{ kind: 'bootcamp', key: 'job_ready_bootcamp' }]
      : [];
    const sheetItems: MyCourseItem[] = sheets.map((sheet) => ({
      kind: 'sheet',
      key: `sheet:${sheet.id}`,
      sheet,
    }));

    return {
      courses: courseItems,
      sheets: sheetItems,
      bootcamp: bootcampItems,
      bundles: bundleItems,
      free: freeItems,
    };
  }, [rows, bundles, sheets, showBootcampCard]);

  const handleTabChange = (value: string) => {
    setTab(value as TabKey);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <TabsList className="h-auto p-1 bg-muted/40 rounded-xl inline-flex gap-0.5 min-w-max">
              {visibleTabDefinitions.map((t) => {
                const count = tabItems[t.key].length;
                return (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    aria-label={`${t.label}, ${count} item${count !== 1 ? 's' : ''}`}
                    className={cn(
                      'flex-none rounded-lg px-4 py-2 text-sm font-medium text-foreground/70 transition duration-150',
                      'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold',
                      'hover:text-foreground hover:bg-muted/60',
                      'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:outline-none'
                    )}
                  >
                    {t.label}
                    <span className={cn(
                      'ml-1.5 tabular-nums text-xs',
                      tab === t.key ? 'text-primary-foreground/70 font-normal' : 'text-foreground/55 font-normal',
                    )} aria-hidden="true">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
        </div>

        <TabsContent value="courses" className="mt-6">
          <TabPanel tabKey="courses" collegeSlug={collegeSlug} currentPage={currentPage} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage} tabItems={tabItems} expiringCoursesMap={expiringCoursesMap} />
        </TabsContent>

        <TabsContent value="sheets" className="mt-6">
          <TabPanel tabKey="sheets" collegeSlug={collegeSlug} currentPage={currentPage} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage} tabItems={tabItems} expiringCoursesMap={expiringCoursesMap} />
        </TabsContent>

        <TabsContent value="free" className="mt-6">
          <TabPanel tabKey="free" collegeSlug={collegeSlug} currentPage={currentPage} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage} tabItems={tabItems} expiringCoursesMap={expiringCoursesMap} />
        </TabsContent>

        <TabsContent value="bootcamp" className="mt-6">
          <TabPanel tabKey="bootcamp" collegeSlug={collegeSlug} currentPage={currentPage} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage} tabItems={tabItems} expiringCoursesMap={expiringCoursesMap} />
        </TabsContent>

        <TabsContent value="bundles" className="mt-6">
          <TabPanel tabKey="bundles" collegeSlug={collegeSlug} currentPage={currentPage} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage} tabItems={tabItems} expiringCoursesMap={expiringCoursesMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
