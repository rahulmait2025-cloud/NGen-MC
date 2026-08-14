import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { 
  Video, 
  AlertCircle,
  Edit3
} from 'lucide-react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCoursePillarById } from '@/lib/services/master-course-pillars';
import { getCourseInPillar, getModuleInCourse, listModulesForCourse } from '@/lib/services/master-courses';
import { listVideosForModule } from '@/lib/services/video-assets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ModuleVideosClient } from '@/components/master-courses/module-videos-client';
import { ModuleVideoAssetsTable } from '@/components/master-courses/module-video-assets-table';
import { CreateModuleDialog } from '@/components/master-courses/create-module-dialog';

function publishStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Published</Badge>;
    case 'unpublished':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">Unpublished</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

export default async function ModuleVideosPage({
  params 
}: { 
  params: Promise<{ pillarId: string; courseId: string; moduleId: string }> 
}): Promise<ReactNode> {
  const { pillarId, courseId, moduleId } = await params;

  const [_auth, [pillar, course, foundModule], [videos, modules]] = await Promise.all([
    getSessionFromHeaders(),
    Promise.all([
      getMasterCoursePillarById(pillarId),
      getCourseInPillar(pillarId, courseId),
      getModuleInCourse(pillarId, courseId, moduleId),
    ]),
    Promise.all([
      listVideosForModule(pillarId, courseId, moduleId),
      listModulesForCourse(pillarId, courseId),
    ]),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  if (!pillar || !course || !foundModule) {
    notFound();
  }
  const moduleOrdinal = modules.findIndex((m) => m.id === moduleId);
  const isFolderReady = foundModule.tp_folder_status === 'created' && !!foundModule.tp_folder_uuid;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{foundModule.title}</h1>
              <CreateModuleDialog
                context="pillar"
                pillarId={pillarId}
                courseId={courseId}
                module={foundModule}
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Edit3 className="size-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                }
              />
              {publishStatusBadge(foundModule.publish_status)}
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span className="font-medium text-primary">{pillar.title}</span>
              <Separator orientation="vertical" className="h-3" />
              <span className="font-medium text-primary">{course.title}</span>
              <Separator orientation="vertical" className="h-3" />
              <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">
                Module #{moduleOrdinal >= 0 ? moduleOrdinal : foundModule.sort_order}
              </code>
            </div>
          </div>
        </div>
        <ModuleVideosClient 
          pillarId={pillarId}
          courseId={courseId}
          moduleId={moduleId}
          folderUuid={foundModule.tp_folder_uuid}
          modules={modules}
        />
      </div>

      <div className="space-y-6 max-w-4xl">
        <Card className="border-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/[0.02] border-b py-4">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Video className="size-5" />
              Module Video Library
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              Manage and organize video assets synchronized with the TPStreams module directory.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!isFolderReady && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="size-6 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 text-base">Module Directory Not Ready</h4>
                    <p className="text-sm text-amber-800 mt-1 font-medium leading-relaxed">
                      This module requires a primary TPStreams directory before video ingestion can begin. Please initiate a synchronization from the course dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {videos.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border/60 rounded-2xl bg-muted/20">
                <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
                  <Video className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-foreground">Empty Repository</h3>
                  <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                    {isFolderReady 
                      ? 'No videos found in this module. Start by uploading or syncing your first asset.'
                      : 'Sync the module hierarchy to enable video asset management.'}
                  </p>
                </div>
              </div>
            ) : (
              <ModuleVideoAssetsTable
                videos={videos}
              />
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
