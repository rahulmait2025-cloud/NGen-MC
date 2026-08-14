'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AssetManager } from '@/components/admin/asset-manager';
import { TpStreamsLocalUploadPanel } from '@/components/admin/tpstreams-local-upload-panel';
import {
  getFreeCourseTpUploaderTokenAction,
  getFreeCourseModuleUploadConfigAction,
  registerFreeCourseDirectTpUploadAction,
} from './actions';
import { FreeCourseSyncButton } from './free-course-sync-button';
import type { MasterCourseModulesRow, VideoAssetsRow } from '@/types/database';

interface FreeCourseTpstreamsUploadClientProps {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  tpFolderUuid?: string | null;
  tpFolderProvisionError?: string | null;
  modules?: MasterCourseModulesRow[];
  initialVideoAssets?: VideoAssetsRow[];
}

const EMPTY_MODULES: never[] = [];
const EMPTY_VIDEO_ASSETS: never[] = [];

export function FreeCourseTpstreamsUploadClient({
  courseId,
  courseTitle,
  courseCode,
  tpFolderUuid: tpFolderUuidProp,
  tpFolderProvisionError,
  modules = EMPTY_MODULES,
  initialVideoAssets = EMPTY_VIDEO_ASSETS,
}: FreeCourseTpstreamsUploadClientProps) {
  const router = useRouter();
  const tpFolderUuid = tpFolderUuidProp ?? null;
  const hasTpFolder = Boolean(tpFolderUuid);
  const defaultModuleId = modules[0]?.id;
  const assets = initialVideoAssets ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/free-courses/${courseId}`}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Builder
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Video className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Add Premium Lectures</h1>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Free Course
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Upload platform-only TPStreams lectures using the same uploader flow as Master Courses.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {courseTitle} · {courseCode}
            {tpFolderUuid ? (
              <span className="block mt-1">TP folder: {tpFolderUuid}</span>
            ) : hasTpFolder ? (
              <span className="block mt-1 text-emerald-700">TPStreams folder ready</span>
            ) : (
              <span className="block mt-1 text-amber-700">TPStreams folder will be created on first upload</span>
            )}
          </p>
        </div>
        <FreeCourseSyncButton courseId={courseId} disabled={!hasTpFolder} />
      </div>

      {tpFolderProvisionError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="size-4" />
              {tpFolderProvisionError}
            </p>
          </CardContent>
        </Card>
      )}

      {!hasTpFolder && !tpFolderProvisionError && modules.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-amber-900 flex items-center gap-2">
              <AlertCircle className="size-4" />
              TPStreams course folder not created yet
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Folder name: <span className="font-mono">Free-Course_{courseTitle}</span>. Start upload or sync to provision it.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Existing Assets</h2>
          <Badge variant="outline">{assets.length} Assets</Badge>
        </div>
        <AssetManager assets={assets} onRefresh={() => router.refresh()} />
      </div>

      <Separator />

      {modules.length === 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            This free course has no modules. Add a module in the builder before uploading premium lectures.
          </CardContent>
        </Card>
      )}

      <TpStreamsLocalUploadPanel
        courseId={courseId}
        tpFolderUuid={tpFolderUuid}
        modules={modules}
        defaultModuleId={defaultModuleId}
        cancelHref={`/free-courses/${courseId}`}
        cancelLabel="Back to Builder"
        uploadDisabled={modules.length === 0 || Boolean(tpFolderProvisionError)}
        prepareFoldersOnUpload={!hasTpFolder && !tpFolderProvisionError}
        fetchUploaderToken={() => getFreeCourseTpUploaderTokenAction(courseId)}
        fetchModuleUploadConfig={(moduleId) =>
          getFreeCourseModuleUploadConfigAction(courseId, moduleId)
        }
        registerUpload={(payload) =>
          registerFreeCourseDirectTpUploadAction({
            courseId,
            moduleId: payload.moduleId,
            tpAssetId: payload.tpAssetId,
            title: payload.title,
            description: payload.description,
            sortOrder: payload.sortOrder,
            contentProtectionType: payload.protection,
            generateSubtitles: payload.generateSubtitles,
            resolutions: payload.resolutions,
          }).then((result) => ({
            ok: result.ok,
            error: result.ok ? undefined : result.error,
          }))
        }
        onUploadFinished={() => router.refresh()}
      />
    </div>
  );
}
