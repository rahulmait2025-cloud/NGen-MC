import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { inflate } from 'zlib';
import { promisify } from 'util';
import { getCurrentUser } from '@/lib/tenant/get-tenant';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';

const inflateAsync = promisify(inflate);
const EXCALIDRAW_SCENE_HOST = 'json.excalidraw.com';
const EXCALIDRAW_APP_HOSTS = new Set(['excalidraw.com', 'www.excalidraw.com']);
const EXCALIDRAW_LINK_HOST = 'link.excalidraw.com';

type ExcalidrawSceneSource =
  | { kind: 'encrypted'; sceneId: string; encryptionKey: string }
  | { kind: 'readonly'; url: string };

interface ExcalidrawSceneData {
  elements?: unknown[];
  appState?: Record<string, unknown> | null;
  files?: Record<string, unknown> | null;
  [key: string]: unknown;
}

interface DnsOverHttpsAnswer {
  type: number;
  data: string;
}

interface DnsOverHttpsResponse {
  Answer?: DnsOverHttpsAnswer[];
}

// ─── Binary helpers ────────────────────────────────────────────────────────

/**
 * Parse Excalidraw's concatBuffers binary format.
 *
 * Format: [VERSION (4B)] [LENGTH (4B)] [DATA ...] [LENGTH (4B)] [DATA ...] ...
 *
 * Uses DataView.getUint32 for correct unsigned reads (avoids JS bitwise
 * sign-extension bugs that cause infinite loops on large buffers).
 */
function splitBuffers(buffer: ArrayBuffer): ArrayBuffer[] {
  const view = new DataView(buffer);
  const chunks: ArrayBuffer[] = [];
  let cursor = 0;

  // 4-byte version
  cursor += 4;

  while (cursor < buffer.byteLength) {
    const chunkSize = view.getUint32(cursor, false);
    cursor += 4;
    chunks.push(buffer.slice(cursor, cursor + chunkSize));
    cursor += chunkSize;
  }

  return chunks;
}

// ─── Fetch with forced IPv4 ────────────────────────────────────────────────

/**
 * Fetch encrypted scene data from json.excalidraw.com using Node's native
 * https module with `family: 4` to force IPv4 DNS resolution.
 *
 * This bypasses:
 *   1. CORS — browser can't fetch json.excalidraw.com from non-excalidraw origins
 *   2. Node.js IPv6 DNS issue — undici fetch tries IPv6 first, hangs or errors
 *      when local network only has IPv4 connectivity
 */
