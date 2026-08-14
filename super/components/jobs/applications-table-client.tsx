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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, FileText } from 'lucide-react';
import { getResumeSignedUrlAction } from '@/app/(app)/jobs/applications/actions';
import { ApplicationStatusSelect } from './application-status-select';
import type { ApplicantWithDetails } from '@/lib/superadmin/jobs/applicant-queries';
import { toast } from 'sonner';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'interview', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

interface ApplicationsTableClientProps {
  applicants: ApplicantWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  statusFilter: string;
  search: string;
  jobId?: string;
  colleges: { id: string; name: string }[];
  collegeFilter?: string;
}

export function ApplicationsTableClient({
  applicants,
  total,
  page,
  pageSize,
  statusFilter,
  search: initialSearch,
  jobId,
  colleges,
  collegeFilter,
}: ApplicationsTableClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  const totalPages = Math.ceil(total / pageSize);

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      status: statusFilter,
      search,
      page: String(page),
      college: collegeFilter ?? '',
      ...overrides,
    };
    if (current.status && current.status !== 'all') params.set('status', current.status);
    if (current.search) params.set('search', current.search);
    if (current.page && current.page !== '1') params.set('page', current.page);
    if (current.college) params.set('college', current.college);

    const basePath = jobId ? `/jobs/${jobId}/applications` : '/jobs/applications';
    return `${basePath}?${params.toString()}`;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ search, page: '1' }));
  };

  const handleResumeClick = async (resumePath: string) => {
    const result = await getResumeSignedUrlAction(resumePath);
    if (!result.success || !result.data) {
      toast.error(result.error ?? 'Could not open resume.');
      return;
    }
    window.open(result.data.url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        <Select
          value={statusFilter}
          onValueChange={(v) => router.push(buildUrl({ status: v, page: '1' }))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={collegeFilter ?? 'all'}
          onValueChange={(v) => router.push(buildUrl({ college: v === 'all' ? '' : v, page: '1' }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colleges</SelectItem>
            {colleges.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">College</TableHead>
              {!jobId && <TableHead className="hidden lg:table-cell">Job</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Applied</TableHead>
              <TableHead className="hidden lg:table-cell">Last Edited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicants.length === 0 && (
              <TableRow>
                <TableCell colSpan={jobId ? 7 : 8} className="text-center text-muted-foreground py-8">
                  No applicants found.
                </TableCell>
              </TableRow>
            )}
            {applicants.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium max-w-[150px] truncate">
                  {app.student_name ?? 'Unknown'}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                  {app.student_email ?? '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {app.college_name ?? (
                    <Badge variant="outline" className="text-xs">Global</Badge>
                  )}
                </TableCell>
                {!jobId && (
                  <TableCell className="hidden lg:table-cell text-sm max-w-[150px] truncate">
                    {app.job_title}
                  </TableCell>
                )}
                <TableCell>
                  <ApplicationStatusSelect
                    applicationId={app.id}
                    currentStatus={app.status}
                    compact
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {new Date(app.applied_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {app.last_edited_at
                    ? new Date(app.last_edited_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {app.resume_path ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResumeClick(app.resume_path!)}
                        title="View Resume"
                      >
                        <FileText className="size-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" disabled title="No resume">
                        <FileText className="size-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/jobs/applications/${app.id}`}>
                        <Eye className="size-4" />
                      </Link>
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
              onClick={() => router.push(buildUrl({ page: String(page - 1) }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(buildUrl({ page: String(page + 1) }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
