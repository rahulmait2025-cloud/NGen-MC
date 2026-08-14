'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Pencil, XCircle, ArrowRight, Clock } from 'lucide-react';
import { withdrawApplicationAction } from '@/lib/actions/student-job-applications';
import type { JobApplicationWithJob } from '@/lib/services/student-jobs';
import { APPLICATION_STATUS_CONFIG } from './job-constants';

interface MyApplicationCardProps {
  application: JobApplicationWithJob;
  collegeSlug: string;
}

export function MyApplicationCard({ application, collegeSlug }: MyApplicationCardProps) {
  const [pending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState(application.status);

  const job = application.job_posts;
  const canEdit =
    job?.status === 'open' &&
    status !== 'withdrawn' &&
    status !== 'rejected';

  const canWithdraw =
    job?.status === 'open' &&
    status !== 'withdrawn' &&
    status !== 'rejected';

  const canReapply =
    job?.status === 'open' &&
    status === 'withdrawn';

  const statusConfig = APPLICATION_STATUS_CONFIG[status] ?? null;

  const handleWithdraw = () => {
    startTransition(async () => {
      const result = await withdrawApplicationAction(collegeSlug, application.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Application withdrawn.');
      setShowConfirm(false);
      setStatus('withdrawn');
    });
  };

  return (
    <Card className="group hover:border-primary/20 hover:shadow-md transition duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">
              {job?.company_name ?? 'Unknown Company'}
            </p>

            <Link
              href={`/c/${collegeSlug}/student/jobs/${application.job_id}`}
              className="text-lg font-semibold hover:text-primary transition-colors line-clamp-1"
            >
              {job?.title ?? 'Job'}
            </Link>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Applied {new Date(application.applied_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              {application.resume_path ? (
                <span className="flex items-center gap-1 text-success">
                  <FileText className="w-3.5 h-3.5" />
                  Resume uploaded
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">No resume</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {statusConfig && (
              <Badge variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
            )}

            <div className="flex items-center gap-1.5">
              {canReapply && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/c/${collegeSlug}/student/jobs/${application.job_id}/apply`}>
                    Re-apply
                  </Link>
                </Button>
              )}

              {canEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/c/${collegeSlug}/student/jobs/${application.job_id}/edit`}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Link>
                </Button>
              )}

              {canWithdraw && !showConfirm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/20 hover:bg-destructive/5"
                  onClick={() => setShowConfirm(true)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Withdraw
                </Button>
              )}

              {canWithdraw && showConfirm && (
                <div className="flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs text-destructive font-medium">Withdraw?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 px-2 text-xs"
                    onClick={handleWithdraw}
                    disabled={pending}
                  >
                    {pending ? '...' : 'Yes'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowConfirm(false)}
                    disabled={pending}
                  >
                    No
                  </Button>
                </div>
              )}

              <Button size="sm" variant="ghost" className="px-2 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                <Link href={`/c/${collegeSlug}/student/jobs/${application.job_id}`} aria-label={`View ${job?.title ?? 'job'}`}>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
