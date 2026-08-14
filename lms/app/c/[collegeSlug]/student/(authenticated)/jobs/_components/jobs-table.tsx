'use client';

import React from 'react';
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Clock,
  Briefcase,
  Building2,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Search,
} from 'lucide-react';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JobPost } from '@/lib/services/student-jobs';
import {
  WORK_MODE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  APPLICATION_STATUS_CONFIG,
  WORK_MODE_COLORS,
  EMPLOYMENT_TYPE_COLORS,
} from '@/components/jobs/job-constants';

import { useJobsQueryState, type SortField } from './use-jobs-query-state';

interface JobsTableProps {
  jobs: JobPost[];
  total: number;
  currentPage: number;
  pageSize: number;
  collegeSlug: string;
  applicationStatuses: Record<string, string | null>;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export default function JobsTable({
  jobs,
  total,
  currentPage,
  pageSize,
  collegeSlug,
  applicationStatuses,
}: JobsTableProps) {
  const {
    isPending,
    searchTerm,
    setSearchTerm,
    workModeFilter,
    employmentTypeFilter,
    sortField,
    sortOrder,
    handleWorkModeChange,
    handleEmploymentTypeChange,
    clearFilters,
    toggleSort,
    updateQuery,
  } = useJobsQueryState();

  const totalPages = Math.ceil(total / pageSize);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 text-primary shrink-0" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-primary shrink-0" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card/40 border border-border/40 p-4 rounded-2xl">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search role, company..."
            className="pl-9 h-10 w-full bg-background/50 border-border/40 focus-visible:ring-1"
            aria-label="Search jobs by role or company"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground whitespace-nowrap">Mode:</span>
            <ShadcnSelect value={workModeFilter} onValueChange={handleWorkModeChange}>
              <SelectTrigger className="h-8 border-border/40 bg-background/40 text-xs px-2.5" aria-label="Filter by work mode">
                <SelectValue placeholder="All Mode" />
              </SelectTrigger>
              <SelectContent position="popper" className="border-border/40">
                <SelectItem value="all">All Mode</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </ShadcnSelect>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground whitespace-nowrap">Type:</span>
            <ShadcnSelect value={employmentTypeFilter} onValueChange={handleEmploymentTypeChange}>
              <SelectTrigger className="h-8 border-border/40 bg-background/40 text-xs px-2.5" aria-label="Filter by employment type">
                <SelectValue placeholder="All Type" />
              </SelectTrigger>
              <SelectContent position="popper" className="border-border/40">
                <SelectItem value="all">All Type</SelectItem>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </ShadcnSelect>
          </div>

          {(searchTerm || workModeFilter !== 'all' || employmentTypeFilter !== 'all' || sortField) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          Showing {total === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
          {Math.min(currentPage * pageSize, total)} of {total} jobs
        </div>
      </div>

      {/* Mobile card view — hidden on md+ */}
      <div className={`md:hidden space-y-3 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {jobs.length === 0 ? (
          <div className="py-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Briefcase className="h-6 w-6" />
              </EmptyMedia>
              <EmptyContent>
                <EmptyTitle>No job opportunities found</EmptyTitle>
                <EmptyDescription>
                  {searchTerm || workModeFilter !== 'all' || employmentTypeFilter !== 'all'
                    ? 'Try adjusting your filters or search query to find matching jobs.'
                    : 'No jobs have been posted yet. Check back later for new opportunities.'}
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          jobs.map((job) => {
            const status = applicationStatuses[job.id];
            const statusConfig = status ? APPLICATION_STATUS_CONFIG[status] : null;
            const deadlineDate = job.application_deadline ? new Date(job.application_deadline) : null;
            const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
            const deadlineStr = deadlineDate
              ? deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : null;

            return (
              <div key={job.id} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary/60" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/c/${collegeSlug}/student/jobs/${job.id}`}
                        className="text-base font-semibold hover:text-primary transition-colors line-clamp-1 text-foreground"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.company_name}</p>
                    </div>
                  </div>
                  {statusConfig && (
                    <Badge variant={statusConfig.variant} className="text-xs shrink-0">{statusConfig.label}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs text-foreground">
                  {job.location && (
                    <span className="inline-flex items-center gap-1 bg-muted/40 rounded-md px-2 py-1">
                      <MapPin className="size-3 text-muted-foreground" />
                      {job.location}
                    </span>
                  )}
                  {job.work_mode && (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 border ${WORK_MODE_COLORS[job.work_mode] || 'bg-muted/40 text-foreground border-border/40'}`}>
                      {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
                    </span>
                  )}
                  {job.employment_type && (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 border ${EMPLOYMENT_TYPE_COLORS[job.employment_type] || 'bg-muted/40 text-foreground border-border/40'}`}>
                      {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                    </span>
                  )}
                  {deadlineStr && (
                    <span className="inline-flex items-center gap-1 bg-muted/40 rounded-md px-2 py-1">
                      <Clock className="size-3 text-muted-foreground" />
                      {isDeadlinePassed ? <span className="text-destructive font-medium">Expired</span> : deadlineStr}
                    </span>
                  )}
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-[10px] font-normal px-1.5 py-0">{skill}</Badge>
                    ))}
                    {job.skills.length > 4 && (
                      <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">+{job.skills.length - 4}</Badge>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button size="sm" variant={statusConfig ? 'outline' : 'default'} asChild className="h-8 text-xs">
                    <Link href={`/c/${collegeSlug}/student/jobs/${job.id}`} className="gap-1.5">
                      {statusConfig ? 'View' : 'Apply'}
                      <ArrowRight className="size-3 opacity-60" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table — hidden below md */}
      <div className={`hidden md:block rounded-2xl border border-border/40 overflow-hidden bg-card/30 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead
                className="cursor-pointer select-none py-3"
                onClick={() => toggleSort('title')}
                aria-sort={getAriaSort('title')}
              >
                <div className="flex items-center font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                  Role & Company
                  {renderSortIcon('title')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none py-3"
                onClick={() => toggleSort('location')}
                aria-sort={getAriaSort('location')}
              >
                <div className="flex items-center font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                  Location
                  {renderSortIcon('location')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none py-3"
                onClick={() => toggleSort('work_mode')}
                aria-sort={getAriaSort('work_mode')}
              >
                <div className="flex items-center font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                  Mode
                  {renderSortIcon('work_mode')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none py-3"
                onClick={() => toggleSort('employment_type')}
                aria-sort={getAriaSort('employment_type')}
              >
                <div className="flex items-center font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                  Type
                  {renderSortIcon('employment_type')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none py-3"
                onClick={() => toggleSort('application_deadline')}
                aria-sort={getAriaSort('application_deadline')}
              >
                <div className="flex items-center font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                  Deadline
                  {renderSortIcon('application_deadline')}
                </div>
              </TableHead>
              <TableHead className="py-3 text-center font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Status
              </TableHead>
              <TableHead className="py-3 text-right font-semibold text-xs tracking-wider uppercase text-muted-foreground/80">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 py-8">
                  <Empty>
                    <EmptyMedia variant="icon">
                      <Briefcase className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyContent>
                      <EmptyTitle>No job opportunities found</EmptyTitle>
                      <EmptyDescription>
                        {searchTerm || workModeFilter !== 'all' || employmentTypeFilter !== 'all'
                          ? 'Try adjusting your filters or search query to find matching jobs.'
                          : 'No jobs have been posted yet. Check back later for new opportunities.'}
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const status = applicationStatuses[job.id];
                const statusConfig = status ? APPLICATION_STATUS_CONFIG[status] : null;

                const deadlineDate = job.application_deadline
                  ? new Date(job.application_deadline)
                  : null;
                const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
                const deadlineStr = deadlineDate
                  ? deadlineDate.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'No deadline';

                return (
                  <TableRow key={job.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="py-3.5">
                      <div className="flex flex-col min-w-0">
                        <Link
                          href={`/c/${collegeSlug}/student/jobs/${job.id}`}
                          className="font-medium hover:text-primary transition-colors line-clamp-1 text-sm text-foreground"
                        >
                          {job.title}
                        </Link>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 inline shrink-0" />
                          {job.company_name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <span className="text-sm text-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {job.location || 'Anywhere'}
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5">
                      {job.work_mode ? (
                        <Badge
                          variant="outline"
                          className={`font-medium px-2 py-0.5 border ${WORK_MODE_COLORS[job.work_mode] || ''}`}
                        >
                          {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5">
                      {job.employment_type ? (
                        <Badge
                          variant="outline"
                          className={`font-medium px-2 py-0.5 border ${EMPLOYMENT_TYPE_COLORS[job.employment_type] || ''}`}
                        >
                          {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5">
                      {isDeadlinePassed ? (
                        <span className="text-xs font-semibold text-destructive flex items-center gap-1 bg-destructive/10 border border-destructive/20 rounded px-2 py-0.5 w-fit">
                          Expired
                        </span>
                      ) : deadlineDate ? (
                        <span className="text-sm text-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {deadlineStr}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ongoing</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5 text-center">
                      {statusConfig ? (
                        <Badge variant={statusConfig.variant} className="font-semibold text-xs py-0.5 px-2.5">
                          {statusConfig.label}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal text-muted-foreground border-border/40 py-0.5 px-2.5">
                          Not Applied
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5 text-right">
                      <Button
                        size="sm"
                        variant={statusConfig ? 'outline' : 'default'}
                        className="h-8 text-xs font-medium"
                        asChild
                      >
                        <Link href={`/c/${collegeSlug}/student/jobs/${job.id}`}>
                          {statusConfig ? 'View' : 'Apply'}
                          <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav className={`flex items-center justify-center gap-1.5 pt-2 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`} aria-label="Pagination">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateQuery({ page: String(Math.max(1, currentPage - 1)) })}
            disabled={currentPage === 1}
            className="h-8"
            aria-label="Go to previous page"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {pageNumbers.map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === currentPage ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => updateQuery({ page: String(p) })}
                  aria-label={`Go to page ${p}`}
                  aria-current={p === currentPage ? 'page' : undefined}
                >
                  {p}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => updateQuery({ page: String(Math.min(totalPages, currentPage + 1)) })}
            disabled={currentPage === totalPages}
            className="h-8"
            aria-label="Go to next page"
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
