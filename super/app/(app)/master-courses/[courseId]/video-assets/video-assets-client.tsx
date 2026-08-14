'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getTpUploaderTokenAction,
  registerDirectTpUploadAction,
} from './actions';
import { getModuleUploadConfigAction } from '@/app/(app)/master-courses/actions';
import { AssetManager } from '@/components/admin/asset-manager';
import { TpStreamsLocalUploadPanel } from '@/components/admin/tpstreams-local-upload-panel';
import type { MasterCourseModulesRow, VideoAssetsRow } from '@/types/database';

export function VideoAssetsClient({
  courseId,
  course,
  modules,
  initialVideoAssets,
  syncButton,
}: {
  courseId: string;
  course: {
    id: string;
    title: string;
    code: string;
    tp_folder_uuid: string | null;
    pillar_id?: string | null;
  };
  modules: MasterCourseModulesRow[];
  initialVideoAssets: VideoAssetsRow[];
  syncButton?: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href={`/master-courses/${courseId}`}>
              <ArrowLeft className="size-4 mr-1" /> Back to Course
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Manage Video Assets</h1>
            <p className="text-sm text-muted-foreground">
              {course.tp_folder_uuid
                ? `Syncing from folder: ${course.tp_folder_uuid}`
                : 'TPStreams folder missing'}{' '}
              for <strong>{course.title}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">{syncButton}</div>
      </div>

      {!course.tp_folder_uuid && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive font-medium flex items-center gap-2">
              <AlertCircle className="size-4" />
              This course does not have a TPStreams folder yet.
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              Videos cannot be uploaded until the folder is created. Click the button above to initialize.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-200 bg-amber-50/70">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-amber-900">Legacy course-level uploads</p>
          <p className="mt-1 text-xs text-amber-800">
            New uploads should be managed inside course modules.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Existing Assets</h2>
          <Badge variant="outline">{initialVideoAssets.length} Assets</Badge>
        </div>
        <AssetManager assets={initialVideoAssets} onRefresh={() => router.refresh()} />
      </div>

      <Separator />

      <TpStreamsLocalUploadPanel
        courseId={courseId}
        tpFolderUuid={course.tp_folder_uuid}
        modules={modules}
        cancelHref={`/master-courses/${courseId}`}
        uploadDisabled={!course.tp_folder_uuid}
        fetchUploaderToken={() => getTpUploaderTokenAction()}
        fetchModuleUploadConfig={async (moduleId) => {
          const formData = new FormData();
          formData.append('course_id', courseId);
          formData.append('module_id', moduleId);
          if (course.pillar_id) {
            formData.append('pillar_id', course.pillar_id);
          } else {
            formData.append('pillar_id', 'unknown_pillar');
          }
          const result = await getModuleUploadConfigAction(formData);
          return {
            ok: result.ok,
            folderUuid: result.folderUuid,
            error: result.error,
          };
        }}
        registerUpload={async (payload) => {
          const result = await registerDirectTpUploadAction({
            master_course_id: courseId,
            master_course_module_id: payload.moduleId,
            tp_asset_id: payload.tpAssetId,
            title: payload.title,
            description: payload.description,
            sort_order: payload.sortOrder,
            content_protection_type: payload.protection,
          });
          return { ok: result.ok, error: result.error };
        }}
        onUploadFinished={() => router.refresh()}
      />
    </div>
  );
}
