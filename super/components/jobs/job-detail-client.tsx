'use client';

import React, { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { updateJobStatusAction, deleteJobAction } from '@/app/(app)/jobs/actions';
import type {
  JobPostWithColleges,
  JobStatus,
} from '@/lib/superadmin/jobs/types';

import { Users, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_BADGE_VARIANTS: Record<JobStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-red-100 text-red-800',
  archived: 'bg-purple-100 text-purple-800',
};

interface JobDetailClientProps {
  job: JobPostWithColleges;
  applicantCount?: number;
}

function formatJobSalary(minor: number | null, currency: string): string | null {
  if (minor == null) return null;
  const major = minor / 100;
  return `${currency} ${major.toLocaleString('en-IN')}`;
}

export function JobDetailClient({ job, applicantCount = 0 }: JobDetailClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleStatusChange = (newStatus: JobStatus) => {
    startTransition(async () => {
      const result = await updateJobStatusAction(job.id, newStatus);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Job ${newStatus}.`);
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteJobAction(job.id);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete job.');
        return;
      }
      toast.success('Job deleted successfully.');
      setShowDeleteDialog(false);
      router.push('/jobs');
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground">{job.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_BADGE_VARIANTS[job.status]}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Badge>
          <Badge variant="outline">{job.visibility_scope.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push(`/jobs/${job.id}/edit`)}>
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/jobs/${job.id}/applications`)}>
          <Users className="size-4 mr-1.5" />
          Applicants{applicantCount > 0 ? ` (${applicantCount})` : ''}
        </Button>
        {job.status !== 'open' && (
          <Button
            variant="outline"
            size="sm"
            className="text-green-700 border-green-300 hover:bg-green-50"
            onClick={() => handleStatusChange('open')}
            disabled={pending}
          >
            Publish
          </Button>
        )}
        {job.status === 'open' && (
          <Button
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
            onClick={() => handleStatusChange('paused')}
            disabled={pending}
          >
            Pause
          </Button>
        )}
        {job.status !== 'closed' && job.status !== 'archived' && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-50"
            onClick={() => handleStatusChange('closed')}
            disabled={pending}
          >
            Close
          </Button>
        )}
        {job.status !== 'archived' && (
          <Button
            variant="outline"
            size="sm"
            className="text-purple-700 border-purple-300 hover:bg-purple-50"
            onClick={() => handleStatusChange('archived')}
            disabled={pending}
          >
            Archive
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={() => setShowDeleteDialog(true)}
          disabled={pending}
        >
          <Trash2 className="size-4 mr-1.5" />
          Delete
        </Button>
      </div>

      <Separator />

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Company:</span> {job.company_name}</div>
            {job.company_website && (
              <div>
                <span className="text-muted-foreground">Website:</span>{' '}
                <a href={job.company_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {job.company_website}
                </a>
              </div>
            )}
            {job.location && <div><span className="text-muted-foreground">Location:</span> {job.location}</div>}
            {job.work_mode && <div><span className="text-muted-foreground">Work Mode:</span> {job.work_mode}</div>}
            {job.employment_type && <div><span className="text-muted-foreground">Type:</span> {job.employment_type.replace(/_/g, ' ')}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compensation & Openings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {job.salary_min_minor != null && (
              <div>
                <span className="text-muted-foreground">Salary Range:</span>{' '}
                {formatJobSalary(job.salary_min_minor, job.salary_currency)}
                {job.salary_max_minor != null && ` – ${formatJobSalary(job.salary_max_minor, job.salary_currency)}`}
              </div>
            )}
            {job.experience_level && <div><span className="text-muted-foreground">Experience:</span> {job.experience_level}</div>}
            {job.openings != null && <div><span className="text-muted-foreground">Openings:</span> {job.openings}</div>}
            {job.application_deadline && (
              <div>
                <span className="text-muted-foreground">Deadline:</span>{' '}
                {new Date(job.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {job.published_at && (
              <div>
                <span className="text-muted-foreground">Published:</span>{' '}
                {new Date(job.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{job.description}</div>
        </CardContent>
      </Card>

      {/* Lists */}
      {(job.responsibilities?.length || job.requirements?.length || job.skills?.length || job.perks?.length) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {job.responsibilities?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {job.responsibilities.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
          {job.requirements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {job.requirements.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
          {job.skills?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {job.perks?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {job.perks.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Targeted Colleges */}
      {job.visibility_scope === 'selected_colleges' && job.colleges && job.colleges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Targeted Colleges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {job.colleges.map((c) => (
                <Badge key={c.college_id} variant="outline">{c.college_name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job &quot;{job.title}&quot; and remove all associated applications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {pending ? 'Deleting...' : 'Delete Job'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
