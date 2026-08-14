import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listBundles } from '@/lib/services/course-bundles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Package,
  PackageX,
  Globe,
  Lock,
  Users,
  IndianRupee,
  Calendar,
} from 'lucide-react';

const STATUS_DOT_COLORS = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  zinc: 'bg-zinc-400 dark:bg-zinc-500',
} as const;

const PUBLISH_BADGE_CONFIG = {
  published: { label: 'Published', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  unpublished: { label: 'Unpublished', className: 'bg-muted text-muted-foreground' },
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground/70' },
} as const;

const LIFECYCLE_CONFIG = {
  active: { label: 'Active', dot: 'emerald' as const, text: 'text-emerald-700 dark:text-emerald-400' },
  expired: { label: 'Expired', dot: 'amber' as const, text: 'text-amber-700 dark:text-amber-400' },
  ended: { label: 'Ended', dot: 'zinc' as const, text: 'text-muted-foreground' },
  archived: { label: 'Archived', dot: 'zinc' as const, text: 'text-muted-foreground' },
  draft: { label: 'Draft', dot: 'zinc' as const, text: 'text-muted-foreground' },
} as const;

const VISIBILITY_CONFIG = {
  global: { icon: Globe, label: 'Global', className: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  selected_colleges: { icon: Users, label: 'Selected', className: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
  private: { icon: Lock, label: 'Private', className: 'text-muted-foreground bg-muted' },
} as const;

function StatusDot({ color }: { color: 'emerald' | 'amber' | 'zinc' }) {
  return <span className={`size-1.5 rounded-full ${STATUS_DOT_COLORS[color]}`} />;
}

function PublishBadge({ status }: { status: string }) {
  const { label, className } = PUBLISH_BADGE_CONFIG[status as keyof typeof PUBLISH_BADGE_CONFIG] ?? PUBLISH_BADGE_CONFIG.draft;
  return (
    <Badge variant="secondary" className={`font-medium text-[11px] px-2 py-0.5 ${className}`}>
      {label}
    </Badge>
  );
}

function LifecycleIndicator({ status }: { status: string }) {
  const { label, dot, text } = LIFECYCLE_CONFIG[status as keyof typeof LIFECYCLE_CONFIG] ?? LIFECYCLE_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${text}`}>
      <StatusDot color={dot} />
      {label}
    </span>
  );
}

function VisibilityBadge({ scope }: { scope: string }) {
  const { icon: Icon, label, className } = VISIBILITY_CONFIG[scope as keyof typeof VISIBILITY_CONFIG] ?? VISIBILITY_CONFIG.private;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${className}`}>
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPrice(price: number | null | undefined) {
  if (price == null) return null;
  return `₹${price.toLocaleString('en-IN')}`;
}

export default async function BundlesListPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const allBundles = await listBundles();
  const archivedBundles = allBundles.filter((b) => b.lifecycle_status === 'archived');
  const bundles = allBundles.filter((b) => b.lifecycle_status !== 'archived');

  const stats = {
    total: bundles.length,
    published: bundles.filter((b) => b.publish_status === 'published').length,
    active: bundles.filter((b) => b.lifecycle_status === 'active').length,
    totalItems: bundles.reduce((sum, b) => sum + b.items.length, 0),
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bundles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Package variants, courses, or items together for distribution.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/bundles/create">
            <Plus className="size-4 mr-1.5" />
            New Bundle
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Published', value: stats.published },
          { label: 'Active', value: stats.active },
          { label: 'Items', value: stats.totalItems },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border/60 bg-card px-4 py-3">
            <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
            <div className="text-2xl font-semibold tabular-nums text-foreground mt-0.5">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Archived bundles note */}
      {archivedBundles.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 border border-border/40">
          <Package className="size-3.5" />
          <span>
            {archivedBundles.length} archived {archivedBundles.length === 1 ? 'bundle' : 'bundles'} hidden from view.
          </span>
        </div>
      )}

      {/* Bundle list */}
      {bundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-xl">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <PackageX className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground">No bundles yet</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
            Create your first bundle to package courses or variants together.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/bundles/create">
              <Plus className="size-4 mr-1.5" />
              Create Bundle
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_110px_90px_70px_100px] gap-4 px-5 py-2.5 bg-muted/50 border-b border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bundle</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Visibility</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Price</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Items</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Created</span>
          </div>

          {/* Rows */}
          {bundles.map((bundle, index) => (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.id}`}
              className={`grid grid-cols-[1fr_140px_110px_90px_70px_100px] gap-4 px-5 py-3.5 items-center transition-colors hover:bg-muted/40 ${index < bundles.length - 1 ? 'border-b border-border/40' : ''}`}
            >
              {/* Bundle info */}
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {bundle.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {bundle.code}
                      </span>
                      {bundle.description && (
                        <>
                          <span className="text-border">·</span>
                          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {bundle.description}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <PublishBadge status={bundle.publish_status} />
                <LifecycleIndicator status={bundle.lifecycle_status} />
              </div>

              {/* Visibility */}
              <VisibilityBadge scope={bundle.visibility_scope} />

              {/* Price */}
              <div className="text-sm tabular-nums text-foreground">
                {bundle.selling_price != null ? (
                  <div className="flex items-center gap-1">
                    <IndianRupee className="size-3 text-muted-foreground" />
                    <span>{formatPrice(bundle.selling_price)?.replace('₹', '')}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Items */}
              <div className="text-right text-sm tabular-nums text-muted-foreground">
                {bundle.items.length}
              </div>

              {/* Created */}
              <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground tabular-nums">
                <Calendar className="size-3" />
                {formatDate(bundle.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
