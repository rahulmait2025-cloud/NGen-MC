import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Lecture completion is not persisted for global courses yet (410).',
    },
    { status: 410 }
  );
}
