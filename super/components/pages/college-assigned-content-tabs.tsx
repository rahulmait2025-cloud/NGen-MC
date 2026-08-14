'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AssignmentRevokeButton } from '@/app/(app)/assignments/assignment-revoke-button';
import type { AssignmentWithDetails } from '@/lib/services/content-assignments';
import { School, BookOpen, Layers, Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function isExpiringSoon(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return end > now && end - now <= thirtyDays;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function entityTitle(a: AssignmentWithDetails) {
  return a.master_course?.title ?? a.variant?.title ?? a.bundle?.title ?? 'Missing content';
}

function entityCode(a: AssignmentWithDetails) {
  return a.master_course?.code ?? a.variant?.code ?? a.bundle?.code ?? '-';
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    expired: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    revoked: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  };
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium capitalize', styles[status] ?? 'bg-muted text-muted-foreground')}>
      {status}
    </Badge>
  );
}

type TabKey = 'all' | 'courses' | 'variants' | 'bundles';

interface CollegeAssignedContentTabsProps {
  assignments: AssignmentWithDetails[];
  collegeId: string;
}

export function CollegeAssignedContentTabs({ assignments, collegeId }: CollegeAssignedContentTabsProps) {
  const [tab, setTab] = useState<TabKey>('all');

  const groups = useMemo(() => ({
    all: assignments,
    courses: assignments.filter((a) => a.assigned_entity_type === 'master_course'),
    variants: assignments.filter((a) => a.assigned_entity_type === 'variant'),
    bundles: assignments.filter((a) => a.assigned_entity_type === 'bundle'),
  }), [assignments]);

  const stats = useMemo(() => ({
    active: assignments.filter((a) => a.status === 'active').length,
    expiringSoon: assignments.filter((a) => isExpiringSoon(a.end_date)).length,
  }), [assignments]);

  const current = groups[tab];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tabular-nums">{assignments.length}</span>
          <span className="text-muted-foreground">assigned</span>
        </div>
        <div className="h-4 w-px bg-border/40" />
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{stats.active}</span>
          <span className="text-muted-foreground">active</span>
        </div>
        {stats.expiringSoon > 0 && (
          <>
            <div className="h-4 w-px bg-border/40" />
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
              <span className="text-xl font-semibold tabular-nums">{stats.expiringSoon}</span>
              <span className="text-muted-foreground">expiring soon</span>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="bg-transparent p-0 gap-1">
          {[
            { key: 'all' as TabKey, label: 'All', icon: Layers, count: groups.all.length },
            { key: 'courses' as TabKey, label: 'Courses', icon: BookOpen, count: groups.courses.length },
            { key: 'variants' as TabKey, label: 'Variants', icon: School, count: groups.variants.length },
            { key: 'bundles' as TabKey, label: 'Bundles', icon: Package, count: groups.bundles.length },
          ].map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60 text-muted-foreground data-[state=active]:text-foreground"
            >
              <t.icon className="size-3.5 mr-1.5" />
              {t.label}
              <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">{t.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(['all', 'courses', 'variants', 'bundles'] as TabKey[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            {current.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No {key === 'all' ? '' : key} assignments found.
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 pl-4">Content</TableHead>
                      <TableHead className="h-10">Status</TableHead>
                      <TableHead className="h-10">Dates</TableHead>
                      <TableHead className="h-10 pr-4 text-right"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current.map((a) => (
                      <TableRow key={a.id} className="border-border/20">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 shrink-0 font-mono">
                              {a.assigned_entity_type.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-medium truncate">{entityTitle(a)}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono ml-[calc(4.5rem+0.5rem)]">{entityCode(a)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {statusBadge(a.status)}
                            {!entityTitle(a) && (
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Missing</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(a.start_date)} - {formatDate(a.end_date)}
                          </div>
                          {isExpiringSoon(a.end_date) && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Expiring soon</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <AssignmentRevokeButton
                            assignmentId={a.id}
                            collegeId={collegeId}
                            buttonLabel="Revoke"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
