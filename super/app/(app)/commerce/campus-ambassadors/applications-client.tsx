'use client';

import { useState, useCallback, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { AmbassadorApplicationRow } from '@/lib/services/campus-ambassador-admin';
import { approveApplication, rejectApplication } from './actions';

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

interface ApplicationsClientProps {
  pendingApps: AmbassadorApplicationRow[];
  pendingCount: number;
  approvedApps: AmbassadorApplicationRow[];
  rejectedApps: AmbassadorApplicationRow[];
  totalApproved: number;
  totalRejected: number;
}

export function ApplicationsClient({
  pendingApps: initialPending,
  pendingCount: initialPendingCount,
  approvedApps,
  rejectedApps,
  totalApproved,
  totalRejected,
}: ApplicationsClientProps) {
  const [activeView, setActiveView] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [pendingApps, setPendingApps] = useState(initialPending);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const apps =
    activeView === 'approved' ? approvedApps : activeView === 'rejected' ? rejectedApps : pendingApps;

  const handleCardClick = useCallback((view: 'pending' | 'approved' | 'rejected') => {
    setActiveView(view);
  }, []);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, view: 'pending' | 'approved' | 'rejected') => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveView(view);
      }
    },
    [],
  );

  function handleApprove(app: AmbassadorApplicationRow) {
    setBusyId(app.id);
    startTransition(async () => {
      const result = await approveApplication(app.id);
      setBusyId(null);
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to approve application');
        return;
      }
      setPendingApps((prev) => prev.filter((row) => row.id !== app.id));
      setPendingCount((count) => Math.max(0, count - 1));
      toast.success(`Approved ${app.full_name}`);
    });
  }

  function handleReject(app: AmbassadorApplicationRow) {
    setBusyId(app.id);
    startTransition(async () => {
      const result = await rejectApplication(app.id);
      setBusyId(null);
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to reject application');
        return;
      }
      setPendingApps((prev) => prev.filter((row) => row.id !== app.id));
      setPendingCount((count) => Math.max(0, count - 1));
      toast.success(`Rejected ${app.full_name}`);
    });
  }

  const filters = [
    {
      key: 'pending' as const,
      label: 'Pending',
      count: pendingCount,
      icon: Clock,
      activeColor: 'border-primary/40 bg-primary/[0.04]',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      key: 'approved' as const,
      label: 'Approved',
      count: totalApproved,
      icon: CheckCircle2,
      activeColor: 'border-emerald-500/40 bg-emerald-500/[0.04]',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      key: 'rejected' as const,
      label: 'Rejected',
      count: totalRejected,
      icon: XCircle,
      activeColor: 'border-red-500/40 bg-red-500/[0.04]',
      iconBg: 'bg-red-500/10 text-red-600',
    },
  ];

  return (
    <>
      <div className="flex gap-2">
        {filters.map((f) => {
          const Icon = f.icon;
          const isActive = activeView === f.key;
          return (
            <button
              key={f.key}
              type="button"
              className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? f.activeColor
                  : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
              onClick={() => handleCardClick(f.key)}
              onKeyDown={(e) => handleCardKeyDown(e, f.key)}
            >
              <div className={`flex size-7 items-center justify-center rounded-md ${f.iconBg}`}>
                <Icon className="size-3.5" />
              </div>
              <span>{f.label}</span>
              <span
                className={`ml-0.5 text-xs font-semibold tabular-nums ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <TableHead className="text-xs font-medium text-muted-foreground/70 pl-5 py-2.5">
                Name
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5">
                Email
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5">
                College
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5">
                Applied
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5">
                Status
              </TableHead>
              {activeView === 'pending' ? (
                <TableHead className="text-xs font-medium text-muted-foreground/70 pr-5 py-2.5 text-right">
                  Actions
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeView === 'pending' ? 6 : 5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No {activeView} applications</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              apps.map((app) => (
                <TableRow key={app.id} className="border-b border-border/30 last:border-0">
                  <TableCell className="py-3 pl-5 font-medium text-sm">{app.full_name}</TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">{app.email}</TableCell>
                  <TableCell className="py-3 text-sm">{app.college_name}</TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                    {fmtDate(app.created_at)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border capitalize ${
                        app.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : app.status === 'rejected'
                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                      }`}
                    >
                      {app.status === 'submitted' ? 'pending' : app.status}
                    </Badge>
                  </TableCell>
                  {activeView === 'pending' ? (
                    <TableCell className="py-3 pr-5">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending && busyId === app.id}
                          onClick={() => handleReject(app)}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={isPending && busyId === app.id}
                          onClick={() => handleApprove(app)}
                        >
                          {isPending && busyId === app.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
