'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import type { MentorshipSessionRow } from '@/lib/services/mentorship-sessions';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Video,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

type SortKey = 'title' | 'session_date' | 'your_students_count';
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getRelativeDate(dateStr: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return '';
}

function StatusBadge({ status, isNext }: { status: string; isNext?: boolean }) {
  const variants: Record<string, { className: string; label: string }> = {
    scheduled: {
      className: isNext
        ? 'bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10'
        : 'bg-primary/8 text-primary border-primary/20',
      label: isNext ? 'Upcoming' : 'Scheduled',
    },
    completed: {
      className: 'bg-[oklch(0.92_0.12_145)] text-[oklch(0.35_0.15_145)] border-[oklch(0.85_0.12_145)]',
      label: 'Completed',
    },
    cancelled: {
      className: 'bg-[oklch(0.95_0.06_25)] text-[oklch(0.45_0.18_25)] border-[oklch(0.88_0.08_25)]',
      label: 'Cancelled',
    },
  };
  const v = variants[status] ?? variants.scheduled;
  return (
    <Badge variant="outline" className={`text-[11px] font-semibold tracking-wide ${v.className}`}>
      {v.label}
    </Badge>
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
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors active:scale-[0.97]"
    >
      {label}
      <Icon className={`size-3 ${active ? 'text-primary' : 'opacity-30'}`} />
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 enter-fade">
      <div className="size-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5">
        <Video className="size-7 text-primary/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5">
        No mentorship sessions yet
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
        Sessions will appear here once SuperAdmin schedules mentorship meetings targeting your college.
      </p>
    </div>
  );
}

