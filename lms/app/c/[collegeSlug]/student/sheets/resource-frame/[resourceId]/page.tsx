import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { requireStudent } from '@/lib/auth/require-student';
import { getVisibleDsaSheetResourceById, isStudentEnrolled } from '@/lib/services/dsa-sheet';
import type { DsaSheetResource, DsaSheetResourceType } from '@/types/dsa';

interface ResourceFramePageProps {
  params: Promise<{ collegeSlug: string; resourceId: string }>;
}

const TRUSTED_IFRAME_HOSTS = new Set(['link.excalidraw.com', 'excalidraw.com', 'www.excalidraw.com']);

function isExcalidrawResourceUrl(url: URL): boolean {
  if (url.hostname === 'link.excalidraw.com' && url.pathname.toLowerCase().startsWith('/readonly/')) {
    return true;
  }

  return (
    (url.hostname === 'excalidraw.com' || url.hostname === 'www.excalidraw.com') &&
    url.hash.toLowerCase().startsWith('#json=')
  );
}

function resolveRenderType(resource: DsaSheetResource): DsaSheetResourceType {
  if (resource.resource_type !== 'auto') return resource.resource_type;

  const url = new URL(resource.resource_url);
  const pathname = url.pathname.toLowerCase();
  if (isExcalidrawResourceUrl(url)) return 'excalidraw';
  if (pathname.endsWith('.svg')) return 'svg';
  if (/\.(png|jpe?g|webp|gif)$/i.test(pathname)) return 'image';
  return 'iframe';
}

function parseHttpsUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
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

function ResourceFrameFallback(): ReactNode {
  return <main className="min-h-screen bg-background" />;
}

async function ResourceFrameContent({ params }: ResourceFramePageProps): Promise<ReactNode> {
  const { collegeSlug, resourceId } = await params;
  const ctx = await requireStudent(collegeSlug);
  const record = await getVisibleDsaSheetResourceById(resourceId);

  if (!record) notFound();

  const enrolled = await isStudentEnrolled(ctx.studentId, record.sheet.id);
  if (!enrolled) notFound();

  const resourceUrl = parseHttpsUrl(record.resource.resource_url);
  if (!resourceUrl) notFound();

  const renderType = resolveRenderType(record.resource);
  const canFrame = TRUSTED_IFRAME_HOSTS.has(resourceUrl.hostname);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {renderType === 'image' || renderType === 'svg' ? (
        <iframe
          srcDoc={buildImageFrameDocument(record.resource.resource_url, record.resource.title)}
          title={record.resource.title}
          className="h-screen w-full border-0 bg-background"
          sandbox=""
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : renderType === 'excalidraw' ? (
        <iframe
          src={record.resource.resource_url}
          title={record.resource.title}
          className="h-screen w-full border-0 bg-background"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : canFrame ? (
        <iframe
          src={record.resource.resource_url}
          title={record.resource.title}
          className="h-screen w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <div className="max-w-sm rounded-xl border border-border/60 bg-card p-5">
            <h1 className="text-sm font-semibold text-foreground">Unsupported resource</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              This resource type cannot be embedded. Use a direct PNG, JPG, WebP, SVG, or Excalidraw link.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ResourceFramePage({ params }: ResourceFramePageProps): ReactNode {
  return (
    <Suspense fallback={<ResourceFrameFallback />}>
      <ResourceFrameContent params={params} />
    </Suspense>
  );
}
