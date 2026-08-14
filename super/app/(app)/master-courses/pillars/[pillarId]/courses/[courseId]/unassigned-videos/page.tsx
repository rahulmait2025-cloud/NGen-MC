import Link from 'next/link';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { 
  Video, 
  Layers,
  Clock, 
  Play
} from 'lucide-react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCoursePillarById } from '@/lib/services/master-course-pillars';
import { getCourseInPillar } from '@/lib/services/master-courses';
import { listVideoAssetsByCourse } from '@/lib/services/video-assets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { VideoDeleteAction } from '@/components/master-courses/video-delete-action';
import { getVideoDeleteImpact } from '@/lib/services/master-course-delete';

export default async function UnassignedVideosPage({ 
  params 
}: { 
  params: Promise<{ pillarId: string; courseId: string }> 
}): Promise<ReactNode> {
  const { pillarId, courseId } = await params;

  const [_auth, pillar, course] = await Promise.all([
    getSessionFromHeaders(),
    getMasterCoursePillarById(pillarId),
    getCourseInPillar(pillarId, courseId),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  if (!pillar || !course) {
    notFound();
  }

  const allVideos = await listVideoAssetsByCourse(courseId);
  // Unassigned = no module link
  const videos = allVideos.filter(v => !v.master_course_module_id);

  const videoImpacts = new Map(
    await Promise.all(
      videos.map(async (video) => [video.id, await getVideoDeleteImpact(video.id)] as const),
    ),
  );

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-12">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Extra Videos (Unassigned)</h1>
            <Badge className="bg-primary text-white">{videos.length} Total</Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span className="font-medium text-primary">{pillar.title}</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="font-medium text-primary">{course.title}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-2 border-dashed border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Layers className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Unassigned Video Pool</CardTitle>
                <CardDescription>
                  These videos are uploaded to the course folder but are not assigned to any module. 
                  They will not be visible to students until assigned.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                <Video className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No unassigned videos found</h3>
                <p className="text-sm text-muted-foreground mt-1">All videos in this course are currently assigned to modules.</p>
                <Button variant="outline" className="mt-6" asChild>
                   <Link href={`/master-courses/pillars/${pillarId}/courses/${courseId}`}>
                      Back to Course
                   </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-[border-color,box-shadow] duration-200"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="relative h-20 w-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden shadow-inner border">
                        {video.thumbnail_url ? (
                          <Image 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            fill
                            sizes="128px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                             <Video className="size-8 text-muted-foreground/40" />
                             <span className="text-[10px] text-muted-foreground font-semibold uppercase">No Preview</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                           <div className="size-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <Play className="size-4 text-primary fill-primary ml-0.5" />
                           </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold truncate">{video.title}</span>
                          <ProcessingStatusBadge status={video.processing_status} />
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                              <Clock className="size-3" />
                              <span>{formatDuration(video.duration_seconds)}</span>
                           </div>
                           {video.resolutions && (
                             <div className="flex gap-1">
                                {video.resolutions.slice(0, 3).map(res => (
                                   <Badge key={res} variant="outline" className="text-[10px] h-4 px-1">{res}</Badge>
                                ))}
                             </div>
                           )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          TPStreams ID: {video.tp_asset_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <VideoDeleteAction
                        pillarId={pillarId}
                        courseId={courseId}
                        moduleId={""}
                        videoId={video.id}
                        videoTitle={video.title}
                        impact={videoImpacts.get(video.id)!}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProcessingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Ready</Badge>;
    case 'processing':
    case 'queued':
      return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 animate-pulse">Processing</Badge>;
    case 'error':
      return <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">Error</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground bg-muted/50">Pending</Badge>;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
