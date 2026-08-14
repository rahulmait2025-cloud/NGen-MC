'use client';

import { useEffect, useState } from 'react';
import { pageMeta } from '@/data/page-meta';
import { listMasterCoursesForSelectorAction } from '../notes/notes-actions';
import CourseResourceSectionsEditor from '@/components/master-courses/course-resource-sections-editor';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, ChevronDown, Globe } from 'lucide-react';

const meta = pageMeta['resources'];

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

/** Well-known courseId sentinel for global resources. */
const GLOBAL_COURSE_ID = '00000000-0000-0000-0000-000000000000';

export default function ResourcesPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'global' | 'course'>('global');

  useEffect(() => {
    if (tab !== 'course' || courses.length > 0) {
      if (tab === 'global') setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await listMasterCoursesForSelectorAction();
        if (!cancelled && res.ok && res.data) {
          setCourses(res.data as CourseOption[]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[ResourcesPage] Failed to load courses:', err);
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab, courses.length]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
        <p className="text-muted-foreground mt-1">
          Manage course resources — links, notes, files, and markdown content.
          Global resources appear in every course player.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setTab('global')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'global'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-4 w-4" />
          Global Resources
        </button>
        <button
          onClick={() => setTab('course')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'course'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Course Resources
        </button>
      </div>

      {tab === 'global' && (
        <div className="space-y-4">
          <div className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-foreground">
            <strong>Global resources</strong> appear in the Resources tab of every course player.
            Use these for platform-wide links, documentation, or shared note collections.
          </div>
          <CourseResourceSectionsEditor courseId={GLOBAL_COURSE_ID} />
        </div>
      )}

      {tab === 'course' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={loading}>
                <Button variant="outline" className="w-[360px] justify-between font-normal bg-background">
                  <span>
                    {selectedCourseId
                      ? (() => {
                          const c = courses.find((c) => c.id === selectedCourseId);
                          return c ? (c.code ? `${c.code} — ${c.title}` : c.title) : 'Select a course';
                        })()
                      : 'Select a course'}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[360px]">
                {courses.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onSelect={() => setSelectedCourseId(c.id)}
                  >
                    {c.code ? `${c.code} — ${c.title}` : c.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {selectedCourseId && (
            <CourseResourceSectionsEditor courseId={selectedCourseId} />
          )}

          {!selectedCourseId && !loading && (
            <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
              Select a course above to manage its resources.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
