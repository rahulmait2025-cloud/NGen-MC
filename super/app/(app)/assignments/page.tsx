import Link from 'next/link';
import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listAssignments } from '@/lib/services/content-assignments';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Plus, School, User } from 'lucide-react';
import { RepairEntitlementsButton } from '@/components/master-courses/repair-entitlements-button';
import { AssignmentRevokeButton } from './assignment-revoke-button';
import type { AssignmentWithDetails } from '@/lib/services/content-assignments';

const PAGE_SIZE = 100;

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span>;
    case 'scheduled':
      return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">Scheduled</span>;
    case 'expired':
      return <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Expired</span>;
    case 'revoked':
      return <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">Revoked</span>;
    default:
      return <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{status}</span>;
  }
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isExpiringSoon(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  const now = Date.now();
  const end = new Date(endDate).getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return end > now && end - now <= thirtyDays;
}

function entityLabel(a: AssignmentWithDetails) {
  if (a.assigned_entity_type === 'master_course') return a.master_course?.title ?? a.assigned_entity_id.slice(0, 8);
  if (a.assigned_entity_type === 'variant') return a.variant?.title ?? a.assigned_entity_id.slice(0, 8);
  if (a.assigned_entity_type === 'bundle') return a.bundle?.title ?? a.assigned_entity_id.slice(0, 8);
  return a.assigned_entity_id.slice(0, 8);
}

function entityCode(a: AssignmentWithDetails) {
  if (a.assigned_entity_type === 'master_course') return a.master_course?.code;
  if (a.assigned_entity_type === 'variant') return a.variant?.code;
  if (a.assigned_entity_type === 'bundle') return a.bundle?.code;
  return undefined;
}

function targetLabel(a: AssignmentWithDetails) {
  if (a.assignment_type === 'college') return a.college?.name ?? a.target_id.slice(0, 8);
  return a.student?.student_code ?? a.target_id.slice(0, 8);
}

export default async function AssignmentsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params?.page ?? '1', 10) || 1);

  const { data: assignments, total } = await listAssignments({
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const stats = {
    total,
    active: assignments.filter((a) => a.status === 'active').length,
    college: assignments.filter((a) => a.assignment_type === 'college').length,
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Content assignments across colleges and students.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/assignments/create">
            <Plus className="size-4" />
            Create assignment
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: total },
          { label: 'Active', value: stats.active },
          { label: 'College', value: stats.college },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/60 bg-card px-5 py-4">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        {assignments.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-medium text-foreground">No assignments yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first assignment to get started.</p>
            <Button asChild size="sm" className="mt-4 gap-1.5">
              <Link href="/assignments/create">
                <Plus className="size-4" />
                Create assignment
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 pl-5">Content</TableHead>
                  <TableHead className="h-11">Type</TableHead>
                  <TableHead className="h-11">Target</TableHead>
                  <TableHead className="h-11">Status</TableHead>
                  <TableHead className="h-11">Expires</TableHead>
                  <TableHead className="h-11 pr-5 text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id} className="border-border/20">
                    <TableCell className="pl-5">
                      <span className="text-sm font-medium">{entityLabel(assignment)}</span>
                      {entityCode(assignment) && (
                        <span className="block text-[11px] text-muted-foreground font-mono">{entityCode(assignment)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                        {assignment.assignment_type === 'college' ? (
                          <School className="size-3.5 text-muted-foreground" />
                        ) : (
                          <User className="size-3.5 text-muted-foreground" />
                        )}
                        {assignment.assignment_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                        {targetLabel(assignment)}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(assignment.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{formatDate(assignment.end_date)}</span>
                      {assignment.status === 'active' && isExpiringSoon(assignment.end_date) && (
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Expiring soon</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {assignment.status === 'active' && (
                          <AssignmentRevokeButton assignmentId={assignment.id} />
                        )}
                        {assignment.assignment_type === 'college' && (
                          <RepairEntitlementsButton collegeId={assignment.target_id} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages} ({total} total)
              </span>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    {hasPrev ? (
                      <PaginationPrevious href={`/assignments?page=${currentPage - 1}`} />
                    ) : (
                      <PaginationPrevious href="#" className="pointer-events-none opacity-50" />
                    )}
                  </PaginationItem>
                  {getPageRange(currentPage, totalPages).map((p) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key="ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href={`/assignments?page=${p}`}
                          isActive={p === currentPage}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    {hasNext ? (
                      <PaginationNext href={`/assignments?page=${currentPage + 1}`} />
                    ) : (
                      <PaginationNext href="#" className="pointer-events-none opacity-50" />
                    )}
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
