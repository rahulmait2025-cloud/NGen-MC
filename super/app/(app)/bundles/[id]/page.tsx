import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getBundleWithItems, getBundleItemSelectedItems } from '@/lib/services/course-bundles';
import { getAllBundlePricePlans } from '@/lib/services/bundle-price-plans';
import { BundleDetailClient } from './bundle-detail-client';
import { BundleContentPicker } from './bundle-content-picker';
import { BundleResolvedPreview } from './bundle-resolved-preview';
import { BundleSelectedItemsEditor } from './bundle-selected-items-editor';
import { BundleMetadataEditor } from './bundle-metadata-editor';
import { BundleLmsMetadataEditor } from './bundle-lms-metadata-editor';
import { BundlePricingPanel } from './bundle-pricing-panel';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Layers,
  BookOpen,
  GitBranch,
  FileText,
  Globe,
  Lock,
  Users,
  Tag,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { isUuid } from '@/lib/utils/slug';

function statusBadge(status: string) {
  switch (status) {
    case 'published':
      return (
        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 font-medium text-xs">
          Published
        </Badge>
      );
    case 'unpublished':
      return (
        <Badge variant="secondary" className="text-muted-foreground font-medium text-xs">
          Unpublished
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-muted-foreground/70 font-medium text-xs">
          Draft
        </Badge>
      );
  }
}

function lifecycleBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Expired
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <span className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          Archived
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <span className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          Draft
        </span>
      );
  }
}

function visibilityLabel(scope: string) {
  switch (scope) {
    case 'global':
      return { icon: <Globe className="size-3.5 text-blue-500" />, label: 'Global' };
    case 'selected_colleges':
      return { icon: <Users className="size-3.5 text-violet-500" />, label: 'Selected Colleges' };
    default:
      return { icon: <Lock className="size-3.5 text-muted-foreground" />, label: 'Private' };
  }
}

function itemTypeName(type: string) {
  switch (type) {
    case 'master_course': return 'Course';
    case 'variant': return 'Variant';
    case 'bundle': return 'Bundle';
    case 'master_course_item': return 'Lecture';
    default: return type.replace(/_/g, ' ');
  }
}

function itemTypeIcon(type: string) {
  switch (type) {
    case 'master_course': return <BookOpen className="size-3.5 text-blue-500" />;
    case 'variant': return <GitBranch className="size-3.5 text-purple-500" />;
    case 'bundle': return <Package className="size-3.5 text-emerald-500" />;
    default: return <FileText className="size-3.5 text-orange-500" />;
  }
}

function formatPrice(price: number | null | undefined) {
  if (price == null) return null;
  return `₹${price.toLocaleString('en-IN')}`;
}

async function fetchComponentLabels(items: Array<{ item_type: string; reference_id: string }>) {
  const sb = createAdminClient();
  const labels: Record<string, string> = {};

  const mcIds: string[] = [];
  const variantIds: string[] = [];
  const bundleIds: string[] = [];
  const itemIds: string[] = [];
  for (const i of items) {
    if (i.item_type === 'master_course') mcIds.push(i.reference_id);
    else if (i.item_type === 'variant') variantIds.push(i.reference_id);
    else if (i.item_type === 'bundle') bundleIds.push(i.reference_id);
    else if (i.item_type === 'master_course_item') itemIds.push(i.reference_id);
  }

  if (mcIds.length > 0) {
    const { data } = await sb.from('master_courses').select('id, title').in('id', mcIds);
    for (const d of data ?? []) labels[`master_course:${d.id}`] = d.title as string;
  }
  if (variantIds.length > 0) {
    const { data } = await sb.from('course_variants').select('id, title').in('id', variantIds);
    for (const d of data ?? []) labels[`variant:${d.id}`] = d.title as string;
  }
  if (bundleIds.length > 0) {
    const { data } = await sb.from('course_bundles').select('id, title').in('id', bundleIds);
    for (const d of data ?? []) labels[`bundle:${d.id}`] = d.title as string;
  }
  if (itemIds.length > 0) {
    const { data } = await sb.from('master_course_items').select('id, title').in('id', itemIds);
    for (const d of data ?? []) labels[`master_course_item:${d.id}`] = d.title as string;
  }

  return labels;
}

async function fetchColleges() {
  const sb = createAdminClient();
  const { data } = await sb.from('colleges').select('id, name').eq('status', 'active').order('name');
  return (data ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));
}

