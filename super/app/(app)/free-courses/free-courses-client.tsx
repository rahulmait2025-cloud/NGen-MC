'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  BookOpen,
  Youtube,
  Video,
  ArrowUpDown,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { deleteFreeCourseAction } from '@/app/(app)/free-courses/actions';
import type { FreeCourseListItem } from '@/lib/free-courses/free-course-service';
import type { MasterCoursePublishStatus } from '@/types/database';

interface Props {
  courses: FreeCourseListItem[];
  listMetrics: Record<
    string,
    {
      enrollmentCount: number;
      averageProgressPercent: number;
      completionRate: number;
    }
  >;
}

type SortField =
  | 'title'
  | 'lesson_count'
  | 'enrollmentCount'
  | 'averageProgressPercent'
  | 'completionRate'
  | 'updated_at';
type SortDirection = 'asc' | 'desc' | null;

function statusBadge(status: MasterCoursePublishStatus) {
  switch (status) {
    case 'published':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          Published
        </Badge>
      );
    case 'unpublished':
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">
          Unpublished
        </Badge>
      );
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

function visibilitySummary(course: {
  visible_to_global_students: boolean;
  visible_to_college_students: boolean;
  visible_to_college_admins: boolean;
}) {
  const parts: string[] = [];
  if (course.visible_to_global_students) parts.push('Global');
  if (course.visible_to_college_students) parts.push('College students');
  if (course.visible_to_college_admins) parts.push('College admins');
  return parts.length > 0 ? parts.join(', ') : 'Hidden';
}

interface CourseRowProps {
  course: FreeCourseListItem;
  metrics: { enrollmentCount: number; averageProgressPercent: number; completionRate: number };
  pending: boolean;
  onRequestDelete: (course: FreeCourseListItem) => void;
}

