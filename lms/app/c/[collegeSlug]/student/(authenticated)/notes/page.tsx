import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireStudent } from '@/lib/auth/require-student';
import { getStudentNoteCollections } from '@/lib/services/note-catalog';
import { resolveStudentNoteAccessBatch } from '@/lib/services/student-note-access';
import { NotesCatalogView } from './_components/notes-catalog-view';

interface NotesPageProps {
  params: Promise<{ collegeSlug: string }>;
}

function NotesSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function NotesContent({ collegeSlug }: { collegeSlug: string }) {
  const ctx = await requireStudent(collegeSlug);
  const { studentId, isGlobal } = ctx;
  const collections = await getStudentNoteCollections(studentId, isGlobal);
  const collectionIds = collections.map((c) => c.id);
  const accessMap = collectionIds.length > 0
    ? await resolveStudentNoteAccessBatch(studentId, collectionIds, isGlobal)
    : new Map();

  const enriched = collections.map((c) => ({
    ...c,
    access: accessMap.get(c.id) ?? { hasAccess: false, source: null, linkedCourseId: null, validUntil: null },
  }));

  return (
    <NotesCatalogView
      collections={enriched}
      collegeSlug={collegeSlug}
    />
  );
}

export default async function NotesPage({ params }: NotesPageProps): Promise<ReactNode> {
  const { collegeSlug } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Suspense fallback={<NotesSkeleton />}>
        <NotesContent collegeSlug={collegeSlug} />
      </Suspense>
    </div>
  );
}
