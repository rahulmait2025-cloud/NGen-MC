'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';
import { getExcalidrawScene } from '@/lib/api/student-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;

const ExcalidrawComponent = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false },
);

interface ExcalidrawResourceViewerProps {
  excalidrawUrl?: string | null;
  excalidrawSceneJson?: Record<string, unknown> | null;
  title: string;
}

function isReadonlyExcalidrawUrl(url: string | null | undefined): url is string {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'link.excalidraw.com' && parsedUrl.pathname.startsWith('/readonly/');
  } catch {
    return false;
  }
}

export function ExcalidrawResourceViewer({
  excalidrawUrl,
  excalidrawSceneJson,
  title,
}: ExcalidrawResourceViewerProps) {
  const [excalidrawData, setExcalidrawData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readonlyFallbackUrl, setReadonlyFallbackUrl] = useState<string | null>(null);
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Block Excalidraw's built-in context menu by capturing the event
  // at the DOM level before React's synthetic events reach it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const block = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    el.addEventListener('contextmenu', block, true);
    return () => el.removeEventListener('contextmenu', block, true);
  }, []);

  const loadScene = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setReadonlyFallbackUrl(null);

      // For readonly Excalidraw+ links, render via iframe directly.
      if (!excalidrawSceneJson && isReadonlyExcalidrawUrl(excalidrawUrl)) {
        setReadonlyFallbackUrl(excalidrawUrl);
        setLoading(false);
        return;
      }

      let sceneData: Record<string, unknown> | null = null;

      if (excalidrawSceneJson && Object.keys(excalidrawSceneJson).length > 0) {
        sceneData = excalidrawSceneJson as Record<string, unknown>;
      } else if (excalidrawUrl) {
        // Fetch via our server-side proxy (bypasses CORS and IPv6 DNS issues)
        sceneData = await getExcalidrawScene<Record<string, unknown>>(excalidrawUrl);
      }

      if (sceneData && Object.keys(sceneData).length > 0) {
        // Extract elements/appState/files for the Excalidraw component's initialData
        const rawBgColor = (sceneData.appState as Record<string, unknown>)?.viewBackgroundColor as string | undefined;
        const viewBackgroundColor = rawBgColor ?? '#121212';

        const initialData = {
          elements: sceneData.elements ?? [],
          appState: {
            ...(sceneData.appState ?? {}),
            viewBackgroundColor,
            theme: 'dark',
            gridModeEnabled: true,
            zenModeEnabled: true,
          },
          files: sceneData.files ?? {},
        };

        const elements = initialData.elements as unknown[];
        console.log('[ExcalidrawResourceViewer] Data extracted:', {
          elementCount: elements?.length ?? 0,
          hasAppState: !!initialData.appState && Object.keys(initialData.appState as object).length > 0,
          hasFiles: !!initialData.files && Object.keys(initialData.files as object).length > 0,
          firstElement: elements?.[0] ? JSON.stringify(elements[0]).substring(0, 200) : null,
        });

        setExcalidrawData(initialData);
        setLoading(false);
        return;
      }

      throw new Error(
        'No whiteboard data found. Please check that a valid Excalidraw URL is provided.',
      );
    } catch (err) {
      console.error('[ExcalidrawResourceViewer] Error:', err);
      if (isReadonlyExcalidrawUrl(excalidrawUrl)) {
        setReadonlyFallbackUrl(excalidrawUrl);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load whiteboard');
    } finally {
      setLoading(false);
    }
  }, [excalidrawUrl, excalidrawSceneJson]);

  useEffect(() => {
    loadScene();
  }, [loadScene]);

  useEffect(() => {
    if (!loading && excalidrawData && excalidrawApi) {
      try {
        const elements = (excalidrawData as { elements: unknown[] }).elements;
        if (Array.isArray(elements) && elements.length > 0) {
          excalidrawApi.scrollToContent(elements, { fitToContent: true, animate: false });
        }
      } catch {
        // scrollToContent may fire before scene is fully committed
      }
    }
  }, [loading, excalidrawData, excalidrawApi]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <div className="animate-spin"><Loader2 className="size-8 text-primary/30 mb-3" /></div>
        <p className="text-sm text-muted-foreground">Loading whiteboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="size-5 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Unable to load whiteboard</p>
        <p className="text-xs text-muted-foreground max-w-md mb-4">{error}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={loadScene}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            <RotateCcw className="size-3" aria-hidden />
            Retry
          </button>
          {excalidrawUrl && (
            <a
              href={excalidrawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <ExternalLink className="size-3" aria-hidden />
              Open in Excalidraw
            </a>
          )}
        </div>
      </div>
    );
  }

  if (readonlyFallbackUrl) {
    return (
      <div className="relative h-full w-full bg-background">
        <iframe
          src={readonlyFallbackUrl}
          title={title}
          className="h-full w-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <div className="h-full w-full">
        <ExcalidrawComponent
          theme="dark"
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
            setExcalidrawApi(api);
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialData={excalidrawData as any}
          viewModeEnabled={true}
          zenModeEnabled={true}
          gridModeEnabled={true}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: true,
              saveAsImage: false,
            },
          }}
          aria-label={title}
        />
      </div>
    </div>
  );
}
