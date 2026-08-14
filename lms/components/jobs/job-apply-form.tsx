'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link2, Send, ExternalLink, AlertCircle } from 'lucide-react';
import {
  applyToJobAction,
  editApplicationAction,
} from '@/lib/actions/student-job-applications';
import type { JobApplication } from '@/lib/services/student-jobs';

interface JobApplyFormProps {
  collegeSlug: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  existingApplication?: JobApplication | null;
  mode: 'apply' | 'edit';
}

export function JobApplyForm({
  collegeSlug,
  jobId,
  jobTitle: _jobTitle,
  companyName: _companyName,
  existingApplication,
  mode,
}: JobApplyFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resumeUrl, setResumeUrl] = useState(existingApplication?.resume_path ?? '');
  const [linkConfirmed, setLinkConfirmed] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (mode === 'apply' && !resumeUrl.trim()) {
      toast.error('Please paste your resume link.');
      return;
    }

    if (resumeUrl.trim() && !linkConfirmed) {
      toast.error('Please confirm that your resume link is publicly accessible.');
      return;
    }

    formData.set('resume_url', resumeUrl.trim());

    startTransition(async () => {
      let result;

      if (mode === 'apply') {
        result = await applyToJobAction(collegeSlug, jobId, formData);
      } else {
        result = await editApplicationAction(collegeSlug, existingApplication!.id, formData);
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === 'apply' ? 'Application submitted!' : 'Application updated.');
      router.push(`/c/${collegeSlug}/student/my-applications`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
              1
            </span>
            About You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cover_note" className="text-sm font-bold">
              Cover Note <span className="font-bold">(write in your own words — no AI-generated letters)</span>
            </Label>
            <Textarea
              id="cover_note"
              name="cover_note"
              rows={4}
              defaultValue={existingApplication?.cover_note ?? ''}
              placeholder="Why are you a good fit for this role? Share relevant experience, projects, or what excites you about this opportunity."
              className="resize-none"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold flex items-center gap-1.5">
              <Link2 className="size-3.5 text-muted-foreground" />
              Links <span className="font-bold">(optional)</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="github_url" className="text-sm font-semibold">GitHub</Label>
                <Input
                  id="github_url"
                  name="github_url"
                  type="url"
                  defaultValue={existingApplication?.github_url ?? ''}
                  placeholder="https://github.com/username"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedin_url" className="text-sm font-semibold">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  defaultValue={existingApplication?.linkedin_url ?? ''}
                  placeholder="https://linkedin.com/in/username"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portfolio_url" className="text-sm font-semibold">Portfolio</Label>
              <Input
                id="portfolio_url"
                name="portfolio_url"
                type="url"
                defaultValue={existingApplication?.portfolio_url ?? ''}
                placeholder="https://yourportfolio.com"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
              2
            </span>
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resume_url" className="text-sm font-bold">
              Resume Link <span className="text-destructive">*</span>
            </Label>
            <Input
              id="resume_url"
              name="resume_url"
              type="url"
              value={resumeUrl}
              onChange={(e) => {
                setResumeUrl(e.target.value);
                setLinkConfirmed(false);
              }}
              placeholder="https://drive.google.com/file/d/... or https://docs.google.com/document/d/..."
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Paste a Google Drive, Dropbox, or any publicly accessible link to your resume.
            </p>
          </div>

          {resumeUrl.trim() && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-amber-800 dark:text-amber-200">Before you submit</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Make sure your resume link is <strong>publicly accessible</strong>. If the link requires sign-in or is restricted, the hiring team won&apos;t be able to view it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="link_confirmed"
                  checked={linkConfirmed}
                  onChange={(e) => setLinkConfirmed(e.target.checked)}
                  className="rounded border-input size-4"
                />
                <Label htmlFor="link_confirmed" className="text-sm font-semibold text-amber-800 dark:text-amber-200 cursor-pointer">
                  I confirm my resume link is publicly accessible
                </Label>
              </div>
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Preview link
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg" className="gap-2">
          {pending ? (
            <>
              <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {mode === 'apply' ? 'Submitting...' : 'Saving...'}
            </>
          ) : (
            <>
              <Send className="size-4" />
              {mode === 'apply' ? 'Submit Application' : 'Save Changes'}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
