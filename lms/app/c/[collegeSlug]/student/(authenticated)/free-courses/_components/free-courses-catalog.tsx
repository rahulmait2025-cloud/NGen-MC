'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, Play, PlayCircle, Youtube,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { YouTubeThumbnail } from '@/components/student/youtube-thumbnail';
import type { FreeCourseItem } from '../load-free-courses-data';
import { enrollFreeDbCourseAction, unenrollFreeDbCourseAction } from '../actions';
import { useAuthGate } from '@/hooks/use-auth-gate';

interface FreeCatalogSectionProps {
  collegeSlug: string;
  courses: FreeCourseItem[];
  isPending?: boolean;
}

export function FreeCatalogSection({
  collegeSlug,
  courses,
  isPending,
}: FreeCatalogSectionProps) {
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const [enrollingMap, setEnrollingMap] = useState<Record<string, boolean>>({});
  const [unenrollingMap, setUnenrollingMap] = useState<Record<string, boolean>>({});

  const handleEnroll = async (courseId: string) => {
    if (!requireAuth({
      intent: 'Enroll',
      returnTo: typeof window !== 'undefined' ? window.location.href : '',
    })) {
      return;
    }
    setEnrollingMap((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await enrollFreeDbCourseAction(collegeSlug, courseId);
      if (res.ok) {
        toast.success('Enrolled successfully.');
        router.push(`/c/${encodeURIComponent(collegeSlug)}/student/payment-success?courseId=${encodeURIComponent(courseId)}&enrollment=free`);
      } else {
        toast.error(res.error || 'Enrollment failed');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setEnrollingMap((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!requireAuth({
      intent: 'Enroll',
      returnTo: typeof window !== 'undefined' ? window.location.href : '',
    })) {
      return;
    }
    setUnenrollingMap((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await unenrollFreeDbCourseAction(collegeSlug, courseId);
      if (res.ok) {
        toast.success('Unenrolled successfully.');
        router.refresh();
      } else {
        toast.error(res.error || 'Could not unenroll');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setUnenrollingMap((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  if (isPending) {
    return (
      <section id="free-course-catalog" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl landing-heading mb-2">
              Explore Course Catalog
            </h2>
            <p className="text-base text-muted-foreground">
              Loading free courses...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group flex flex-col rounded-3xl overflow-hidden border border-border/60 min-h-[380px] bg-muted/5">
                <div className="aspect-video bg-muted/20 animate-pulse border-b border-border/40" />
                <div className="p-6 flex-1 flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
                    <div className="h-4 w-24 bg-muted/20 animate-pulse rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-muted/20 animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted/20 animate-pulse rounded" />
                  <div className="h-4 w-5/6 bg-muted/20 animate-pulse rounded" />
                  <div className="flex gap-3 pt-4 border-t border-border/30 mt-auto">
                    <div className="h-10 flex-1 bg-muted/20 animate-pulse rounded-xl" />
                    <div className="h-10 flex-1 bg-muted/20 animate-pulse rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="free-course-catalog" className="px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl landing-heading mb-2">
            Explore Course Catalog
          </h2>
          <p className="text-base text-muted-foreground">
            Browse our catalog of free courses below.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border/60 p-16 text-center">
            <Youtube className="mx-auto mb-5 size-12 text-muted-foreground/40" />
            <h3 className="mb-2 text-xl font-bold text-foreground">No courses available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Please check back later for new free courses.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 gsap-stagger-item">
            {courses.map((course) => {
              const learnUrl =
                course.learnHref
                ?? `/c/${encodeURIComponent(collegeSlug)}/student/learn/${encodeURIComponent(course.id)}`;
              return (
                <div key={course.id} className="group flex flex-col rounded-3xl overflow-hidden border border-border/60 transition-colors duration-200">
                  {course.isEnrolled ? (
                    <Link href={learnUrl} className="relative aspect-video bg-muted/40 overflow-hidden border-b border-border/40 block">
                      {course.thumbnail ? (
                        <YouTubeThumbnail src={course.thumbnail} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-card">
                          <Youtube className="size-10 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2 z-10">
                        <Badge className="bg-card/85 backdrop-blur-sm text-primary border border-primary/30 text-[10px] uppercase font-bold tracking-wider">Free</Badge>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="size-12 rounded-full bg-primary flex items-center justify-center">
                           <Play className="size-5 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => handleEnroll(course.id)}
                      className="relative aspect-video bg-muted/40 overflow-hidden border-b border-border/40 block cursor-pointer group w-full text-left"
                    >
                      {course.thumbnail ? (
                        <YouTubeThumbnail src={course.thumbnail} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-card">
                          <Youtube className="size-10 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2 z-10">
                        <Badge className="bg-card/85 backdrop-blur-sm text-primary border border-primary/30 text-[10px] uppercase font-bold tracking-wider">Free</Badge>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="size-12 rounded-full bg-primary flex items-center justify-center">
                           <Play className="size-5 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </button>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Free Course</span>
                      {typeof course.videoCount === 'number' && course.videoCount > 0 ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          <PlayCircle className="size-3.5" /> {course.videoCount} Lessons
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed">
                      {course.description || 'Beginner-friendly free learning inside the NextGen CTO LMS.'}
                    </p>
                    <div className="flex gap-3 mt-auto pt-4 border-t border-border/30">
                      {course.isEnrolled ? (
                        <>
                          <Button asChild className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            <Link href={learnUrl}>Start Learning</Link>
                          </Button>
                          <Button onClick={() => handleUnenroll(course.id)} disabled={unenrollingMap[course.id]} variant="outline" className="flex-1 rounded-xl border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                            {unenrollingMap[course.id] ? 'Unenrolling...' : 'Unenroll'}


                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollingMap[course.id]}
                            className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            {enrollingMap[course.id] ? 'Enrolling...' : 'Enroll Free'}
                          </Button>
                          <Button 
                            asChild
                            variant="outline" 
                            className="flex-1 rounded-xl border-border/60 hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            <Link href={course.detailsHref ?? `/c/${encodeURIComponent(collegeSlug)}/student/courses/${encodeURIComponent(course.id)}`}>
                              Details <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
