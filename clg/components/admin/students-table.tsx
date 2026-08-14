'use client';

import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import type { StudentWithProfile } from '@/lib/services/dashboard';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Users,
} from 'lucide-react';

type SortKey = 'full_name' | 'email';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | 'ellipsis')[] = [0];
  if (current > 2) pages.push('ellipsis');
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 3) pages.push('ellipsis');
  pages.push(total - 1);
  return pages;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 enter-fade">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Users className="size-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No students enrolled yet
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Students will appear here once they join your college. Share the invite
        link or add them manually from the dashboard.
      </p>
    </div>
  );
}

function SortHeader({
  label,
  sortKey: sk,
  currentSortKey,
  sortDir,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
}) {
  const active = sk === currentSortKey;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onToggle(sk)}
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ease-[var(--ease-out)] active:scale-[0.97]"
    >
      {label}
      <Icon className={`size-3 ${active ? 'text-primary' : 'opacity-40'}`} />
    </button>
  );
}

export const StudentsTable = React.memo(function StudentsTable({ students }: { students: StudentWithProfile[] }) {
  const params = useParams();
  const collegeSlug = params?.collegeSlug as string;
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
      setPage(0);
    },
    [sortKey],
  );

  const filtered = useMemo(() => {
    let list = [...students];

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter(
        (s) =>
          (s.full_name?.toLowerCase().includes(q) ?? false) ||
          (s.email?.toLowerCase().includes(q) ?? false),
      );
    }

    list.sort((a, b) => {
      const aVal = (a[sortKey] ?? '').toLowerCase();
      const bVal = (b[sortKey] ?? '').toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [students, deferredSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const activityBase = `/c/${collegeSlug}/admin/students/activity`;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            className="pl-9 h-9 bg-background border-border/50 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
          student{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== students.length &&
            ` (${students.length} total)`}
        </p>
      </div>

      <div className="hidden md:block card-tier-1 rounded-xl overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-left py-3.5 px-5 w-[38%]">
                  <SortHeader label="Name" sortKey="full_name" currentSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="text-left py-3.5 px-5 w-[35%]">
                  <SortHeader label="Email" sortKey="email" currentSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="text-right py-3.5 px-5 w-[27%]">Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/20">
              {paged.map((student, i) => (
                <StudentTableRow
                  key={student.id}
                  student={student}
                  index={safePage * PAGE_SIZE + i}
                  activityBase={activityBase}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {paged.length === 0 ? (
          <EmptyState />
        ) : (
          <StaggerReveal stagger={0.05} delay={0.1}>
            {paged.map((student, i) => (
              <StaggerChild key={student.id}>
                <MobileStudentCard
                  student={student}
                  index={safePage * PAGE_SIZE + i}
                  activityBase={activityBase}
                />
              </StaggerChild>
            ))}
          </StaggerReveal>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            Page {safePage + 1} of {totalPages}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(0, p - 1)); }}
                  aria-disabled={safePage === 0}
                  className={safePage === 0 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {getPageRange(safePage, totalPages).map((p) =>
                p === 'ellipsis' ? (
                  <PaginationItem key={p}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === safePage}
                      onClick={(e) => { e.preventDefault(); setPage(p); }}
                    >
                      {p + 1}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages - 1, p + 1)); }}
                  aria-disabled={safePage >= totalPages - 1}
                  className={safePage >= totalPages - 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
});

const StudentTableRow = React.memo(function StudentTableRow({
  student,
  index,
  activityBase,
}: {
  student: StudentWithProfile;
  index: number;
  activityBase: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <TableRow
      className="group transition-colors ease-[var(--ease-out)] hover:bg-muted/30"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 500px',
        ...(prefersReducedMotion ? {} : {
          animation: `row-enter 0.35s ease-out both`,
          animationDelay: `${(index % 10) * 45}ms`,
        }),
      }}
    >
      <TableCell className="py-3.5 px-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {getInitials(student.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {student.full_name ?? '—'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3.5 px-5">
        <span className="text-sm text-muted-foreground">
          {student.email ?? '—'}
        </span>
      </TableCell>
      <TableCell className="py-3.5 px-5 text-right">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          asChild
        >
          <Link href={`${activityBase}/${student.id}`}>
            <Activity className="size-3.5" />
            View Activity
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
});

const MobileStudentCard = React.memo(function MobileStudentCard({
  student,
  index,
  activityBase,
}: {
  student: StudentWithProfile;
  index: number;
  activityBase: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <div
      className="card-tier-1 rounded-xl p-4 flex items-start gap-3"
      style={prefersReducedMotion ? undefined : {
        animation: `row-enter 0.35s ease-out both`,
        animationDelay: `${(index % 10) * 45}ms`,
      }}
    >
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
          {getInitials(student.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">
          {student.full_name ?? '—'}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {student.email ?? '—'}
        </p>
        <div className="mt-2">
          <Button
            variant="outline"
            size="xs"
            className="text-xs gap-1.5"
            asChild
          >
            <Link href={`${activityBase}/${student.id}`}>
              <Activity className="size-3" />
              View Activity
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
});
