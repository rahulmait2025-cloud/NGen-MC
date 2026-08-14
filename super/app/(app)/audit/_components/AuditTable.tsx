'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { ShieldAlert, Search, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';

const PAGE_SIZE = 50;

type AuditLogRow = {
  id: string;
  created_at: string;
  severity: string;
  action: string;
  actor_email?: string;
  resource_type: string;
  college_name?: string;
  payload?: Record<string, unknown>;
};

type SortKey = 'created_at' | 'severity' | 'action' | 'actor_email' | 'resource_type' | 'college_name';
type SortDir = 'asc' | 'desc';

const SEVERITY_RANK: Record<string, number> = { info: 0, warning: 1, critical: 2 };

function buildPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return [1];
  const items: Array<number | 'ellipsis'> = [];
  const add = (value: number | 'ellipsis') => {
    if (items[items.length - 1] === value) return;
    items.push(value);
  };
  add(1);
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) add('ellipsis');
  for (let page = start; page <= end; page++) add(page);
  if (end < totalPages - 1) add('ellipsis');
  if (totalPages > 1) add(totalPages);
  return items;
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'warning':
      return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 px-2">Warning</Badge>;
    default:
      return <Badge variant="secondary" className="px-2">Info</Badge>;
  }
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        role="columnheader"
        aria-sort={isActive ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 select-none hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        <Icon className={`size-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`} />
      </button>
    </TableHead>
  );
}

export function AuditTable({
  rows,
  error,
  total,
}: {
  rows: AuditLogRow[];
  error: string | null;
  total: number;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'created_at' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) => {
          return (
            row.action.toLowerCase().includes(q) ||
            (row.actor_email ?? '').toLowerCase().includes(q) ||
            (row.resource_type ?? '').toLowerCase().includes(q) ||
            (row.college_name ?? '').toLowerCase().includes(q) ||
            (row.severity ?? '').toLowerCase().includes(q)
          );
        })
      : rows;
    const sorted = filtered.toSorted((a, b) => {
      if (sortKey === 'created_at') {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
      }
      if (sortKey === 'severity') {
        const aRank = SEVERITY_RANK[a.severity] ?? 0;
        const bRank = SEVERITY_RANK[b.severity] ?? 0;
        return sortDir === 'asc' ? aRank - bRank : bRank - aRank;
      }
      const av = ((a[sortKey] as string | undefined) ?? '').toLowerCase();
      const bv = ((b[sortKey] as string | undefined) ?? '').toLowerCase();
      const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [rows, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, safePage]);

  const pageItems = useMemo(() => buildPageItems(safePage, totalPages), [safePage, totalPages]);

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === safePage) return;
    setPage(next);
  };

  const rangeStart = filteredSorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredSorted.length);
  const isFiltering = search.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 gap-4 flex-wrap">
          <div className="flex flex-row items-center">
            <ShieldAlert className="size-5 mr-2 text-indigo-500" />
            <div className="space-y-1">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                {filteredSorted.length} event{filteredSorted.length === 1 ? '' : 's'}
                {isFiltering && total !== filteredSorted.length && (
                  <span className="text-muted-foreground/70"> (filtered from {total})</span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search action, actor, target, college, severity…"
              className="h-8 pl-7 pr-7 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          <div className="overflow-hidden">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <SortableHeader label="Timestamp" sortKey="created_at" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[16%]" />
                  <SortableHeader label="Severity" sortKey="severity" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[10%]" />
                  <SortableHeader label="Action" sortKey="action" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[18%]" />
                  <SortableHeader label="Actor" sortKey="actor_email" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[18%]" />
                  <SortableHeader label="Target" sortKey="resource_type" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[20%]" />
                  <TableHead className="w-[18%]">Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-destructive py-6">
                      Could not load audit logs. Check database connection.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No audit events recorded.
                    </TableCell>
                  </TableRow>
                ) : pagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No audit events match “{search}”.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap" suppressHydrationWarning>
                        {new Date(log.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell className="font-medium">
                        <span className="block truncate" title={log.action}>{log.action}</span>
                      </TableCell>
                      <TableCell title={log.actor_email || 'System'}>
                        <span className="block truncate text-sm">
                          {log.actor_email || <span className="text-muted-foreground italic">System</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="block truncate font-mono text-xs" title={log.resource_type}>
                          {log.resource_type}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground" title={log.college_name || 'Global'}>
                          {log.college_name || 'Global'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground align-top">
                        <span className="block truncate" title={log.payload ? JSON.stringify(log.payload) : ''}>
                          {log.payload ? JSON.stringify(log.payload) : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/30 px-5 py-3 flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filteredSorted.length}
                {isFiltering && total !== filteredSorted.length && (
                  <span className="text-muted-foreground/70"> (filtered from {total})</span>
                )}
              </span>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(safePage - 1);
                      }}
                      aria-disabled={safePage === 1}
                      className={safePage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {pageItems.map((item, index) =>
                    item === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          href="#"
                          isActive={item === safePage}
                          onClick={(event) => {
                            event.preventDefault();
                            goToPage(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(safePage + 1);
                      }}
                      aria-disabled={safePage === totalPages}
                      className={safePage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
