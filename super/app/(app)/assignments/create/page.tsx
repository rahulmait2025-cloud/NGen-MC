import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listColleges } from '@/lib/services/colleges';
import { listMasterCourses } from '@/lib/services/master-courses';
import { listVariants } from '@/lib/services/course-variants';
import { listBundles } from '@/lib/services/course-bundles';
import { AssignmentForm } from './assignment-form-client';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

export default async function CreateAssignmentPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const [colleges, courses, variants, bundles] = await Promise.all([
    listColleges(),
    listMasterCourses({ publish_status: 'published' }),
    listVariants({ publish_status: 'published' }),
    listBundles({ publish_status: 'published', lifecycle_status: 'active' }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8 pb-16">
      {/* Back link */}
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to assignments
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create Assignment
        </h1>
        <p className="text-sm text-muted-foreground">
          Grant content access to a college or student. Entitlements are generated automatically.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
        <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium text-foreground">Auto-entitlement</span> - Student entitlements are generated automatically when the assignment is created.
          </p>
          <p>
            <span className="font-medium text-foreground">Auto-expiry</span> - When the validity period ends, the assignment and all entitlements are expired by a daily system job.
          </p>
        </div>
      </div>

      {/* Form */}
      <AssignmentForm
        colleges={colleges}
        courses={courses.map((course) => {
          const isBuilder = course.catalog_type === 'bootcamp' || !!course.bootcamp_id;
          return {
            id: course.id,
            title: course.title,
            code: course.code,
            source_label: isBuilder
              ? 'Paid Course Builder'
              : course.show_as_paid_course
                ? 'Master Paid Course'
                : null,
          };
        })}
        variants={variants.map((variant) => ({
          id: variant.id,
          title: variant.title,
          code: variant.code,
          publish_status: variant.publish_status,
          show_as_paid_course: !!variant.show_as_paid_course,
          visibility_scope: variant.visibility_scope,
          visible_college_ids: (variant.course_variant_visibility_colleges ?? []).map(
            (row) => row.college_id,
          ),
          master_courses: { title: variant.master_courses?.title ?? '' },
        }))}
        bundles={bundles.map((bundle) => ({
          id: bundle.id,
          title: bundle.title,
          code: bundle.code,
          publish_status: bundle.publish_status,
          visibility_scope: bundle.visibility_scope,
          visible_college_ids: (bundle.course_bundle_visibility_colleges ?? []).map(
            (row) => row.college_id,
          ),
        }))}
      />
    </div>
  );
}
