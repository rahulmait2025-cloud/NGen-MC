import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';

import { requireStudent } from '@/lib/auth/require-student';
import { getVisibleDsaProblemResourceById, isStudentEnrolled } from '@/lib/services/dsa-sheet';

interface ProblemResourceFramePageProps {
  params: Promise<{ collegeSlug: string; problemId: string }>;
  searchParams: Promise<{ fromSheet?: string }>;
}

const TRUSTED_IFRAME_HOSTS = new Set(['link.excalidraw.com', 'excalidraw.com', 'www.excalidraw.com']);

const SAFE_SHEET_SLUG_RE = /^[a-zA-Z0-9-]+$/;

function resolveBackToSheetHref(
  collegeSlug: string,
  fromSheetParam: string | undefined,
  canonicalSlug: string | undefined,
): string {
  const candidate = fromSheetParam && SAFE_SHEET_SLUG_RE.test(fromSheetParam)
    ? fromSheetParam
    : canonicalSlug && SAFE_SHEET_SLUG_RE.test(canonicalSlug)
      ? canonicalSlug
      : null;

  return candidate
    ? `/c/${collegeSlug}/student/sheets/${candidate}`
    : `/c/${collegeSlug}/student/sheets`;
}

function isExcalidrawResourceUrl(url: URL): boolean {
  if (url.hostname === 'link.excalidraw.com' && url.pathname.toLowerCase().startsWith('/readonly/')) {
    return true;
  }

  return (
    (url.hostname === 'excalidraw.com' || url.hostname === 'www.excalidraw.com') &&
    url.hash.toLowerCase().startsWith('#json=')
  );
}

function normalizeGithubBlobUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const blobIndex = parts.indexOf('blob');
  if (url.hostname !== 'github.com' || blobIndex < 2 || parts.length <= blobIndex + 2) {
    return url.toString();
  }

  const owner = parts[0];
  const repo = parts[1];
  const branch = parts[blobIndex + 1];
  const filePath = parts.slice(blobIndex + 2).join('/');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

function parseHttpsUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(normalizeGithubBlobUrl(rawUrl));
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isImageUrl(url: URL): boolean {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildImageFrameDocument(imageUrl: string, title: string): string {
  const safeUrl = escapeHtml(imageUrl);
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; width: 100%; min-height: 100%; background: #09090b; }
      body { display: flex; align-items: center; justify-content: center; overflow: auto; padding: 16px; box-sizing: border-box; }
      img { max-width: 100%; max-height: calc(100vh - 32px); object-fit: contain; border-radius: 10px; background: white; }
    </style>
  </head>
  <body>
    <img src="${safeUrl}" alt="${safeTitle}" />
  </body>
</html>`;
}

export default async function ProblemResourceFramePage({ params, searchParams }: ProblemResourceFramePageProps): Promise<ReactNode> {
  const { collegeSlug, problemId } = await params;
  const { fromSheet } = await searchParams;
  const ctx = await requireStudent(collegeSlug);
  const record = await getVisibleDsaProblemResourceById(problemId);

  if (!record) notFound();

  const enrolled = await isStudentEnrolled(ctx.studentId, record.sheet.id);
  if (!enrolled) notFound();

  const resourceUrl = parseHttpsUrl(record.problem.resource_url);
  if (!resourceUrl) notFound();

  const backToSheetHref = resolveBackToSheetHref(collegeSlug, fromSheet, record.sheet.slug);

  const isExcalidraw = isExcalidrawResourceUrl(resourceUrl);
  const canFrame = TRUSTED_IFRAME_HOSTS.has(resourceUrl.hostname);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-[calc(100dvh-4rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-background px-4 py-3">
        <div className="min-w-0">
          <Link
            href={backToSheetHref}
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to sheets
          </Link>
          <h1 className="truncate text-sm font-semibold text-foreground">{record.problem.name}</h1>
        </div>
        <a
          href={resourceUrl.toString()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open original
        </a>
      </div>

      <div className="min-h-0 flex-1 bg-background">
        {isImageUrl(resourceUrl) ? (
          <iframe
            srcDoc={buildImageFrameDocument(resourceUrl.toString(), record.problem.name)}
            title={record.problem.name}
            className="h-full w-full border-0 bg-background"
            sandbox=""
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : isExcalidraw ? (
          <iframe
            src={resourceUrl.toString()}
            title={record.problem.name}
            className="h-full w-full border-0 bg-background"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : canFrame ? (
          <iframe
            src={resourceUrl.toString()}
            title={record.problem.name}
            className="h-full w-full border-0 bg-background"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-sm rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Unsupported resource</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Use a direct PNG, JPG, WebP, SVG, or Excalidraw link.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