async function resolveIpv4WithDoh(hostname: string): Promise<string> {
  const res = await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
    headers: { accept: 'application/dns-json' },
  });

  if (!res.ok) {
    throw new Error(`DNS-over-HTTPS lookup failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as DnsOverHttpsResponse;
  const address = data.Answer?.find((answer) => answer.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(answer.data))?.data;

  if (!address) {
    throw new Error('DNS-over-HTTPS lookup returned no IPv4 address');
  }

  return address;
}

function requestSceneBuffer(sceneId: string, address?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: address ?? EXCALIDRAW_SCENE_HOST,
        port: 443,
        path: `/api/v2/${sceneId}`,
        method: 'GET',
        ...(address ? { servername: EXCALIDRAW_SCENE_HOST } : { family: 4 }), // force IPv4 when using system DNS
        headers: {
          Host: EXCALIDRAW_SCENE_HOST,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/octet-stream, */*',
          Origin: 'https://excalidraw.com',
          Referer: 'https://excalidraw.com/',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          const errorChunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => errorChunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(errorChunks).toString('utf-8').substring(0, 200);
            reject(new Error(`Excalidraw API returned HTTP ${res.statusCode}: ${body}`));
          });
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      },
    );

    req.setTimeout(15000, () => {
      req.destroy(new Error('Connection to Excalidraw server timed out (15s)'));
    });
    req.on('error', reject);
    req.end();
  });
}

function requestReadonlyPageHtml(url: string, address?: string): Promise<string> {
  const parsedUrl = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: address ?? parsedUrl.hostname,
        port: 443,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: 'GET',
        ...(address ? { servername: parsedUrl.hostname } : { family: 4 }),
        headers: {
          Host: parsedUrl.hostname,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          const errorChunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => errorChunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(errorChunks).toString('utf-8').substring(0, 200);
            reject(new Error(`Excalidraw readonly page returned HTTP ${res.statusCode}: ${body}`));
          });
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      },
    );

    req.setTimeout(15000, () => {
      req.destroy(new Error('Connection to Excalidraw readonly page timed out (15s)'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchSceneBuffer(sceneId: string): Promise<Buffer> {
  try {
    return await requestSceneBuffer(sceneId);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOTFOUND' && code !== 'EAI_AGAIN') {
      throw error;
    }

    const address = await resolveIpv4WithDoh(EXCALIDRAW_SCENE_HOST);
    return requestSceneBuffer(sceneId, address);
  }
}

async function fetchReadonlyPageHtml(url: string): Promise<string> {
  try {
    return await requestReadonlyPageHtml(url);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOTFOUND' && code !== 'EAI_AGAIN') {
      throw error;
    }

    const address = await resolveIpv4WithDoh(EXCALIDRAW_LINK_HOST);
    return requestReadonlyPageHtml(url, address);
  }
}

function parseExcalidrawUrl(rawUrl: string): ExcalidrawSceneSource {
  const parsedUrl = new URL(rawUrl);

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Excalidraw URL must use https.');
  }

  if (parsedUrl.hostname === EXCALIDRAW_LINK_HOST && /^\/readonly\/[^/]+\/?$/.test(parsedUrl.pathname)) {
    return { kind: 'readonly', url: parsedUrl.toString() };
  }

  if (EXCALIDRAW_APP_HOSTS.has(parsedUrl.hostname)) {
    const match = parsedUrl.hash.match(/^#json=([^,]+),(.+)$/);
    if (match) {
      const [, sceneId, encryptionKey] = match;
      return { kind: 'encrypted', sceneId, encryptionKey };
    }
  }

  throw new Error(
    'Invalid Excalidraw URL format. Use either https://excalidraw.com/#json=<id>,<key> or https://link.excalidraw.com/readonly/<id>.',
  );
}

function extractEscapedJsonObjectAfter(html: string, escapedKey: string): string | null {
  const keyIndex = html.indexOf(escapedKey);
  if (keyIndex === -1) return null;

  const objectStart = html.indexOf('{', keyIndex + escapedKey.length);
  if (objectStart === -1) return null;

  let depth = 0;
  let inString = false;

  for (let i = objectStart; i < html.length; i += 1) {
    const char = html[i];
    const nextChar = html[i + 1];

    if (char === '\\' && nextChar === '"') {
      inString = !inString;
      i += 1;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) {
      return html.slice(objectStart, i + 1);
    }
  }

  return null;
}

function parseEscapedJsonObject<T>(escapedJson: string): T {
  return JSON.parse(JSON.parse(`"${escapedJson}"`)) as T;
}

function normalizeSceneData(scene: ExcalidrawSceneData): ExcalidrawSceneData {
  return {
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    appState: scene.appState && typeof scene.appState === 'object' ? scene.appState : {},
    files: scene.files && typeof scene.files === 'object' ? scene.files : {},
  };
}

function extractReadonlySceneFromHtml(html: string): ExcalidrawSceneData {
  const sceneContentsJson = extractEscapedJsonObjectAfter(html, '\\"sceneContents\\":');
  if (sceneContentsJson) {
    const sceneContents = parseEscapedJsonObject<ExcalidrawSceneData>(sceneContentsJson);
    if (Array.isArray(sceneContents.elements)) {
      return normalizeSceneData(sceneContents);
    }
  }

  const sceneStart = html.indexOf('{\\"elements\\"');
  const sceneMetadataStart = html.indexOf(',\\"sceneMetadata\\"', sceneStart);

  if (sceneStart === -1 || sceneMetadataStart === -1) {
    throw new Error('Unable to find embedded scene data in Excalidraw readonly page.');
  }

  const escapedSceneJson = html.slice(sceneStart, sceneMetadataStart);
  const scene = parseEscapedJsonObject<ExcalidrawSceneData>(escapedSceneJson);

  if (!Array.isArray(scene.elements)) {
    throw new Error('Embedded Excalidraw scene is missing elements.');
  }

  return normalizeSceneData(scene);
}

async function fetchReadonlyScene(url: string): Promise<ExcalidrawSceneData> {
  return extractReadonlySceneFromHtml(await fetchReadonlyPageHtml(url));
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ip = getRequestIp(request);

  const limited = await consumeRateLimit({
    key: `excalidraw-scene:${ip}`,
    limit: 30,
    windowMs: 60 * 1000,
    failClosed: true,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!user.isActive) {
    return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
  }

  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing "url" query parameter' }, { status: 400 });
  }

  try {
    const source = parseExcalidrawUrl(url);

    if (source.kind === 'readonly') {
      const data = await fetchReadonlyScene(source.url);

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const { sceneId, encryptionKey } = source;

    // 1. Fetch encrypted binary (forced IPv4)
    const rawBuffer = await fetchSceneBuffer(sceneId);

    // Sanity: reject if response is HTML (Cloudflare challenge)
    const firstBytes = rawBuffer.toString('utf-8', 0, 15).trim().toLowerCase();
    if (firstBytes.startsWith('<!doctype') || firstBytes.startsWith('<html')) {
      return NextResponse.json(
        { error: 'Excalidraw API returned an HTML page instead of binary data.' },
        { status: 502 },
      );
    }

    // 2. Split the binary envelope
    const ab = new Uint8Array(rawBuffer).buffer as ArrayBuffer;
    const chunks = splitBuffers(ab);
    if (chunks.length < 3) {
      return NextResponse.json(
        { error: `Unexpected binary format from Excalidraw API (got ${chunks.length} chunks, expected 3+)` },
        { status: 502 },
      );
    }

    const encodingMeta = JSON.parse(new TextDecoder().decode(chunks[0])) as { compression?: string | null };
    const iv = new Uint8Array(chunks[1]);
    const encryptedData = chunks[2];

    // 3. Decrypt (AES-128-GCM via Web Crypto)
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      {
        k: encryptionKey,
        alg: 'A128GCM',
        ext: true,
        kty: 'oct',
        key_ops: ['decrypt'],
      },
      { name: 'AES-GCM', length: 128 },
      false,
      ['decrypt'],
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedData,
    );

    // 4. Decompress the decrypted envelope, then split metadata + scene data.
    const envelopeBytes = encodingMeta.compression
      ? new Uint8Array(await inflateAsync(Buffer.from(decryptedBuffer)))
      : new Uint8Array(decryptedBuffer);
    const decryptedChunks = splitBuffers(envelopeBytes.buffer as ArrayBuffer);
    const sceneBytes = decryptedChunks[decryptedChunks.length - 1];

    // 5. Parse and return JSON
    const jsonString = new TextDecoder().decode(sceneBytes);
    const data = JSON.parse(jsonString);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[Excalidraw Scene API] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch Excalidraw scene' },
      { status: 500 },
    );
  }
}
