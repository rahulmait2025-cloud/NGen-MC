import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getVariantWithItems } from '@/lib/services/course-variants';
import { listMasterCoursePillars } from '@/lib/services/master-course-pillars';
import { fetchCourseContentForPicker } from '../actions-picker';
import { VariantDetailClient } from './variant-detail-client';
import { VariantContentPicker } from './variant-content-picker';
import { VariantResolvedPreview } from './variant-resolved-preview';
import { VariantItemsTable } from './variant-items-table';
import { VariantPaidCoursePanel } from '@/components/master-courses/variant-paid-course-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveVariantByKey } from '@/lib/resolvers';
import { isUuid } from '@/lib/utils/slug';

function statusBadge(status: string) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Published</Badge>;
    case 'unpublished':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">Unpublished</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

function visibilityBadge(scope: string) {
  switch (scope) {
    case 'private':
      return <Badge className="bg-slate-500/10 text-slate-700 border-slate-500/30 border dark:text-slate-300 dark:border-slate-500/20 dark:bg-slate-500/10">Private</Badge>;
    case 'global':
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30 border dark:text-blue-400 dark:border-blue-500/20 dark:bg-blue-500/10">Global</Badge>;
    case 'selected_colleges':
      return <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/30 border dark:text-purple-400 dark:border-purple-500/20 dark:bg-purple-500/10">Selected Colleges</Badge>;
    default:
      return <Badge variant="outline">{scope}</Badge>;
  }
}

export default async function VariantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const { id } = await params;
  const variantKey = id;
  const resolvedSearchParams = await searchParams;
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  // Resolve variantKey to canonical variant
  const resolved = await resolveVariantByKey(variantKey);
  if (!resolved) {
    notFound();
  }

  // Canonical redirect: UUID → slug
  if (isUuid(variantKey) && resolved.slug) {
    const searchParamsQuery = new URLSearchParams(resolvedSearchParams as Record<string, string>).toString();
    const queryString = searchParamsQuery ? `?${searchParamsQuery}` : '';
    redirect(`/variants/${resolved.slug}${queryString}`);
  }

  const effectiveVariantId = resolved.id;

  const [variant] = await Promise.all([
    getVariantWithItems(effectiveVariantId),
  ]);

  if (!variant) {
    notFound();
  }

  const sb = createAdminClient();

  const [pickerResult, collegesResult, pillars] = await Promise.all([
    fetchCourseContentForPicker(variant.master_course_id),
    sb.from('colleges').select('id, name').eq('status', 'active').order('name'),
    listMasterCoursePillars(),
  ]);

  const pickerModules = 'modules' in pickerResult ? pickerResult.modules : [];
  const colleges = (collegesResult.data ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));
  const existingItemIds = new Set(variant.items.map((i) => i.master_course_item_id));
  const selectedCollegeIds = (variant.course_variant_visibility_colleges ?? []).map((vc) => vc.college_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/variants">
              <ArrowLeft className="size-4 mr-2" />
              Back to Variants
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{variant.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{variant.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(variant.publish_status)}
          {visibilityBadge(variant.visibility_scope)}
        </div>
      </div>

      {/* Variant Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Parent Course</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/master-courses/${variant.master_courses.id}`}
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ExternalLink className="size-4" />
              <div>
                <div className="font-medium">{variant.master_courses.title}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {variant.master_courses.code}
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Included</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {variant.items.length}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {variant.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{variant.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <VariantItemsTable variantId={variant.id} items={variant.items} />

      {/* Content Picker */}
      <VariantContentPicker
        variantId={variant.id}
        existingItemIds={existingItemIds}
        modules={pickerModules}
      />

      {/* Resolved Preview */}
      <VariantResolvedPreview variantId={variant.id} />

      {/* Client Actions */}
      <VariantDetailClient
        variant={{
          id: variant.id,
          publish_status: variant.publish_status,
          pillar_id: variant.pillar_id,
          title: variant.title,
          slug: variant.slug,
          code: variant.code,
          description: variant.description,
          selling_price: variant.selling_price,
          discounted_price: variant.discounted_price,
          pricing_model: variant.pricing_model,
          visibility_scope: variant.visibility_scope,
          created_for_college_id: variant.created_for_college_id,
        }}
        itemCount={variant.items.length}
        pillars={pillars.map((pillar) => ({ id: pillar.pillar_id, title: pillar.title }))}
        colleges={colleges}
        selectedCollegeIds={selectedCollegeIds}
      />

      <VariantPaidCoursePanel
        variantId={effectiveVariantId}
        masterCourseId={variant.master_course_id}
        variantTitle={variant.title}
        showAsPaidCourse={!!variant.show_as_paid_course}
      />
    </div>
  );
}
