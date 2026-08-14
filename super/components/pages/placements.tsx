'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PlacementRow } from '@/lib/services/ops-pages';

export const PlacementsPage = React.memo(function PlacementsPage({ rows = [] }: { rows?: PlacementRow[] }) {
  const [statusFilter, setStatusFilter] = useState('All');

  const statuses = useMemo(() => ['All', ...Array.from(new Set(rows.map((row) => row.placement_status)))], [rows]);
  const filtered = useMemo(() => {
    if (statusFilter === 'All') return rows;
    return rows.filter((row) => row.placement_status === statusFilter);
  }, [rows, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {statuses.map((status) => (
          <Button key={status} size="sm" variant={statusFilter === status ? 'default' : 'outline'} onClick={() => setStatusFilter(status)}>
            {status}
          </Button>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-background p-4 min-w-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No placement records found in DB.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.student_name}</TableCell>
                  <TableCell>{row.college_name}</TableCell>
                  <TableCell>{row.placement_status}</TableCell>
                  <TableCell className="text-muted-foreground" suppressHydrationWarning>{new Date(row.updated_at).toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
});
