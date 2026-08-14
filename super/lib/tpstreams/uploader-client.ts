/**
 * TPStreams Uploader Client Utility.
 * 
 * Handles dynamic loading of the TPStreams Uploader SDK script.
 */

import { TpStreamsUploaderInstance } from './types';

declare global {
  interface Window {
    TpStreamsUploaderSDK?: new (
      authToken: string,
      orgId: string,
      config?: {
        generateSubtitle?: boolean;
        contentProtectionType?: 'drm' | 'aes' | 'disable' | 'disabled';
        resolutions?: string[];
      },
    ) => TpStreamsUploaderInstance;
  }
}

let tpUploaderScriptPromise: Promise<void> | null = null;

export function loadTpUploaderScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('TPStreams uploader can only be loaded in browser'));
  }

  if (window.TpStreamsUploaderSDK) {
    return Promise.resolve();
  }

  if (tpUploaderScriptPromise) {
    return tpUploaderScriptPromise;
  }

  tpUploaderScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-tpstreams-uploader-sdk="true"]',
    );

    if (existingScript) {
      if (window.TpStreamsUploaderSDK) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load TPStreams uploader SDK')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://static.testpress.in/static/js/tpstreams-uploader.min.js';
    script.async = true;
    script.dataset.tpstreamsUploaderSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TPStreams uploader SDK'));
    document.body.appendChild(script);
  }).catch((error) => {
    tpUploaderScriptPromise = null;
    throw error;
  });

  return tpUploaderScriptPromise;
}
