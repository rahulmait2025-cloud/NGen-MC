'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
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
import { FileText, Pencil, XCircle, ArrowRight, Clock, Building2 } from 'lucide-react';
import { withdrawApplicationAction } from '@/lib/actions/student-job-applications';
import type { JobApplicationWithJob } from '@/lib/services/student-jobs';
import { APPLICATION_STATUS_CONFIG } from '@/components/jobs/job-constants';

interface MyApplicationsTableProps {
  applications: JobApplicationWithJob[];
  collegeSlug: string;
}

export default function MyApplicationsTable({
  applications,
  collegeSlug,
}: MyApplicationsTableProps) {
  const [pending, startTransition] = useTransition();
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);
  const [localApplications, setLocalApplications] = useState(applications);

  const handleWithdraw = (applicationId: string) => {
    startTransition(async () => {
      const result = await withdrawApplicationAction(collegeSlug, applicationId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Application withdrawn.');
      setConfirmWithdrawId(null);
      setLocalApplications((prev) =>
        prev.filter((app) => app.id !== applicationId)
      );
    });
  };

  if (localApplications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
          <FileText className="size-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">
          No active applications yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          When you apply to a job, your applications will appear here.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/c/${collegeSlug}/student/jobs`}>
            Browse jobs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/30">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow>
            <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground/80 py-3">
              Role & Company
            </TableHead>
            <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground/80 py-3">
              Applied Date
            </TableHead>
            <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground/80 py-3">
              Resume Status
            </TableHead>
            <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground/80 py-3 text-center">
              Status
            </TableHead>
            <TableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground/80 py-3 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localApplications.map((app) => {
            const job = app.job_posts;
            const statusConfig = APPLICATION_STATUS_CONFIG[app.status] ?? null;

            const canEdit =
              job?.status === 'open' &&
              app.status !== 'withdrawn' &&
              app.status !== 'rejected';

            const canWithdraw =
              job?.status === 'open' &&
              app.status !== 'withdrawn' &&
              app.status !== 'rejected';

            const canReapply =
              job?.status === 'open' &&
              app.status === 'withdrawn';

            const isConfirmingWithdraw = confirmWithdrawId === app.id;

            return (
              <TableRow key={app.id} className="group hover:bg-muted/10 transition-colors">
                {/* Role & Company */}
                <TableCell className="py-3.5">
                  <div className="flex flex-col min-w-0">
                    <Link
                      href={`/c/${collegeSlug}/student/jobs/${app.job_id}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-1 text-sm text-foreground"
                    >
                      {job?.title ?? 'Job'}
                    </Link>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3 inline shrink-0" />
                      {job?.company_name ?? 'Unknown Company'}
                    </span>
                  </div>
                </TableCell>

                {/* Applied Date */}
                <TableCell className="py-3.5">
                  <span className="text-sm text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {new Date(app.applied_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </TableCell>

                {/* Resume Status */}
                <TableCell className="py-3.5">
                  {app.resume_path ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      Uploaded
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">No Resume</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell className="py-3.5 text-center">
                  {statusConfig ? (
                    <Badge variant={statusConfig.variant} className="font-semibold text-xs py-0.5 px-2.5">
                      {statusConfig.label}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal text-muted-foreground border-border/40 py-0.5 px-2.5">
                      Pending
                    </Badge>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {canReapply && (
                      <Button size="sm" variant="outline" className="h-8 text-xs font-medium" asChild>
                        <Link href={`/c/${collegeSlug}/student/jobs/${app.job_id}/apply`}>
                          Re-apply
                        </Link>
                      </Button>
                    )}

                    {canEdit && !isConfirmingWithdraw && (
                      <Button size="sm" variant="outline" className="h-8 text-xs font-medium" asChild>
                        <Link href={`/c/${collegeSlug}/student/jobs/${app.job_id}/edit`}>
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Link>
                      </Button>
                    )}

                    {canWithdraw && !isConfirmingWithdraw && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-medium text-destructive border-destructive/20 hover:bg-destructive/5"
                        onClick={() => setConfirmWithdrawId(app.id)}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Withdraw
                      </Button>
                    )}

                    {isConfirmingWithdraw && (
                      <div className="flex items-center gap-1 bg-destructive/5 border border-destructive/20 rounded px-1.5 py-0.5 h-8">
                        <span className="text-[10px] text-destructive font-medium mr-1">Withdraw?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => handleWithdraw(app.id)}
                          disabled={pending}
                        >
                          Yes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => setConfirmWithdrawId(null)}
                          disabled={pending}
                        >
                          No
                        </Button>
                      </div>
                    )}

                    <Button size="sm" variant="ghost" className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                      <Link href={`/c/${collegeSlug}/student/jobs/${app.job_id}`} aria-label="View Details">
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