function NextSessionBanner({ session }: { session: MentorshipSessionRow }) {
  const relative = getRelativeDate(session.session_date);
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70 mb-1">
            Next Session {relative && `— ${relative}`}
          </p>
          <h3 className="text-base font-semibold text-foreground truncate mb-1">
            {session.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatDate(session.session_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatTime(session.start_time_ist)} – {formatTime(session.end_time_ist)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {session.your_students_count} student{session.your_students_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <StatusBadge status={session.status} isNext />
      </div>
    </div>
  );
}

function SessionExpandableRow({
  session,
  index,
  isNext,
}: {
  session: MentorshipSessionRow;
  index: number;
  isNext: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const relative = getRelativeDate(session.session_date);

  return (
    <>
      <TableRow
        className={`group transition-colors hover:bg-muted/30 cursor-pointer ${isNext ? 'bg-primary/[0.03]' : ''}`}
        onClick={() => setExpanded(!expanded)}
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
          <div className="flex items-center gap-2.5">
            <div className={`size-5 rounded-md flex items-center justify-center transition-transform duration-200 ${expanded ? 'rotate-90 bg-primary/10' : 'bg-muted/50'}`}>
              <ChevronRight className={`size-3.5 transition-colors ${expanded ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {session.title}
              </p>
              {relative && (
                <p className="text-[11px] text-primary/70 font-medium mt-0.5">{relative}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="py-3.5 px-5">
          <span className="text-sm text-foreground/80 font-medium">
            {formatDate(session.session_date)}
          </span>
          <span className="text-[11px] text-muted-foreground ml-1.5">
            {session.session_day}
          </span>
        </TableCell>
        <TableCell className="py-3.5 px-5">
          <span className="text-sm text-foreground/80">
            {formatTime(session.start_time_ist)} – {formatTime(session.end_time_ist)}
          </span>
        </TableCell>
        <TableCell className="py-3.5 px-5">
          <StatusBadge status={session.status} isNext={isNext} />
        </TableCell>
        <TableCell className="py-3.5 px-5 text-center">
          <div className="inline-flex items-center gap-1.5 text-sm">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{session.your_students_count}</span>
          </div>
        </TableCell>
        <TableCell className="py-3.5 px-5 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? 'Hide' : 'Details'}
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="px-5 pb-5 pt-0">
            <div className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 p-5 mt-1">
              {session.description ? (
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {session.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No description provided for this session.
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function MobileSessionCard({
  session,
  index,
  isNext,
}: {
  session: MentorshipSessionRow;
  index: number;
  isNext: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const relative = getRelativeDate(session.session_date);

  return (
    <div
      className={`card-tier-1 rounded-xl overflow-hidden ${isNext ? 'ring-1 ring-primary/20' : ''}`}
      style={prefersReducedMotion ? undefined : {
        animation: `row-enter 0.35s ease-out both`,
        animationDelay: `${(index % 10) * 45}ms`,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {session.title}
            </p>
            {relative && (
              <p className="text-[11px] text-primary/70 font-medium mt-0.5">{relative}</p>
            )}
          </div>
          <StatusBadge status={session.status} isNext={isNext} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formatDate(session.session_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {formatTime(session.start_time_ist)} – {formatTime(session.end_time_ist)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {session.your_students_count} student{session.your_students_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {session.description && (
        <div className="border-t border-border/30 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? 'Hide Description' : 'View Description'}
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
      {expanded && session.description && (
        <div className="border-t border-border/30 bg-muted/15 px-4 py-3">
          <p className="text-sm text-foreground/70 leading-relaxed">
            {session.description}
          </p>
        </div>
      )}
    </div>
  );
}

export function MentorshipSessionsTable({
  sessions,
}: {
  sessions: MentorshipSessionRow[];
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('session_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nextSessionId = useMemo(() => {
    const scheduledFuture = sessions
      .filter((s) => s.status === 'scheduled' && s.session_date >= todayStr);
    return scheduledFuture.length > 0
      ? scheduledFuture.reduce((min, s) =>
          (s.session_date + s.start_time_ist).localeCompare(min.session_date + min.start_time_ist) < 0 ? s : min
        ).id
      : null;
  }, [sessions, todayStr]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir(key === 'session_date' ? 'desc' : 'asc');
      }
      setPage(0);
    },
    [sortKey],
  );

  const filtered = useMemo(() => {
    let list = [...sessions];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.session_day.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (sortKey === 'your_students_count') {
        const aNum = a.your_students_count;
        const bNum = b.your_students_count;
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      const aVal = (a[sortKey] ?? '').toLowerCase();
      const bVal = (b[sortKey] ?? '').toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [sessions, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const nextSession = useMemo(() => {
    return sessions.find((s) => s.id === nextSessionId) ?? null;
  }, [sessions, nextSessionId]);

  return (
    <div className="space-y-5">
      {nextSession && <NextSessionBanner session={nextSession} />}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
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
          session{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== sessions.length && ` (${sessions.length} total)`}
        </p>
      </div>

      <div className="hidden md:block card-tier-1 rounded-xl overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-left py-3.5 px-5 w-[35%]">
                  <SortHeader label="Title" sortKey="title" currentSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="text-left py-3.5 px-5 w-[22%]">
                  <SortHeader label="Date" sortKey="session_date" currentSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="text-left py-3.5 px-5 w-[18%]">Time</TableHead>
                <TableHead className="text-left py-3.5 px-5 w-[12%]">Status</TableHead>
                <TableHead className="text-center py-3.5 px-5 w-[8%]">
                  <SortHeader label="Students" sortKey="your_students_count" currentSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </TableHead>
                <TableHead className="text-right py-3.5 px-5 w-[5%]" aria-label="Actions"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/20">
              {paged.map((session, i) => (
                <SessionExpandableRow
                  key={session.id}
                  session={session}
                  index={safePage * PAGE_SIZE + i}
                  isNext={session.id === nextSessionId}
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
            {paged.map((session, i) => (
              <StaggerChild key={session.id}>
                <MobileSessionCard
                  session={session}
                  index={safePage * PAGE_SIZE + i}
                  isNext={session.id === nextSessionId}
                />
              </StaggerChild>
            ))}
          </StaggerReveal>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-1 border-t border-border/30">
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
}
