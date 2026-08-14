import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, FileImage } from 'lucide-react';
import { requireStudent } from '@/lib/auth/require-student';
import { getNoteCollectionBySlug, getNoteModuleBySlug } from '@/lib/services/note-catalog';
import { resolveStudentNoteAccess } from '@/lib/services/student-note-access';
import { NoteModuleViewer } from './_components/note-module-viewer';

interface ModulePageProps {
  params: Promise<{ collegeSlug: string; slug: string; moduleSlug: string }>;
}

export default async function NoteModulePage({
  params,
}: ModulePageProps): Promise<ReactNode> {
  const { collegeSlug, slug, moduleSlug } = await params;
  const ctx = await requireStudent(collegeSlug);
  const { studentId, isGlobal } = ctx;

  const collection = await getNoteCollectionBySlug(slug);
  if (!collection) notFound();

  const access = await resolveStudentNoteAccess(studentId, collection.id, isGlobal);
  if (!access.hasAccess) {
    redirect(`/c/${collegeSlug}/student/notes/${slug}`);
  }

  const module_ = await getNoteModuleBySlug(collection.id, moduleSlug);
  if (!module_) notFound();

  const pageCount = module_.pages.length;

  const breadcrumbAndHeader = (
    <div className="space-y-5">
      {/* Breadcrumb — back to collection only */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
        <Link
          href={`/c/${collegeSlug}/student/notes/${slug}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-md"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span className="truncate max-w-[160px]">{collection.title}</span>
        </Link>
      </nav>

      {/* Module header */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-4" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground text-wrap balance">
            {module_.title}
          </h1>
        </div>
        {module_.description_md && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg pl-[2.9rem]">
            {module_.description_md}
          </p>
        )}
        {pageCount > 0 && (
          <p className="text-xs text-muted-foreground pl-[2.9rem]">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'} to study
          </p>
        )}
      </header>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28">
      {/* Pages */}
      {pageCount === 0 ? (
        <div className="space-y-6">
          {breadcrumbAndHeader}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/50">
              <FileImage className="size-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">No pages published yet</p>
            <p className="mt-1.5 max-w-[260px] text-xs text-muted-foreground">
              This module has no pages published yet. Check back soon.
            </p>
          </div>
        </div>
      ) : (
        <NoteModuleViewer
          pages={module_.pages}
          collegeSlug={collegeSlug}
          moduleName={module_.title}
          modules={collection.modules}
          currentModuleSlug={moduleSlug}
          collectionSlug={slug}
          header={breadcrumbAndHeader}
        />
      )}
    </div>
  );
}