export default async function BundleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const { id } = await params;
  const bundleKey = id;
  const resolvedSearchParams = await searchParams;

  // Resolve bundleKey to canonical bundle and check auth in parallel
  const sbResolve = createAdminClient();
  const [authResult, resolvedByUuid, resolvedBySlug] = await Promise.all([
    getSessionFromHeaders(),
    isUuid(bundleKey)
      ? sbResolve.from('course_bundles').select('id, slug').eq('id', bundleKey).maybeSingle()
      : Promise.resolve({ data: null }),
    !isUuid(bundleKey)
      ? sbResolve.from('course_bundles').select('id, slug').eq('slug', bundleKey).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!authResult) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const resolved = isUuid(bundleKey) ? resolvedByUuid.data : resolvedBySlug.data;

  // Canonical redirect: UUID → slug
  if (isUuid(bundleKey) && resolved?.slug) {
    const searchParamsQuery = new URLSearchParams(resolvedSearchParams as Record<string, string>).toString();
    const queryString = searchParamsQuery ? `?${searchParamsQuery}` : '';
    redirect(`/bundles/${resolved.slug}${queryString}`);
  }

  if (!resolved) {
    notFound();
  }

  const effectiveBundleId = resolved.id;

  const [bundle, bundlePricePlans] = await Promise.all([
    getBundleWithItems(effectiveBundleId),
    getAllBundlePricePlans(effectiveBundleId).catch(() => []),
  ]);

  if (!bundle) {
    notFound();
  }

  const [selectedItemsMap, componentLabels, colleges] = await Promise.all([
    getBundleItemSelectedItems(bundle.id),
    fetchComponentLabels(bundle.items),
    fetchColleges(),
  ]);

  const selectedItemsObj: Record<string, string[]> = {};
  for (const [key, value] of selectedItemsMap) {
    selectedItemsObj[key] = value;
  }

  const selectedCollegeIds = (bundle.course_bundle_visibility_colleges ?? []).map((vc) => vc.college_id);
  const vis = visibilityLabel(bundle.visibility_scope || 'private');

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* Back link */}
      <Link
        href="/bundles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to bundles
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {bundle.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{bundle.code}</span>
              <span className="text-border">/</span>
              {lifecycleBadge(bundle.lifecycle_status || 'draft')}
              <span className="text-border">/</span>
              <span className="inline-flex items-center gap-1">
                {vis.icon}
                {vis.label}
              </span>
            </div>
          </div>
          {statusBadge(bundle.publish_status || 'draft')}
        </div>

        {bundle.description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {bundle.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          icon={<Tag className="size-4" />}
          label="Price"
          value={bundle.selling_price != null ? formatPrice(bundle.selling_price) : 'Not set'}
          sub={bundle.discounted_price != null && bundle.selling_price != null && bundle.discounted_price < bundle.selling_price
            ? `${formatPrice(bundle.discounted_price)} discounted`
            : bundle.pricing_model
              ? bundle.pricing_model.replace(/_/g, ' ')
              : undefined}
          subColor={bundle.discounted_price != null && bundle.selling_price != null && bundle.discounted_price < bundle.selling_price ? 'emerald' : 'default'}
        />
        <StatTile
          icon={<Package className="size-4" />}
          label="Components"
          value={String(bundle.items.length)}
        />
        <StatTile
          icon={<Layers className="size-4" />}
          label="Resolved"
          value={<ResolvedCount bundleId={bundle.id} />}
        />
        <StatTile
          icon={<DollarSign className="size-4" />}
          label="Model"
          value={bundle.pricing_model ? bundle.pricing_model.replace(/_/g, ' ') : 'Not set'}
        />
      </div>

      <Separator />

      {/* Bundle Components */}
      <Section
        title="Bundle Components"
        description="Variants, courses, lectures, or nested bundles included in this bundle."
      >
        {bundle.items.length === 0 ? (
          <EmptyState
            icon={<Package className="size-6" />}
            title="No components yet"
            description="Add variants, courses, or items using the picker below."
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_120px_70px] gap-4 px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50">
              <span></span>
              <span>Component</span>
              <span>Overrides</span>
              <span className="text-right">Sort</span>
            </div>
            {bundle.items
              .sort((a, b) => a.sort_order - (b.sort_order || 0))
              .map((item) => {
                const key = `${item.item_type}:${item.reference_id}`;
                const label = componentLabels[key] ?? item.reference_id;
                const overrideCount = selectedItemsObj[item.id]?.length ?? 0;
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[40px_1fr_120px_70px] gap-4 px-5 py-3 items-center border-t first:border-t-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                      {itemTypeIcon(item.item_type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{label}</div>
                      <div className="text-xs text-muted-foreground">{itemTypeName(item.item_type)}</div>
                    </div>
                    <div>
                      {overrideCount > 0 ? (
                        <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                          {overrideCount} selected
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Full content</span>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground tabular-nums">
                      {item.sort_order}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Section>

      <Separator />

      {/* Selected Items Editor */}
      <BundleSelectedItemsEditor
        bundleId={bundle.id}
        bundleItems={bundle.items.map((i) => ({
          id: i.id,
          item_type: i.item_type,
          reference_id: i.reference_id,
          sort_order: i.sort_order,
        }))}
      />

      {/* Content Picker */}
      <BundleContentPicker
        bundleId={bundle.id}
        existingItems={bundle.items.map((i) => ({ item_type: i.item_type, reference_id: i.reference_id }))}
      />

      <Separator />

      {/* Metadata Editor */}
      <BundleMetadataEditor
        bundle={bundle}
        colleges={colleges}
        selectedCollegeIds={selectedCollegeIds}
      />

      <BundleLmsMetadataEditor bundle={bundle} />

      <BundlePricingPanel bundleId={bundle.id} initialPlans={bundlePricePlans} />

      {/* Resolved Preview */}
      <BundleResolvedPreview bundleId={bundle.id} />

      <Separator />

      {/* Client Actions */}
      <BundleDetailClient bundle={bundle} />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  subColor = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  subColor?: 'default' | 'emerald';
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="text-base font-semibold text-foreground capitalize">{value}</div>
      {sub && (
        <div className={`text-xs mt-0.5 ${
          subColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        }`}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed rounded-lg">
      <div className="size-12 rounded-lg bg-muted flex items-center justify-center mb-3 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
    </div>
  );
}

async function ResolvedCount({ bundleId }: { bundleId: string }) {
  const sb = createAdminClient();
  const { count } = await sb
    .from('bundle_resolved_items')
    .select('*', { count: 'exact', head: true })
    .eq('bundle_id', bundleId);

  return <>{count ?? 0}</>;
}
