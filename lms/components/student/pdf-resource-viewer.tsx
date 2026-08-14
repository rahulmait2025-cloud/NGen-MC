'use client';

import { useState, useCallback } from 'react';
import { Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfResourceViewerProps {
  signedUrl: string;
  title: string;
  downloadUrl?: string;
  className?: string;
}

export function PdfResourceViewer({
  signedUrl,
  title,
  downloadUrl,
  className,
}: PdfResourceViewerProps) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  const handleLoad = useCallback(() => {
    setLoadState('ready');
  }, []);

  const handleError = useCallback(() => {
    setLoadState('error');
  }, []);

  const handleDownload = useCallback(() => {
    const url = downloadUrl || signedUrl;
    window.open(url, '_blank');
  }, [downloadUrl, signedUrl]);

  return (
    <div className={className ?? 'space-y-3'}>
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
        <span className="text-xs font-semibold text-foreground truncate">{title}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleDownload}
          >
            <Download className="size-3.5" />
            Open
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loadState === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin"><Loader2 className="size-6 text-muted-foreground" /></div>
        </div>
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertCircle className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Unable to load PDF preview.
          </p>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <ExternalLink className="mr-1.5 size-3.5" />
            Open in new tab
          </Button>
        </div>
      )}

      {/* PDF iframe */}
      <div className="relative overflow-hidden rounded-lg border border-border/50">
        <iframe
          src={signedUrl}
          className="h-[70vh] w-full"
          onLoad={handleLoad}
          onError={handleError}
          title={title}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
