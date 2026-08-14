'use client';

import React, { useTransition, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createJobAction, updateJobAction } from '@/app/(app)/jobs/actions';
import type {
  JobPostWithColleges,
  JobStatus,
  JobVisibilityScope,
  JobWorkMode,
  JobEmploymentType,
} from '@/lib/superadmin/jobs/types';

interface College {
  id: string;
  name: string;
}

interface JobFormClientProps {
  mode: 'create' | 'edit';
  initialData?: JobPostWithColleges;
  colleges: College[];
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];

const VISIBILITY_OPTIONS: { value: JobVisibilityScope; label: string }[] = [
  { value: 'all_lms', label: 'All LMS Students' },
  { value: 'selected_colleges', label: 'Selected Colleges' },
  { value: 'global_only', label: 'Global / Direct Students Only' },
  { value: 'college_only', label: 'College Students Only' },
];

const WORK_MODE_OPTIONS: { value: JobWorkMode; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
];

const EMPLOYMENT_TYPE_OPTIONS: { value: JobEmploymentType; label: string }[] = [
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];

function arrayToNewlines(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return '';
  return arr.join('\n');
}

/** DB stores salary in paise; the form accepts whole rupees. */
function minorToRupees(minor: number | null | undefined): string {
  if (minor == null) return '';
  return String(minor / 100);
}

function rupeesToMinor(rupees: FormDataEntryValue | null): string {
  if (rupees == null || String(rupees).trim() === '') return '';
  return String(Math.round(Number(rupees) * 100));
}

interface JobFormState {
  visibilityScope: JobVisibilityScope;
  selectedCollegeIds: string[];
  applicationDeadline: Date | undefined;
  workMode: string;
  employmentType: string;
  jobStatus: JobStatus;
}

type JobFormAction =
  | { type: 'SET_VISIBILITY_SCOPE'; payload: JobVisibilityScope }
  | { type: 'TOGGLE_COLLEGE'; payload: string }
  | { type: 'SET_APPLICATION_DEADLINE'; payload: Date | undefined }
  | { type: 'SET_WORK_MODE'; payload: string }
  | { type: 'SET_EMPLOYMENT_TYPE'; payload: string }
  | { type: 'SET_JOB_STATUS'; payload: JobStatus };

function jobFormReducer(state: JobFormState, action: JobFormAction): JobFormState {
  switch (action.type) {
    case 'SET_VISIBILITY_SCOPE':
      return { ...state, visibilityScope: action.payload };
    case 'TOGGLE_COLLEGE': {
      const id = action.payload;
      return {
        ...state,
        selectedCollegeIds: state.selectedCollegeIds.includes(id)
          ? state.selectedCollegeIds.filter((cid) => cid !== id)
          : [...state.selectedCollegeIds, id],
      };
    }
    case 'SET_APPLICATION_DEADLINE':
      return { ...state, applicationDeadline: action.payload };
    case 'SET_WORK_MODE':
      return { ...state, workMode: action.payload };
    case 'SET_EMPLOYMENT_TYPE':
      return { ...state, employmentType: action.payload };
    case 'SET_JOB_STATUS':
      return { ...state, jobStatus: action.payload };
    default:
      return state;
  }
}

