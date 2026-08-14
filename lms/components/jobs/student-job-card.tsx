'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Briefcase, Building2, ArrowRight } from 'lucide-react';
import type { JobPost } from '@/lib/services/student-jobs';
import {
  WORK_MODE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  APPLICATION_STATUS_CONFIG,
} from '@/components/jobs/job-constants';

interface StudentJobCardProps {
  job: JobPost;
  collegeSlug: string;
  applicationStatus?: string | null;
}

export const StudentJobCard = React.memo(function StudentJobCard({
  job,
  collegeSlug,
  applicationStatus,
}: StudentJobCardProps) {
  const deadline = useMemo(
    () =>
      job.application_deadline
        ? new Date(job.application_deadline).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : null,
    [job.application_deadline]
  );

  const isDeadlinePassed = useMemo(
    () =>
      job.application_deadline
        ? new Date(job.application_deadline) < new Date()
        : false,
    [job.application_deadline]
  );

  const statusConfig = applicationStatus
    ? APPLICATION_STATUS_CONFIG[applicationStatus]
    : null;

  return (
    <Card
      className="group hover:border-primary/20 hover:shadow-md transition duration-200"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="size-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="size-4 text-primary/60" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{job.company_name}</p>
              </div>
            </div>

            <Link
              href={`/c/${collegeSlug}/student/jobs/${job.id}`}
              className="text-lg font-semibold hover:text-primary transition-colors line-clamp-1"
            >
              {job.title}
            </Link>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-sm text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </span>
              )}
              {job.work_mode && (
                <span>{WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}</span>
              )}
              {job.employment_type && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                </span>
              )}
              {deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {isDeadlinePassed ? (
                    <span className="text-destructive font-medium">Deadline passed</span>
                  ) : (
                    <>Deadline: {deadline}</>
                  )}
                </span>
              )}
            </div>

            {job.skills && job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {job.skills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs font-normal">
                    {skill}
                  </Badge>
                ))}
                {job.skills.length > 5 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    +{job.skills.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {statusConfig && (
              <Badge variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
            )}

            <Button size="sm" variant={statusConfig ? 'outline' : 'default'} asChild>
              <Link href={`/c/${collegeSlug}/student/jobs/${job.id}`} className="gap-1.5">
                {statusConfig ? 'View' : 'Apply'}
                <ArrowRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
