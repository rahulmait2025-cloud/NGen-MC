'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Pencil, Search, Building2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import type { CollegeWithCounts } from '@/lib/services/colleges';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'suspended', label: 'Suspended' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface CollegesTableProps {
  initialColleges: CollegeWithCounts[];
  onInvite?: (college: CollegeWithCounts) => void;
  onEdit?: (college: CollegeWithCounts) => void;
  onCreate?: () => void;
}

const DEFAULT_ON_INVITE = () => { };
const DEFAULT_ON_EDIT = () => { };
const DEFAULT_ON_CREATE = () => { };

export function CollegesTable({
  initialColleges,
  onInvite = DEFAULT_ON_INVITE,
  onEdit = DEFAULT_ON_EDIT,
  onCreate = DEFAULT_ON_CREATE,
}: CollegesTableProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialColleges.filter((college) => {
      if (filter !== 'all' && college.status !== filter) return false;
      if (!q) return true;
      return (
        college.name.toLowerCase().includes(q) ||
        college.slug.toLowerCase().includes(q) ||
        (college.short_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [initialColleges, filter, search]);

  return (
    <Card className="col-span-12 min-w-0 card-tier-1 border-0 overflow-hidden">
      <div className="bg-gradient-to-r from-primary/[0.06] to-transparent px-6 py-4 border-b border-border/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">Partner colleges</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">Your active tenant infrastructure</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={onCreate} className="shrink-0 h-9 text-xs font-semibold px-4 shadow-sm hover:shadow-lg hover:shadow-primary/20 transition-[box-shadow,transform] duration-160 active:scale-[0.98]">
            <Building2 className="size-3.5 mr-2" />
            Add new college
          </Button>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border/30">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-lg transition-[background-color,color,transform] duration-160 active:scale-[0.97]",
                  filter === tab.key
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-[260px] w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
            <Input
              placeholder="Search colleges..."
              className="h-9 w-full bg-muted/20 border-border/30 text-xs placeholder:text-muted-foreground/50 focus:ring-primary/20 transition-[border-color,box-shadow,background-color] pl-10 pr-4 rounded-xl"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto scrollbar-hide">
          <Table className="border-separate border-spacing-y-1.5 min-w-[840px] row-enter">
            <TableHeader>
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-[20%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 h-auto pb-3 px-2">College name</TableHead>
                <TableHead className="w-[15%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 h-auto pb-3 px-2">Identifier</TableHead>
                <TableHead className="w-[10%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 h-auto pb-3 px-2 text-center">Admins</TableHead>
                <TableHead className="w-[10%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 h-auto pb-3 px-2 text-center">Students</TableHead>
                <TableHead className="w-[12%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 h-auto pb-3 px-2">Onboarded</TableHead>
                <TableHead className="w-[10%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 h-auto pb-3 px-2">Status</TableHead>
                <TableHead className="w-[23%] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 h-auto pb-3 text-right px-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="border-none">
                  <TableCell colSpan={7} className="py-16 text-center bg-muted/15 rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="size-8 text-muted-foreground/30" />
                      <p className="text-sm font-semibold text-muted-foreground">No matching colleges found</p>
                      <p className="text-xs text-muted-foreground/60">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((college, i) => (
                  <TableRow key={college.id} className="border-none group/row relative row-enter" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px', animationDelay: `${i * 40}ms` }}>
                    <TableCell className="bg-muted/15 first:rounded-l-lg px-5 py-3 align-middle transition-colors group-hover/row:bg-primary/[0.04] relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 group-hover/row:h-5 bg-primary rounded-r-full transition-[height] duration-200" />
                      <Link href={`/colleges/${college.id}`} className="text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                        {college.name}
                        <ChevronRight className="size-3 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    </TableCell>
                    <TableCell className="bg-muted/15 p-3 align-middle transition-colors group-hover/row:bg-primary/[0.04]">
                      <span className="text-[10px] font-mono font-semibold bg-muted/40 px-2 py-1 rounded-md text-muted-foreground">
                        {college.slug}
                      </span>
                    </TableCell>
                    <TableCell className="bg-muted/15 p-3 align-middle text-center transition-colors group-hover/row:bg-primary/[0.04]">
                      <span className="text-xs font-semibold font-mono tabular-nums">{college.admins_count ?? 0}</span>
                    </TableCell>
                    <TableCell className="bg-muted/15 p-3 align-middle text-center transition-colors group-hover/row:bg-primary/[0.04]">
                      <span className="text-xs font-semibold font-mono tabular-nums">{college.students_count ?? 0}</span>
                    </TableCell>
                    <TableCell className="bg-muted/15 p-3 align-middle transition-colors group-hover/row:bg-primary/[0.04]">
                      <span className="text-xs text-muted-foreground font-medium">{formatDate(college.created_at)}</span>
                    </TableCell>
                    <TableCell className="bg-muted/15 p-3 align-middle transition-colors group-hover/row:bg-primary/[0.04]">
                      <StatusBadge status={college.status} />
                    </TableCell>
                    <TableCell className="bg-muted/15 last:rounded-r-lg px-5 py-3 align-middle text-right transition-colors group-hover/row:bg-primary/[0.04]">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-[background-color,color,transform] duration-160 active:scale-95 rounded-lg"
                          onClick={() => onInvite(college)}
                        >
                          <UserPlus className="size-3.5 mr-1.5" /> Invite
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-[background-color,color,transform] duration-160 active:scale-95 rounded-lg"
                          aria-label={`Edit ${college.name}`}
                          onClick={() => onEdit(college)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
