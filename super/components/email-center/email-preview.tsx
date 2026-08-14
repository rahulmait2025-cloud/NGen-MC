'use client';

import { useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { renderCampaignContent } from '@/lib/email-center/template-renderer';
import { sanitizeHtmlForPreview } from '@/lib/email-center/sanitize-html-preview';
import { EMAIL_PREVIEW_IFRAME_SANDBOX } from '@/lib/email-center/email-preview-sandbox';

interface EmailPreviewProps {
  subject: string;
  previewText?: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, string>;
}

const emptySubscribe = () => () => {};

export function EmailPreview({
  subject,
  previewText,
  htmlContent,
  textContent,
  variables,
}: EmailPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  // Client-only gate avoids SSR/client DOMPurify srcDoc hydration mismatch.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const rendered = renderCampaignContent(subject, previewText ?? null, htmlContent, textContent ?? '', variables ?? {});
  const sanitizedHtml = mounted ? sanitizeHtmlForPreview(rendered.html) : '';
  const isMobile = device === 'mobile';

  return (
    <Card className="flex h-full min-size-0 max-w-full flex-col border-0 shadow-none">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base font-medium">
          {isMobile ? 'Mobile Preview' : 'Desktop Preview'}
        </CardTitle>
        <div className="inline-flex rounded-md border border-border bg-muted p-1">
          <Button
            type="button"
            variant={device === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setDevice('desktop')}
          >
            Desktop
          </Button>
          <Button
            type="button"
            variant={device === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setDevice('mobile')}
          >
            Mobile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-muted/10 p-3 sm:p-4">
        <div
          className={cn(
            'mx-auto flex w-full min-w-0 flex-col rounded border border-border bg-white shadow-sm',
            isMobile ? 'max-w-[min(390px,100%)]' : 'max-w-full',
          )}
        >
          <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-400" />
                <div className="size-3 rounded-full bg-amber-400" />
                <div className="size-3 rounded-full bg-green-400" />
              </div>
              <div className="ml-4 min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs text-muted-foreground">
                email.nextgencto.com
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-x-hidden p-3 sm:p-4">
            <div className="mb-3 border-b border-border pb-3">
              <p className="wrap-break-word text-sm font-medium text-foreground">
                {rendered.subject || '(No subject)'}
              </p>
              {rendered.previewText && (
                <p className="truncate text-xs text-muted-foreground">{rendered.previewText}</p>
              )}
            </div>

            {!mounted || sanitizedHtml.trim().length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                {mounted
                  ? 'Start writing or choose a template to preview your email.'
                  : 'Loading preview…'}
              </div>
            ) : (
              <iframe
                title="Email preview"
                sandbox={EMAIL_PREVIEW_IFRAME_SANDBOX}
                srcDoc={sanitizedHtml}
                className="min-h-[420px] w-full border-0 bg-white"
                style={{ colorScheme: 'light' }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