export function JobFormClient({ mode, initialData, colleges }: JobFormClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [{ visibilityScope, selectedCollegeIds, applicationDeadline, workMode, employmentType, jobStatus }, formDispatch] = useReducer(jobFormReducer, {
    visibilityScope: initialData?.visibility_scope ?? 'all_lms',
    selectedCollegeIds: initialData?.colleges?.map((c) => c.college_id) ?? [],
    applicationDeadline: initialData?.application_deadline ? new Date(initialData.application_deadline) : undefined,
    workMode: initialData?.work_mode ?? '',
    employmentType: initialData?.employment_type ?? '',
    jobStatus: initialData?.status ?? 'draft',
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    formData.set('work_mode', workMode);
    formData.set('employment_type', employmentType);
    formData.set('status', jobStatus);
    formData.set('visibility_scope', visibilityScope);
    formData.set('selected_college_ids', selectedCollegeIds.join(','));
    formData.set('application_deadline', applicationDeadline ? applicationDeadline.toISOString() : '');
    formData.set('salary_min_minor', rupeesToMinor(formData.get('salary_min_minor')));
    formData.set('salary_max_minor', rupeesToMinor(formData.get('salary_max_minor')));

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createJobAction(formData)
          : await updateJobAction(initialData!.id, formData);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'create' ? 'Job created.' : 'Job updated.');
      router.push('/jobs');
      router.refresh();
    });
  };

  const toggleCollege = (collegeId: string) => {
    formDispatch({ type: 'TOGGLE_COLLEGE', payload: collegeId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input id="title" name="title" defaultValue={initialData?.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input id="company_name" name="company_name" defaultValue={initialData?.company_name} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_website">Company Website</Label>
            <Input id="company_website" name="company_website" defaultValue={initialData?.company_website ?? ''} type="url" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_about">About the Company</Label>
            <Textarea id="company_about" name="company_about" rows={4} defaultValue={initialData?.company_about ?? ''} placeholder="Brief description about the company (shown to students on the job listing)" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={initialData?.location ?? ''} />
          </div>
        </CardContent>
      </Card>

      {/* Role Details */}
      <Card>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Work Mode</Label>
              <Select value={workMode} onValueChange={(v) => formDispatch({ type: 'SET_WORK_MODE', payload: v })}>
                <SelectTrigger id="work_mode">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={employmentType} onValueChange={(v) => formDispatch({ type: 'SET_EMPLOYMENT_TYPE', payload: v })}>
                <SelectTrigger id="employment_type">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience_level">Experience Level</Label>
            <Input id="experience_level" name="experience_level" defaultValue={initialData?.experience_level ?? ''} placeholder="e.g. 0-2 years, Fresher" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_min_minor">Min Salary (₹)</Label>
              <Input id="salary_min_minor" name="salary_min_minor" type="number" min="0" step="1" defaultValue={minorToRupees(initialData?.salary_min_minor)} placeholder="e.g. 25000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max_minor">Max Salary (₹)</Label>
              <Input id="salary_max_minor" name="salary_max_minor" type="number" min="0" step="1" defaultValue={minorToRupees(initialData?.salary_max_minor)} placeholder="e.g. 50000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_currency">Currency</Label>
              <Input id="salary_currency" name="salary_currency" defaultValue={initialData?.salary_currency ?? 'INR'} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openings">Openings</Label>
              <Input id="openings" name="openings" type="number" min="1" defaultValue={initialData?.openings ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <DateTimePicker
                value={applicationDeadline}
                onChange={(v) => formDispatch({ type: 'SET_APPLICATION_DEADLINE', payload: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Job Description *</Label>
            <Textarea id="description" name="description" rows={8} defaultValue={initialData?.description} required />
          </div>
        </CardContent>
      </Card>

      {/* Lists */}
      <Card>
        <CardHeader>
          <CardTitle>Details (one item per line)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="responsibilities">Responsibilities</Label>
            <Textarea id="responsibilities" name="responsibilities" rows={4} defaultValue={arrayToNewlines(initialData?.responsibilities)} placeholder="One responsibility per line" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea id="requirements" name="requirements" rows={4} defaultValue={arrayToNewlines(initialData?.requirements)} placeholder="One requirement per line" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Textarea id="skills" name="skills" rows={3} defaultValue={arrayToNewlines(initialData?.skills)} placeholder="One skill per line" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="perks">Perks</Label>
            <Textarea id="perks" name="perks" rows={3} defaultValue={arrayToNewlines(initialData?.perks)} placeholder="One perk per line" />
          </div>
        </CardContent>
      </Card>

      {/* Visibility & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={jobStatus} onValueChange={(value: JobStatus) => formDispatch({ type: 'SET_JOB_STATUS', payload: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility Scope</Label>
              <Select value={visibilityScope} onValueChange={(value: JobVisibilityScope) => formDispatch({ type: 'SET_VISIBILITY_SCOPE', payload: value })}>
                <SelectTrigger id="visibility_scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {visibilityScope === 'selected_colleges' && (
            <div className="space-y-2">
              <Label>Select Colleges</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {colleges.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active colleges found.</p>
                )}
                {colleges.map((college) => (
                  <label key={college.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCollegeIds.includes(college.id)}
                      onChange={() => toggleCollege(college.id)}
                      className="rounded border-input"
                    />
                    {college.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : mode === 'create' ? 'Create Job' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/jobs')} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
