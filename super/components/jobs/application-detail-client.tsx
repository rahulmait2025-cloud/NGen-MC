'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ExternalLink, Save } from 'lucide-react';
import { getResumeSignedUrlAction, updateApplicationNotesAction, updateRejectionReasonAction } from '@/app/(app)/jobs/applications/actions';
import { ApplicationStatusSelect } from './application-status-select';
import { ApplicationStatusTimeline } from './application-status-timeline';
import { ApplicantLearningSnapshotCard } from './applicant-learning-snapshot';
import type { ApplicantWithDetails, StatusHistoryRow } from '@/lib/superadmin/jobs/applicant-queries';
import type { ApplicantLearningSnapshot } from '@/lib/superadmin/jobs/applicant-analytics';

const STATUS_BADGE_STYLES: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  shortlisted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  assessment: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  selected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
};

interface ApplicationDetailClientProps {
  application: ApplicantWithDetails;
  statusHistory: StatusHistoryRow[];
  learningSnapshot: ApplicantLearningSnapshot;
}

export function ApplicationDetailClient({ application, statusHistory, learningSnapshot }: ApplicationDetailClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState(application.admin_notes ?? '');
  const [rejectionReason, setRejectionReason] = useState(application.rejection_reason ?? '');

  const handleResumeClick = async () => {
    if (!application.resume_path) return;
    const result = await getResumeSignedUrlAction(application.resume_path);
    if (!result.success || !result.data) {
      toast.error(result.error ?? 'Could not open resume.');
      return;
    }
    window.open(result.data.url, '_blank');
  };

  const handleSaveNotes = () => {
    startTransition(async () => {
      const result = await updateApplicationNotesAction(application.id, adminNotes);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Notes saved.');
      router.refresh();
    });
  };

  const handleSaveRejectionReason = () => {
    startTransition(async () => {
      const result = await updateRejectionReasonAction(application.id, rejectionReason);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Rejection reason saved.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{application.student_name ?? 'Unknown Student'}</h1>
          <p className="text-muted-foreground">
            Applied for {application.job_title} at {application.job_company}
          </p>
        </div>
        <Badge className={STATUS_BADGE_STYLES[application.status] ?? ''}>
          {application.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Status Update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          {application.status === 'withdrawn' ? (
            <p className="text-sm text-muted-foreground">
              Withdrawn applications cannot be moved in pipeline.
            </p>
          ) : (
            <ApplicationStatusSelect
              applicationId={application.id}
              currentStatus={application.status}
            />
          )}
        </CardContent>
      </Card>

      {/* Student Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {application.student_name ?? 'Unknown'}</div>
            <div><span className="text-muted-foreground">Email:</span> {application.student_email ?? '—'}</div>
            <div>
              <span className="text-muted-foreground">College:</span>{' '}
              {application.college_name ?? (
                <Badge variant="outline" className="text-xs">Global Student</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Applied:</span>{' '}
              {new Date(application.applied_at).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
            {application.last_edited_at && (
              <div>
                <span className="text-muted-foreground">Last Edited:</span>{' '}
                {new Date(application.last_edited_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </div>
            )}
            {application.withdrawn_at && (
              <div>
                <span className="text-muted-foreground">Withdrawn:</span>{' '}
                {new Date(application.withdrawn_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Edit Count:</span> {application.student_edit_count}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resume</CardTitle>
        </CardHeader>
        <CardContent>
          {application.resume_path ? (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {application.resume_file_name ?? 'resume.pdf'}
                </p>
                {application.resume_size_bytes && (
                  <p className="text-xs text-muted-foreground">
                    {(application.resume_size_bytes / 1024).toFixed(0)} KB
                  </p>
                )}
              </div>
              <Button size="sm" onClick={handleResumeClick}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                View Resume
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {application.status === 'withdrawn'
                ? 'Resume removed by student withdrawal.'
                : 'No resume uploaded.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Links & Cover Note */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {application.github_url && (
              <div>
                <span className="text-muted-foreground">GitHub:</span>{' '}
                <a href={application.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {application.github_url}
                </a>
              </div>
            )}
            {application.linkedin_url && (
              <div>
                <span className="text-muted-foreground">LinkedIn:</span>{' '}
                <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {application.linkedin_url}
                </a>
              </div>
            )}
            {application.portfolio_url && (
              <div>
                <span className="text-muted-foreground">Portfolio:</span>{' '}
                <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {application.portfolio_url}
                </a>
              </div>
            )}
            {!application.github_url && !application.linkedin_url && !application.portfolio_url && (
              <p className="text-muted-foreground">No links provided.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cover Note</CardTitle>
          </CardHeader>
          <CardContent>
            {application.cover_note ? (
              <p className="text-sm whitespace-pre-wrap">{application.cover_note}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No cover note provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add private admin notes about this applicant..."
            rows={3}
          />
          <Button size="sm" onClick={handleSaveNotes} disabled={pending}>
            <Save className="w-3.5 h-3.5 mr-1" />
            {pending ? 'Saving...' : 'Save Notes'}
          </Button>
        </CardContent>
      </Card>

      {/* Rejection Reason */}
      {application.status === 'rejected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
            />
            <Button size="sm" variant="outline" onClick={handleSaveRejectionReason} disabled={pending}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {pending ? 'Saving...' : 'Save Reason'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationStatusTimeline history={statusHistory} />
        </CardContent>
      </Card>

      {/* Learning & Activity Snapshot */}
      <ApplicantLearningSnapshotCard snapshot={learningSnapshot} />
    </div>
  );
}
