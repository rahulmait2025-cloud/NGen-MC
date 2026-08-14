import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectPg } from '@/lib/db/connect-pg';

/**
 * @deprecated This route references legacy migration filenames and should
 * not be used in production. Video analytics migrations are managed via
 * SuperAdmin's supabase/migrations/ directory. This route is kept only
 * for backward compatibility with environments that may still call it.
 *
 * Blocked in production: set ENABLE_MIGRATE_ROUTE=true to override.
 */
const MIGRATION_FILES = [
  '00161_video_analytics.sql',
  '00060_profile_avatar.sql',
  '00061_student_daily_streak.sql',
];

const MIGRATION_SQL: Record<string, string> = {};
for (const file of MIGRATION_FILES) {
  const sqlPath = path.join(process.cwd(), 'supabase/migrations', file);
  if (fs.existsSync(sqlPath)) {
    MIGRATION_SQL[file] = fs.readFileSync(sqlPath, 'utf8');
  }
}

export async function GET() {
  try {
    // Safety: block in production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MIGRATE_ROUTE !== 'true') {
      return NextResponse.json(
        {
          ok: false,
          error: 'This endpoint is disabled in production. Video analytics migrations are managed via SuperAdmin.',
        },
        { status: 403 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, error: 'No DATABASE_URL' }, { status: 500 });
    }

    const client = await connectPg();

    // Updated migration list: 00059 was renumbered to 00161 in SuperAdmin.
    // Only include migrations that actually exist in this project's supabase/migrations/.

    const applied: string[] = [];
    const skipped: string[] = [];
    for (const file of MIGRATION_FILES) {
      const sql = MIGRATION_SQL[file];
      if (!sql) {
        skipped.push(file);
        continue;
      }
      await client.query(sql);
      applied.push(file);
    }

    await client.end();

    return NextResponse.json({
      ok: true,
      message: 'Migrations executed.',
      applied,
      skipped,
      note: 'Video analytics migrations should be run from SuperAdmin. This endpoint is deprecated.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint:
          'Video analytics migrations are now managed via SuperAdmin. Use the Supabase dashboard or SuperAdmin CLI instead.',
      },
      { status: 500 },
    );
  }
}
