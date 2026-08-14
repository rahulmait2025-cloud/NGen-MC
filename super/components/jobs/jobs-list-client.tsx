'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { JobListItem, JobStatus } from '@/lib/superadmin/jobs/types';

const STATUS_BADGE_VARIANTS: Record<JobStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-red-100 text-red-800',
  archived: 'bg-purple-100 text-purple-800',
};

interface JobsListClientProps {
  initialJobs: JobListItem[];
  total: number;
  page: number;
  pageSize: number;
  statusFilter: string;
  search: string;
  applicantCounts?: Record<string, number>;
}

const EMPTY_APPLICANT_COUNTS: Record<string, number> = {};

export function JobsListClient({
  initialJobs,
  total,
  page,
  pageSize,
  statusFilter,
  search: initialSearch,
  applicantCounts = EMPTY_APPLICANT_COUNTS,
}: JobsListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleDelete = async (jobId: string) => {
    setDeletingId(jobId);
    try {
      const { deleteJobAction } = await import('@/app/(app)/jobs/actions');
      const result = await deleteJobAction(jobId);
      if (result.success) {
        toast.success('Job deleted successfully.');
        setJobToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to delete job.');
      }
    } catch (_e) {
      toast.error('An error occurred while deleting the job.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const applyFilters = (overrides: Partial<{ statusFilter: string; search: string; page: string }>) => {
    const params = new URLSearchParams();
    const newStatus = overrides.statusFilter ?? statusFilter;
    const newSearch = overrides.search ?? search;
    const newPage = overrides.page ?? String(page);

    if (newStatus && newStatus !== 'all') params.set('status', newStatus);
    if (newSearch) params.set('search', newSearch);
    if (newPage && newPage !== '1') params.set('page', newPage);

    router.push(`/jobs?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search, page: '1' });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        <div className="flex gap-1.5">
          {(['all', 'draft', 'open', 'paused', 'closed', 'archived'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyFilters({ statusFilter: s, page: '1' })}
              className="text-xs"
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Visibility</TableHead>
              <TableHead className="hidden md:table-cell">Work Mode</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell">Deadline</TableHead>
              <TableHead className="hidden lg:table-cell text-center">Applicants</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialJobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No jobs found.
                </TableCell>
              </TableRow>
            )}
            {initialJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  <Link href={`/jobs/${job.id}`} className="hover:underline">
                    {job.title}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[150px] truncate">{job.company_name}</TableCell>
                <TableCell>
                  <Badge className={STATUS_BADGE_VARIANTS[job.status]}>
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {job.visibility_scope.replace(/_/g, ' ')}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {job.work_mode ?? '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {job.employment_type ? job.employment_type.replace(/_/g, ' ') : '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {job.application_deadline
                    ? new Date(job.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-center">
                  <Link href={`/jobs/${job.id}/applications`} className="hover:underline">
                    {applicantCounts[job.id] ?? 0}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild disabled={deletingId === job.id}>
                      <Link href={`/jobs/${job.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild disabled={deletingId === job.id}>
                      <Link href={`/jobs/${job.id}/edit`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setJobToDelete({ id: job.id, title: job.title })}
                      disabled={deletingId === job.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => applyFilters({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => applyFilters({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job &quot;{jobToDelete?.title}&quot; and remove all associated applications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === jobToDelete?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId === jobToDelete?.id}
              onClick={(e) => {
                e.preventDefault();
                if (jobToDelete) {
                  handleDelete(jobToDelete.id);
                }
              }}
            >
              {deletingId === jobToDelete?.id ? 'Deleting...' : 'Delete Job'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
