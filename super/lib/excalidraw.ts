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

function splitBuffers(buffer: ArrayBuffer): ArrayBuffer[] {
  const view = new DataView(buffer);
  const chunks: ArrayBuffer[] = [];
  let offset = 0;

  while (offset < buffer.byteLength) {
    const version = view.getUint32(offset, false);
    offset += 4;
    const length = view.getUint32(offset, false);
    offset += 4;
    chunks.push(buffer.slice(offset, offset + length));
    offset += length;
    if (offset < buffer.byteLength && version === 1) {
      offset += 1;
    }
  }

  return chunks;
}

async function inflateData(compressed: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(new Uint8Array(compressed));
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result.buffer;
  }

  throw new Error('DecompressionStream not supported in this browser');
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
    'Invalid Excalidraw URL format. Use either https://excalidraw.com/#json=<sceneId>,<key> or https://link.excalidraw.com/readonly/<id>.',
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

function normalizeSceneData(scene: ExcalidrawSceneData): Record<string, unknown> {
  return {
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    appState: scene.appState && typeof scene.appState === 'object' ? scene.appState : {},
    files: scene.files && typeof scene.files === 'object' ? scene.files : {},
  };
}

function extractReadonlySceneFromHtml(html: string): Record<string, unknown> {
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

async function fetchReadonlyScene(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Excalidraw readonly page (HTTP ${response.status})`);
  }

  return extractReadonlySceneFromHtml(await response.text());
}

export async function fetchExcalidrawSceneFromUrl(url: string): Promise<Record<string, unknown>> {
  const source = parseExcalidrawUrl(url);

  if (source.kind === 'readonly') {
    return fetchReadonlyScene(source.url);
  }

  const { sceneId, encryptionKey } = source;

  const response = await fetch(`https://json.excalidraw.com/api/v2/${sceneId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scene from Excalidraw (HTTP ${response.status})`);
  }

  const encryptedBuffer = await response.arrayBuffer();

  const chunks = splitBuffers(encryptedBuffer);
  if (chunks.length < 3) {
    throw new Error('Unexpected response format from Excalidraw API');
  }

  const iv = new Uint8Array(chunks[1]);
  const encryptedData = chunks[2];

  const keyData = {
    k: encryptionKey,
    alg: 'A128GCM',
    ext: true,
    kty: 'oct',
    key_ops: ['decrypt'],
  };

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: 'AES-GCM', length: 128 },
    false,
    ['decrypt'],
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedData,
  );

  const decryptedChunks = splitBuffers(decryptedBuffer);
  const compressedData = decryptedChunks[decryptedChunks.length - 1];

  const decompressed = await inflateData(compressedData);

  const jsonString = new TextDecoder().decode(decompressed);
  const data = JSON.parse(jsonString);

  return data;
}
