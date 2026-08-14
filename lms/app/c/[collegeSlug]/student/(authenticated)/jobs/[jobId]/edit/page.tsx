import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { requireStudent } from '@/lib/auth/require-student';
import { getJobDetail, getStudentApplication } from '@/lib/services/student-jobs';
import { JobApplyForm } from '@/components/jobs/job-apply-form';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function StudentJobEditPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; jobId: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, jobId } = await params;
  const [{ studentId }, job] = await Promise.all([
    requireStudent(collegeSlug),
    getJobDetail(jobId),
  ]);
  if (!job) notFound();

  const application = await getStudentApplication(studentId, jobId);
  if (!application || application.status === 'withdrawn') {
    redirect(`/c/${collegeSlug}/student/jobs/${jobId}/apply`);
  }

  if (job.status !== 'open') {
    redirect(`/c/${collegeSlug}/student/jobs/${jobId}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <Link
        href={`/c/${collegeSlug}/student/jobs/${jobId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to job
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-primary/60" />
        </div>
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight">Edit Application</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update your application for <span className="font-medium text-foreground">{job.title}</span> at <span className="font-medium text-foreground">{job.company_name}</span>.
          </p>
        </div>
      </div>

      <JobApplyForm
        collegeSlug={collegeSlug}
        jobId={jobId}
        jobTitle={job.title}
        companyName={job.company_name}
        existingApplication={application}
        mode="edit"
      />
    </div>
  );
}
