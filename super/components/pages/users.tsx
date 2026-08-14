'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { ShieldAlert, MailPlus, Search, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';
import type { UserListItem } from '@/lib/services/users';

const PAGE_SIZE = 25;

type SortKey = 'full_name' | 'email' | 'role' | 'college_name' | 'status';
type SortDir = 'asc' | 'desc';

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

function compareValues(a: string, b: string, dir: SortDir): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  return dir === 'asc' ? cmp : -cmp;
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

export const UsersPage = React.memo(function UsersPage({
  initialUsers = [],
}: {
  initialUsers?: UserListItem[];
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? initialUsers.filter((row) => {
          return (
            (row.full_name ?? '').toLowerCase().includes(q) ||
            (row.email ?? '').toLowerCase().includes(q) ||
            row.role.toLowerCase().includes(q) ||
            (row.college_name ?? '').toLowerCase().includes(q) ||
            row.status.toLowerCase().includes(q)
          );
        })
      : initialUsers;
    return filtered.toSorted((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return compareValues(av, bv, sortDir);
    });
  }, [initialUsers, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, safePage]);

  const pageItems = useMemo(() => buildPageItems(safePage, totalPages), [safePage, totalPages]);

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === safePage) return;
    setPage(next);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const rangeStart = filteredSorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredSorted.length);
  const isFiltering = search.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => toast.info('Permission Matrix (UI-only)')}>
            <ShieldAlert className="size-3.5 mr-1" /> Permission Matrix
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Invite Admin — use Colleges page')}>
            <MailPlus className="size-3.5 mr-1" /> Invite Admin
          </Button>
          <Button size="sm" onClick={() => toast.info('Create Role (UI-only)')}>
            + Create Role
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {filteredSorted.length}
          {isFiltering && initialUsers.length !== filteredSorted.length && (
            <span className="text-muted-foreground/70"> (filtered from {initialUsers.length})</span>
          )}
        </p>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search by name, email, role, college, status…"
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
      <section className="rounded-xl border border-border bg-background p-4 min-w-0 overflow-x-auto">
        <Table className="row-enter">
          <TableHeader>
            <TableRow>
              <SortableHeader label="Name" sortKey="full_name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Email" sortKey="email" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <SortableHeader label="Role" sortKey="role" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader label="College" sortKey="college_name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
              <SortableHeader label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users with college memberships yet. Invite admins from the Colleges page.
                </TableCell>
              </TableRow>
            ) : pagedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users match “{search}”.
                </TableCell>
              </TableRow>
            ) : (
              pagedUsers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.full_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{row.email ?? '—'}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.college_name ?? '—'}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
      {totalPages > 1 && (
        <Pagination>
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
              )
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
      )}
    </div>
  );
});
