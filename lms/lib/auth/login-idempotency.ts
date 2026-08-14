const TTL_MS = 30_000;
const MAX_ENTRIES = 500;

type CachedLogin = {
  status: number;
  body: Record<string, unknown>;
  deviceId: string;
  at: number;
};

const cache = new Map<string, CachedLogin>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.at > TTL_MS) cache.delete(key);
  }
  if (cache.size <= MAX_ENTRIES) return;
  const sorted = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
  for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) {
    cache.delete(sorted[i][0]);
  }
}

export function getCachedPasswordLogin(
  email: string,
  attemptId: string | null,
): CachedLogin | null {
  if (!attemptId) return null;
  pruneExpired();
  const key = `${email}:${attemptId}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCachedPasswordLogin(
  email: string,
  attemptId: string | null,
  result: CachedLogin,
): void {
  if (!attemptId) return;
  pruneExpired();
  cache.set(`${email}:${attemptId}`, result);
}
