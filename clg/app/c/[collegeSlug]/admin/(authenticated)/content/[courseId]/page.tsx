import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Layers,
  Video,
} from 'lucide-react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import {
  getAssignedBundleDetailForCollegeAdmin,
  getAssignedCourseDetailForCollegeAdmin,
} from '@/lib/services/assigned-courses';
import { CourseDetailView } from '@/components/content/course-detail-view';
import { BundleDetailView } from '@/components/content/bundle-detail-view';
import { resolveCourseByKey, resolveBundleByKey, resolveVariantByKey } from '@/lib/resolvers';
import { isUuid } from '@/lib/utils/slug';
import { BundleHero } from '@/components/admin/content-course/bundle-hero';
import { CourseHero } from '@/components/admin/content-course/course-hero';
import { ProvisioningSidebar } from '@/components/admin/content-course/provisioning-sidebar';
import { StatCard } from '@/components/admin/content-course/stat-card';

function formatDurationString(seconds: number | null | undefined): string {
  if (!seconds) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function CollegeAdminCourseDetailPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; courseId: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, courseId } = await params;
  const contentKey = courseId;
  const [{ tenant }, resolvedBundle] = await Promise.all([
    requireCollegeAdmin(collegeSlug),
    resolveBundleByKey(contentKey),
  ]);
  if (resolvedBundle) {
    // Canonical redirect: UUID → slug
    if (isUuid(contentKey) && resolvedBundle.slug) {
      redirect(`/c/${collegeSlug}/admin/content/${resolvedBundle.slug}`);
    }

    const bundleData = await getAssignedBundleDetailForCollegeAdmin(tenant.id, resolvedBundle.id);
    if (bundleData) {
      const { bundle, assignment, summary } = bundleData;
      const backHref = `/c/${collegeSlug}/admin/content`;
      const dateEnd = assignment?.end_date
        ? new Date(assignment.end_date).toLocaleDateString()
        : null;

    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4 shrink-0" />
          Back to assigned content
        </Link>

        <BundleHero bundle={bundle} assignment={assignment} dateEnd={dateEnd} backHref={backHref} />

        <BundleDetailView data={bundleData} />

        {summary.nested_bundle_detected && (
          <p className="text-xs text-muted-foreground text-center pb-4">
            This bundle includes nested bundles. Content is shown flattened per component.
          </p>
        )}
      </div>
    );
    }
  }

  // Try to resolve as course or variant in parallel
  const [resolvedCourse, resolvedVariant] = await Promise.all([
    resolveCourseByKey(contentKey),
    resolveVariantByKey(contentKey),
  ]);

  if (resolvedCourse) {
    // Canonical redirect: UUID → slug
    if (isUuid(contentKey) && resolvedCourse.slug) {
      redirect(`/c/${collegeSlug}/admin/content/${resolvedCourse.slug}`);
    }
  }

  if (resolvedVariant) {
    // Canonical redirect: UUID → slug
    if (isUuid(contentKey) && resolvedVariant.slug) {
      redirect(`/c/${collegeSlug}/admin/content/${resolvedVariant.slug}`);
    }
  }

  const effectiveContentId = resolvedCourse?.id || resolvedVariant?.id || contentKey;

  const data = await getAssignedCourseDetailForCollegeAdmin(tenant.id, effectiveContentId);

  if (!data) {
    notFound();
  }

  const { course, pillar, modules, items, videos, variantInfo } = data;

  const variantItemIdsSet = variantInfo ? new Set(variantInfo.variantItemIds) : null;
  const scopedItems = variantItemIdsSet
    ? items.filter((item) => variantItemIdsSet.has(item.id))
    : items;

  const moduleCount = variantItemIdsSet
    ? new Set(scopedItems.map((item) => item.module_id)).size
    : modules.length;

  const lessonCount = scopedItems.length;
  const videoCount = scopedItems.filter((item) => item.item_type === 'video').length;

  const totalDurationSeconds = scopedItems.reduce((acc, item) => {
    const dur =
      item.duration_seconds ||
      (item.video_asset_id ? videos[item.video_asset_id]?.duration_seconds : 0) ||
      0;
    return acc + dur;
  }, 0);

  const displayTitle = variantInfo?.displayTitle ?? course.title;
  const displayDescription = variantInfo?.displayDescription ?? course.description;
  const displayCode = variantInfo?.displayCode ?? course.code;
  const isVariant = Boolean(variantInfo);

  const backHref = `/c/${collegeSlug}/admin/pillars/${pillar.id}`;
  const masterTotalModules = modules.length;
  const masterTotalLessons = items.length;
  const masterTotalVideos = items.filter((i) => i.item_type === 'video').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4 shrink-0" />
        Back to {pillar.title}
      </Link>

      <CourseHero
        displayTitle={displayTitle}
        displayCode={displayCode}
        isVariant={isVariant}
        variantInfo={variantInfo}
        pillar={pillar}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Layers}
          label="Modules"
          value={moduleCount}
          sub={isVariant ? `of ${masterTotalModules} in master` : undefined}
        />
        <StatCard
          icon={BookOpen}
          label="Lessons"
          value={lessonCount}
          sub={isVariant ? `of ${masterTotalLessons} in master` : undefined}
        />
        <StatCard
          icon={Video}
          label="Videos"
          value={videoCount}
          sub={isVariant ? `of ${masterTotalVideos} in master` : undefined}
        />
        <StatCard
          icon={Clock}
          label="Total time"
          value={formatDurationString(totalDurationSeconds)}
        />
      </div>

      {/* About + provisioning */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        <section className="lg:col-span-3 card-tier-1 rounded-xl p-5 sm:p-6 flex flex-col min-h-[12rem]">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="size-4 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground">
              {isVariant ? 'About this variant' : 'About this course'}
            </h2>
          </div>
          {displayDescription ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap flex-1">
              {displayDescription}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic flex-1">
              No description has been added for this {isVariant ? 'variant' : 'course'} yet.
            </p>
          )}
        </section>

        <ProvisioningSidebar tenantName={tenant.name} pillarTitle={pillar.title} isVariant={isVariant} />
      </div>

      {/* Curriculum */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="size-5 text-primary shrink-0" />
            Curriculum
          </h2>
          <p className="text-xs text-muted-foreground">
            {moduleCount} module{moduleCount !== 1 ? 's' : ''} · {lessonCount} lesson
            {lessonCount !== 1 ? 's' : ''}
          </p>
        </div>
        <CourseDetailView data={data} />
      </section>
    </div>
  );
}
