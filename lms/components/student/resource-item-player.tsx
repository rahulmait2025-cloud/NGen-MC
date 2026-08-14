'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Link2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPdfSignedUrlAction, getMarkdownContentAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/course-resources-actions';

const MarkdownRenderer = dynamic(
  () => import('./markdown-renderer').then((m) => m.MarkdownRenderer),
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-muted-foreground">Loading content…</div> },
);

const PdfResourceViewer = dynamic(
  () => import('./pdf-resource-viewer').then((m) => m.PdfResourceViewer),
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-muted-foreground">Loading PDF...</div> },
);

function extractInlineMarkdown(
  metadata: Record<string, unknown>,
  description?: string | null,
): string {
  const candidates = [
    metadata.content_markdown,
    metadata.content,
    metadata.markdown_content,
    metadata.markdown,
    metadata.body,
    metadata.notes,
    (metadata.content_json as Record<string, unknown> | undefined)?.markdown,
    (metadata.content_json as Record<string, unknown> | undefined)?.content,
    description,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return '';
}

interface ResourceItemPlayerProps {
  collegeSlug: string;
  courseId: string;
  itemId: string;
  itemType: 'pdf' | 'markdown' | 'external_link';
  title: string;
  description?: string | null;
  metadata: Record<string, unknown>;
  resourceId?: string | null;
  markdownContent?: string;
}

// In-memory client cache for fetched markdown resource contents (0ms repeat view)
const markdownResourceCache = new Map<string, string>();

export function ResourceItemPlayer({
  collegeSlug,
  courseId,
  itemId,
  itemType,
  title,
  description,
  metadata,
  resourceId,
  markdownContent: markdownContentProp,
}: ResourceItemPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Synchronously extract inline markdown from props/metadata/description (0ms instant render)
  const inlineMarkdown = markdownContentProp || extractInlineMarkdown(metadata, description) || (resourceId ? markdownResourceCache.get(resourceId) : undefined);

  const [markdownContent, setMarkdownContent] = useState<string | null>(inlineMarkdown ?? null);
  const [loading, setLoading] = useState(!inlineMarkdown && itemType === 'markdown' && !!resourceId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. If inline markdown is available or already in cache, skip loading state entirely
      if (itemType === 'markdown' && inlineMarkdown) {
        if (!cancelled) {
          setMarkdownContent(inlineMarkdown);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (itemType === 'pdf' && resourceId) {
          const res = await getPdfSignedUrlAction(collegeSlug, courseId, resourceId);
          if (!cancelled) {
            if (res.success && res.signedUrl) {
              setSignedUrl(res.signedUrl);
            } else {
              setError(res.error ?? 'Failed to load PDF');
            }
          }
        } else if (itemType === 'external_link') {
          // External links don't need loading
          if (!cancelled) setLoading(false);
        } else if (itemType === 'markdown') {
          // Check client cache first
          if (resourceId && markdownResourceCache.has(resourceId)) {
            const cached = markdownResourceCache.get(resourceId)!;
            if (!cancelled) {
              setMarkdownContent(cached);
              setLoading(false);
            }
            return;
          }

          // Markdown content is fetched from server action
          if (resourceId) {
            const res = await getMarkdownContentAction(collegeSlug, courseId, resourceId);
            if (!cancelled) {
              if (res.success && res.content !== undefined) {
                markdownResourceCache.set(resourceId, res.content);
                setMarkdownContent(res.content);
              } else {
                setError(res.error ?? 'Failed to load markdown content');
              }
            }
          } else {
            if (!cancelled) setLoading(false);
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load resource');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [collegeSlug, courseId, itemId, itemType, resourceId, markdownContentProp, inlineMarkdown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin"><Loader2 className="size-6 text-muted-foreground" /></div>
        <p className="text-sm text-muted-foreground">Loading resource…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  // PDF viewer
  if (itemType === 'pdf' && signedUrl) {
    return (
      <PdfResourceViewer
        signedUrl={signedUrl}
        title={title}
        className="mx-auto max-w-4xl px-4 pb-10 pt-6 md:px-0"
      />
    );
  }

  // Markdown reader
  if (itemType === 'markdown') {
    const content = markdownContent ?? extractInlineMarkdown(metadata, description);
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-0">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        {description && (
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        )}
        {content ? (
          <MarkdownRenderer content={content} />
        ) : (
          <p className="text-sm text-muted-foreground">No lesson content has been added yet.</p>
        )}
      </div>
    );
  }

  // External link
  if (itemType === 'external_link') {
    const url = (metadata.url as string) || (metadata.external_url as string) || '';
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-0">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-purple-600">
            external link
          </span>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        {description && (
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-purple-500/10 ring-1 ring-purple-500/20">
            <Link2 className="size-5 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Opens in a new tab
            </p>
          </div>
          {url && (
            <Button
              onClick={() => window.open(url, '_blank')}
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-md px-4"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Visit
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