function CourseRow({ course, metrics, pending, onRequestDelete }: CourseRowProps) {
  return (
    <TableRow key={course.id} className="hover:bg-muted/40 transition-colors">
      <TableCell className="align-middle">
        <div className="flex items-center gap-3">
          {course.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic external URL
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="size-10 rounded object-cover border border-border bg-muted/20 shrink-0"
              width={40}
              height={40}
            />
          ) : (
            <div className="size-10 rounded bg-muted flex items-center justify-center border border-border shrink-0">
              <BookOpen className="size-4.5 text-muted-foreground/60" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate max-w-[200px]" title={course.title}>
              {course.title}
            </div>
            <div className="text-xs text-muted-foreground font-mono truncate">
              {course.code}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="align-middle">{statusBadge(course.publish_status)}</TableCell>
      <TableCell className="align-middle text-xs text-muted-foreground max-w-[150px] truncate">
        {visibilitySummary(course)}
      </TableCell>
      <TableCell className="align-middle text-right font-medium">{course.module_count}</TableCell>
      <TableCell className="align-middle text-right font-medium">{course.lesson_count}</TableCell>
      <TableCell className="align-middle text-right text-muted-foreground">
        <span className="inline-flex items-center justify-end gap-1 text-xs">
          <Youtube className="size-3 text-red-500" />
          {course.youtube_lesson_count}
        </span>
      </TableCell>
      <TableCell className="align-middle text-right text-muted-foreground">
        <span className="inline-flex items-center justify-end gap-1 text-xs">
          <Video className="size-3 text-blue-500" />
          {course.tpstreams_lesson_count}
        </span>
      </TableCell>
      <TableCell className="align-middle text-right font-mono text-xs tabular-nums">
        {metrics.enrollmentCount}
      </TableCell>
      <TableCell className="align-middle text-right font-mono text-xs tabular-nums">
        {metrics.averageProgressPercent}%
      </TableCell>
      <TableCell className="align-middle text-right font-mono text-xs tabular-nums">
        {metrics.completionRate}%
      </TableCell>
      <TableCell className="align-middle text-xs text-muted-foreground whitespace-nowrap">
        {new Date(course.updated_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </TableCell>
      <TableCell className="align-middle text-right">
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href={`/free-courses/${course.id}`}>Open Builder</Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8"
            disabled={pending}
            onClick={() => onRequestDelete(course)}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface PaginationControlsProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (index: number) => void;
}

function PaginationControls({
  pageIndex,
  pageSize,
  pageCount,
  totalItems,
  onPageSizeChange,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1">
      <div className="text-xs text-muted-foreground">
        Showing {pageIndex * pageSize + 1} to{' '}
        {Math.min((pageIndex + 1) * pageSize, totalItems)} of{' '}
        {totalItems} courses
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(0)}
            disabled={pageIndex === 0}
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-medium mx-1">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex === pageCount - 1}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={pageIndex === pageCount - 1}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FreeCoursesTable({ courses, listMetrics }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [courseToDelete, setCourseToDelete] = useState<FreeCourseListItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Filtered & Sorted Courses
  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.publish_status === statusFilter);
    }

    // Sort
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let valA: string | number = a[sortField as keyof FreeCourseListItem] as string | number;
        let valB: string | number = b[sortField as keyof FreeCourseListItem] as string | number;

        const metricsA = listMetrics[a.id] ?? {
          enrollmentCount: 0,
          averageProgressPercent: 0,
          completionRate: 0,
        };
        const metricsB = listMetrics[b.id] ?? {
          enrollmentCount: 0,
          averageProgressPercent: 0,
          completionRate: 0,
        };

        if (sortField === 'enrollmentCount') {
          valA = metricsA.enrollmentCount;
          valB = metricsB.enrollmentCount;
        } else if (sortField === 'averageProgressPercent') {
          valA = metricsA.averageProgressPercent;
          valB = metricsB.averageProgressPercent;
        } else if (sortField === 'completionRate') {
          valA = metricsA.completionRate;
          valB = metricsB.completionRate;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        const numA = typeof valA === 'number' ? valA : 0;
        const numB = typeof valB === 'number' ? valB : 0;

        return sortDirection === 'asc' ? numA - numB : numB - numA;
      });
    }

    return result;
  }, [courses, search, statusFilter, sortField, sortDirection, listMetrics]);

  // Pagination
  const paginatedCourses = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredAndSortedCourses.slice(start, start + pageSize);
  }, [filteredAndSortedCourses, pageIndex, pageSize]);

  const pageCount = Math.ceil(filteredAndSortedCourses.length / pageSize) || 1;

  // If no courses exist at all, render the empty state page
  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpenCheck className="size-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No free courses yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Create your first curated free course. You can add YouTube and premium lectures in later builder phases.
        </p>
        <Button asChild className="mt-4">
          <Link href="/free-courses/new">
            <Plus className="mr-2 size-4" />
            Create Free Course
          </Link>
        </Button>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
      } else {
        setSortDirection('desc');
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPageIndex(0); // Reset to first page on sort
  };

  const handlePageChange = (index: number) => {
    setPageIndex(Math.max(0, Math.min(pageCount - 1, index)));
  };

  function closeDeleteDialog() {
    if (pending) return;
    setCourseToDelete(null);
    setDeleteConfirmation('');
  }

  function handleConfirmDelete() {
    if (!courseToDelete) return;
    startTransition(async () => {
      const result = await deleteFreeCourseAction(
        courseToDelete.id,
        deleteConfirmation,
        courseToDelete.title,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data?.message ?? 'Free course deleted');
      setCourseToDelete(null);
      setDeleteConfirmation('');
      router.refresh();
    });
  }

  const canConfirmDelete =
    !!courseToDelete &&
    !pending &&
    ['DELETE', courseToDelete.title.trim()].includes(deleteConfirmation.trim());

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or code..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
            />
          </div>

          {/* Status Selector */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[300px]">
                <button type="button"
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-1.5 hover:text-foreground font-semibold"
                >
                  Course
                  <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="text-right">Modules</TableHead>
              <TableHead className="text-right">
                <button type="button"
                  onClick={() => handleSort('lesson_count')}
                  className="flex items-center gap-1 ml-auto hover:text-foreground font-semibold"
                >
                  Lessons
                  <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="text-right">YouTube</TableHead>
              <TableHead className="text-right">TPStreams</TableHead>
              <TableHead className="text-right">
                <button type="button"
                  onClick={() => handleSort('enrollmentCount')}
                  className="flex items-center gap-1 ml-auto hover:text-foreground font-semibold"
                >
                  Enrolled
                  <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button type="button"
                  onClick={() => handleSort('averageProgressPercent')}
                  className="flex items-center gap-1 ml-auto hover:text-foreground font-semibold"
                >
                  Avg progress
                  <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button type="button"
                  onClick={() => handleSort('completionRate')}
                  className="flex items-center gap-1 ml-auto hover:text-foreground font-semibold"
                >
                  Completion
                  <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
              <TableHead>
                <button type="button"
                  onClick={() => handleSort('updated_at')}
                  className="flex items-center gap-1 hover:text-foreground font-semibold"
                >
                  Updated
                  <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <BookOpen className="size-8 text-muted-foreground/50" />
                    <p className="font-medium text-sm">No courses found matching filter criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCourses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  metrics={listMetrics[course.id] ?? {
                    enrollmentCount: 0,
                    averageProgressPercent: 0,
                    completionRate: 0,
                  }}
                  pending={pending}
                  onRequestDelete={setCourseToDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredAndSortedCourses.length > 0 && (
        <PaginationControls
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          totalItems={filteredAndSortedCourses.length}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          onPageChange={handlePageChange}
        />
      )}

      <AlertDialog
        open={!!courseToDelete}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete free course?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This permanently deletes{' '}
                  <span className="font-medium text-foreground">
                    {courseToDelete?.title}
                  </span>
                  , all modules/lessons, and revokes student free-course access.
                </p>
                <p>
                  Type <span className="font-mono text-foreground">DELETE</span> or the exact
                  course title to confirm.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="free-course-delete-confirm">Confirmation</Label>
            <Input
              id="free-course-delete-confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={courseToDelete ? `DELETE or ${courseToDelete.title}` : 'DELETE'}
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!canConfirmDelete}
              onClick={handleConfirmDelete}
            >
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Delete course
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
