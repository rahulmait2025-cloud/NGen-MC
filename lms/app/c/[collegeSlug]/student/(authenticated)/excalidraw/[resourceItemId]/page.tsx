import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';

import { requireStudent } from '@/lib/auth/require-student';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateStudentCourseAccess } from '@/lib/services/student-entitlements';
import { ExcalidrawResourceViewer } from '@/components/student/excalidraw-resource-viewer';

interface ExcalidrawPageProps {
  params: Promise<{ collegeSlug: string; resourceItemId: string }>;
  searchParams: Promise<{ courseId?: string }>;
}

export default async function ExcalidrawPage({
  params,
  searchParams,
}: ExcalidrawPageProps): Promise<ReactNode> {
  const [{ collegeSlug, resourceItemId }, { courseId: queryCourseId }] = await Promise.all([
    params,
    searchParams,
  ]);

  if (queryCourseId) {
    redirect(`/c/${collegeSlug}/student/excalidraw/${resourceItemId}`);
  }

  const sb = createAdminClient();

  // 1. Load resource item + parent section
  const [ctx, { data: resourceItem, error: itemError }] = await Promise.all([
    requireStudent(collegeSlug),
    sb
      .from('course_resource_items')
      .select(`
        id,
        kind,
        title,
        excalidraw_url,
        excalidraw_scene_json,
        course_resource_sections!inner (
          id,
          course_id,
          scope_type,
          module_id,
          item_id,
          visibility,
          title
        )
      `)
      .eq('id', resourceItemId)
      .eq('kind', 'excalidraw_link')
      .single(),
  ]);
  const { studentId, isGlobal } = ctx;

  if (itemError || !resourceItem) {
    notFound();
  }

  // Check if the Excalidraw resource is visible
  if ((resourceItem as { is_visible?: boolean }).is_visible === false) {
    notFound();
  }

  const section = resourceItem.course_resource_sections as unknown as {
    id: string;
    course_id: string | null;
    scope_type: string | null;
    module_id: string | null;
    item_id: string | null;
    visibility: string;
    title: string;
  };

  if (!section) {
    notFound();
  }

  // 2. Resolve the course ID for access checking
  let resolvedCourseId: string | null = section.course_id;

  // For global sections (course_id is null), require courseId from query params
  if (!resolvedCourseId) {
    if (section.visibility !== 'global' || !queryCourseId) {
      notFound();
    }
    resolvedCourseId = queryCourseId;
  }

  // 3. Validate student has active access to the course
  const entitlement = await validateStudentCourseAccess(studentId, resolvedCourseId, isGlobal);
  if (!entitlement) {
    notFound();
  }

  // 4. For module/item scoped sections, verify ownership belongs to this course
  const [moduleCheck, itemCheck] = await Promise.all([
    section.module_id
      ? sb
          .from('master_course_modules')
          .select('id')
          .eq('id', section.module_id)
          .eq('master_course_id', resolvedCourseId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    section.item_id
      ? sb
          .from('master_course_items')
          .select('id')
          .eq('id', section.item_id)
          .eq('master_course_id', resolvedCourseId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (section.module_id && !moduleCheck.data) {
    notFound();
  }

  if (section.item_id && !itemCheck.data) {
    notFound();
  }

  // 5. Resolve scene JSON — must be stored in DB (excalidraw_scene_json column)
  const resolvedSceneJson = resourceItem.excalidraw_scene_json as Record<string, unknown> | null;
  const excalidrawUrl = resourceItem.excalidraw_url as string | null;

  console.log('[ExcalidrawPage] Resource state:', {
    resourceId: resourceItem.id,
    excalidrawUrl,
    hasSceneJson: !!resolvedSceneJson,
    sceneJsonKeys: resolvedSceneJson ? Object.keys(resolvedSceneJson).length : 0,
    elementCount: Array.isArray(resolvedSceneJson?.elements) ? resolvedSceneJson.elements.length : 0,
    hasAppState: !!resolvedSceneJson?.appState,
    sceneJsonPreview: resolvedSceneJson ? JSON.stringify(resolvedSceneJson).substring(0, 200) : null,
  });

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 bg-background px-4 py-3">
        <h1 className="text-sm font-semibold text-foreground truncate">
          {resourceItem.title}
        </h1>
      </div>

      {/* Excalidraw viewer — editable, local-only */}
      <div className="flex-1 min-h-0">
        <ExcalidrawResourceViewer
          excalidrawUrl={excalidrawUrl}
          excalidrawSceneJson={resolvedSceneJson}
          title={resourceItem.title as string}
        />
      </div>
    </div>
  );
}
