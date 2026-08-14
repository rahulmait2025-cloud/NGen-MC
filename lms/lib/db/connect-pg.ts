import pg from 'pg';

function decodePassword(password: string): string {
  try {
    return decodeURIComponent(password);
  } catch {
    return password;
  }
}

/** Project ref from `db.<ref>.supabase.co` or `https://<ref>.supabase.co`. */
function getSupabaseProjectRef(): string | null {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const host = new URL(dbUrl).hostname;
      const fromDbHost = host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
      if (fromDbHost) return fromDbHost;
    } catch {
      /* ignore */
    }
  }

  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (publicUrl) {
    try {
      const host = new URL(publicUrl).hostname;
      const fromPublic = host.match(/^([^.]+)\.supabase\.co$/)?.[1];
      if (fromPublic) return fromPublic;
    } catch {
      /* ignore */
    }
  }

  return null;
}

function buildPoolerConnectionString(
  directUrl: string,
  options?: { region?: string; host?: string; port?: number },
): string | null {
  try {
    const u = new URL(directUrl);
    const projectRef =
      u.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? getSupabaseProjectRef();
    if (!projectRef) return null;

    const region =
      options?.region?.trim() ||
      process.env.SUPABASE_POOLER_REGION?.trim() ||
      'ap-south-1';
    const poolerHost =
      options?.host?.trim() ||
      process.env.SUPABASE_POOLER_HOST?.trim() ||
      `aws-0-${region}.pooler.supabase.com`;
    const port = options?.port ?? 6543;
    const password = encodeURIComponent(decodePassword(u.password));

    return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:${port}/postgres`;
  } catch {
    return null;
  }
}

function getPgConnectionCandidates(): string[] {
  const direct = process.env.DATABASE_URL?.trim();
  if (!direct) return [];

  const candidates = [direct];
  const pooler = buildPoolerConnectionString(direct);
  if (pooler) candidates.push(pooler);

  const sessionPooler = buildPoolerConnectionString(direct, { port: 5432 });
  if (sessionPooler && sessionPooler !== pooler) candidates.push(sessionPooler);

  return [...new Set(candidates)];
}

/** Connect using DATABASE_URL, falling back to Supabase pooler (IPv4). */
export async function connectPg(): Promise<pg.Client> {
  const candidates = getPgConnectionCandidates();
  if (candidates.length === 0) {
    throw new Error('DATABASE_URL is not set');
  }

  // Sequential: fallback connection attempts — try direct URL first, then pooler variants one at a time
  let lastError: unknown;
  for (const connectionString of candidates) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
