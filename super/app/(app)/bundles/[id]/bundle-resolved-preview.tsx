'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Loader2,
  Video,
  BookOpen,
  GitBranch,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import {
  resolveBundleAction,
  validateContentIntegrityAction,
} from '../../master-courses/resolved-content-actions';

interface BundleResolvedPreviewProps {
  bundleId: string;
}

interface PreviewData {
  totalVideos: number;
  playableVideos: number;
  unresolvedRefs: number;
  fullCourses: number;
  variants: number;
  individualItems: number;
  nestedBundles: number;
  missingTpAssetIds: number;
  missingPlaybackUrls: number;
}

export function BundleResolvedPreview({ bundleId }: BundleResolvedPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadPreview = () => {
    startTransition(async () => {
      setError(null);
      try {
        const [resolveResult, integrityResult] = await Promise.all([
          resolveBundleAction(bundleId),
          validateContentIntegrityAction('bundle', bundleId),
        ]);

        if (!resolveResult.success || !resolveResult.data) {
          setError(resolveResult.error ?? 'Failed to resolve bundle');
          return;
        }

        const resolved = resolveResult.data;
        const integrity = integrityResult.success ? integrityResult.data : null;

        let fullCourses = 0;
        let variants = 0;
        let individualItems = 0;
        let nestedBundles = 0;
        let unresolvedRefs = 0;

        for (const entry of resolved.bundle_items_resolved) {
          if ('unresolved' in entry.resolved_entity) {
            unresolvedRefs++;
          } else if (entry.item_type === 'master_course') {
            fullCourses++;
          } else if (entry.item_type === 'variant') {
            variants++;
          } else if (entry.item_type === 'bundle') {
            nestedBundles++;
          } else {
            individualItems++;
          }
        }

        setPreview({
          totalVideos: integrity?.total_videos ?? 0,
          playableVideos: integrity?.playable_videos ?? 0,
          unresolvedRefs,
          fullCourses,
          variants,
          individualItems,
          nestedBundles,
          missingTpAssetIds: integrity?.missing_tp_asset_ids.length ?? 0,
          missingPlaybackUrls: integrity?.missing_playback_urls.length ?? 0,
        });
      } catch {
        setError('Unexpected error loading preview');
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Resolved Content Preview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">See what students will actually receive.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPreview} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          <Eye className="mr-2 size-4" />
          {preview ? 'Refresh' : 'Load Preview'}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniStat label="Total Videos" value={preview.totalVideos} icon={<Video className="size-3" />} />
            <MiniStat label="Playable" value={preview.playableVideos} icon={<CheckCircle2 className="size-3 text-emerald-500" />} />
            <MiniStat label="Courses" value={preview.fullCourses} icon={<BookOpen className="size-3 text-blue-500" />} />
            <MiniStat label="Variants" value={preview.variants} icon={<GitBranch className="size-3 text-purple-500" />} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MiniStat label="Items" value={preview.individualItems} icon={<FileText className="size-3" />} />
            <MiniStat label="Nested" value={preview.nestedBundles} icon={<Package className="size-3 text-emerald-500" />} />
            <MiniStat
              label="Unresolved"
              value={preview.unresolvedRefs}
              icon={preview.unresolvedRefs > 0
                ? <AlertTriangle className="size-3 text-amber-500" />
                : <CheckCircle2 className="size-3 text-emerald-500" />}
            />
          </div>

          {(preview.missingTpAssetIds > 0 || preview.missingPlaybackUrls > 0) && (
            <div className="flex flex-wrap gap-2">
              {preview.missingTpAssetIds > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:border-amber-700">
                  <AlertTriangle className="size-3 mr-1" />
                  {preview.missingTpAssetIds} missing TP asset ID{preview.missingTpAssetIds !== 1 ? 's' : ''}
                </Badge>
              )}
              {preview.missingPlaybackUrls > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:border-amber-700">
                  <AlertTriangle className="size-3 mr-1" />
                  {preview.missingPlaybackUrls} missing playback URL{preview.missingPlaybackUrls !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-center">
      <div className="text-lg font-semibold flex items-center justify-center gap-1.5">
        {icon}
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
