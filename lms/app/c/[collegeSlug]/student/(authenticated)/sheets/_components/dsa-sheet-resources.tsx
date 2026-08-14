'use client';

import { ImageIcon } from 'lucide-react';
import type { DsaSheetResource } from '@/types/dsa';

interface DsaSheetResourcesProps {
  collegeSlug: string;
  resources: DsaSheetResource[];
}

function isExcalidrawResource(resource: DsaSheetResource): boolean {
  if (resource.resource_type === 'excalidraw') return true;

  if (resource.resource_type !== 'auto') return false;

  try {
    const url = new URL(resource.resource_url);
    if (url.hostname === 'link.excalidraw.com' && url.pathname.toLowerCase().startsWith('/readonly/')) {
      return true;
    }

    return (
      (url.hostname === 'excalidraw.com' || url.hostname === 'www.excalidraw.com') &&
      url.hash.toLowerCase().startsWith('#json=')
    );
  } catch {
    return false;
  }
}

export function DsaSheetResources({ collegeSlug, resources }: DsaSheetResourcesProps) {
  if (resources.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ImageIcon className="size-4" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Resources</h2>
          <p className="text-xs text-muted-foreground">Visual references added for this sheet.</p>
        </div>
      </div>

      <div className="space-y-4">
        {resources.map((resource) => (
          <article key={resource.id} className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
            <div className="border-b border-border/50 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{resource.title}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {resource.resource_type}
                </span>
              </div>
              {resource.description && (
                <p className="mt-1 text-xs text-muted-foreground">{resource.description}</p>
              )}
            </div>
            {isExcalidrawResource(resource) ? (
              <iframe
                src={resource.resource_url}
                title={resource.title}
                className="h-[68vh] min-h-[360px] w-full border-0 bg-background"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <iframe
                src={`/c/${collegeSlug}/student/sheets/resource-frame/${resource.id}`}
                title={resource.title}
                className="h-[68vh] min-h-[360px] w-full border-0 bg-background"
                sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
