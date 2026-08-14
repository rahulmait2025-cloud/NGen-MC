'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Loader2, Video, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { resolveVariantAction, validateContentIntegrityAction } from '../../master-courses/resolved-content-actions';

interface VariantResolvedPreviewProps {
  variantId: string;
}

interface PreviewData {
  totalItems: number;
  totalVideos: number;
  modulesIncluded: string[];
  videoTitles: string[];
  missingVideoAssets: number;
  missingPlaybackUrls: number;
  playableVideos: number;
}

export function VariantResolvedPreview({ variantId }: VariantResolvedPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadPreview = () => {
    startTransition(async () => {
      setError(null);
      try {
        const [resolveResult, integrityResult] = await Promise.all([
          resolveVariantAction(variantId),
          validateContentIntegrityAction('variant', variantId),
        ]);

        if (!resolveResult.success || !resolveResult.data) {
          setError(resolveResult.error ?? 'Failed to resolve variant');
          return;
        }

        const resolved = resolveResult.data;
        const integrity = integrityResult.success ? integrityResult.data : null;

        const modules = new Set<string>();
        const videoTitles: string[] = [];

        for (const si of resolved.selected_items) {
          modules.add(si.module.title);
          if (si.master_course_item.video_asset) {
            videoTitles.push(si.master_course_item.title);
          }
        }

        setPreview({
          totalItems: resolved.selected_items.length,
          totalVideos: videoTitles.length,
          modulesIncluded: Array.from(modules),
          videoTitles,
          missingVideoAssets: integrity?.missing_video_asset_links.length ?? 0,
          missingPlaybackUrls: integrity?.missing_playback_urls.length ?? 0,
          playableVideos: integrity?.playable_videos ?? 0,
        });
      } catch {
        setError('Unexpected error loading preview');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4" />
            Resolved Content Preview
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadPreview} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            {preview ? 'Refresh' : 'Load Preview'}
          </Button>
        </div>
      </CardHeader>
      {(preview || error) && (
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          )}
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Items" value={preview.totalItems} />
                <Stat label="Videos" value={preview.totalVideos} icon={<Video className="size-3.5" />} />
                <Stat label="Playable" value={preview.playableVideos} icon={<CheckCircle2 className="size-3.5 text-emerald-500" />} />
                <Stat label="Modules" value={preview.modulesIncluded.length} />
              </div>

              {(preview.missingVideoAssets > 0 || preview.missingPlaybackUrls > 0) && (
                <div className="flex flex-wrap gap-2">
                  {preview.missingVideoAssets > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <AlertTriangle className="size-3 mr-1" />
                      {preview.missingVideoAssets} missing video link{preview.missingVideoAssets !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {preview.missingPlaybackUrls > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <AlertTriangle className="size-3 mr-1" />
                      {preview.missingPlaybackUrls} missing playback URL{preview.missingPlaybackUrls !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              )}

              {preview.modulesIncluded.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Modules included:</p>
                  <div className="flex flex-wrap gap-1">
                    {preview.modulesIncluded.map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {preview.videoTitles.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Videos ({preview.videoTitles.length}):
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5 max-h-[150px] overflow-y-auto">
                    {preview.videoTitles.map((t) => (
                      <div key={t} className="flex items-center gap-1.5">
                        <Video className="size-3 text-blue-400 shrink-0" />
                        <span className="truncate">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-lg font-semibold flex items-center justify-center gap-1">
        {icon}
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
