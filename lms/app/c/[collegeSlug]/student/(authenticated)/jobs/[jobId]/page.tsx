import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { requireStudent } from '@/lib/auth/require-student';
import {
  getJobDetail,
  getStudentApplication,
  canStudentApplyToJob,
  JobDetailPresenter,
} from '@/lib/services/student-jobs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  MapPin, Clock, Briefcase, Building2, XCircle,
  ArrowLeft, Globe, RefreshCw,
  IndianRupee, CalendarDays, ExternalLink,
  FileText, Shield, Target,
} from 'lucide-react';
import {
  WORK_MODE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from '@/components/jobs/job-constants';

export default async function StudentJobDetailPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; jobId: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, jobId } = await params;
  const [{ studentId, membership, isGlobal }, job] = await Promise.all([
    requireStudent(collegeSlug),
    getJobDetail(jobId),
  ]);
  if (!job) notFound();

  const [application, eligibility] = await Promise.all([
    getStudentApplication(studentId, jobId),
    canStudentApplyToJob(studentId, jobId, membership.collegeId, isGlobal),
  ]);

  const vm = JobDetailPresenter.present(job, application, eligibility, collegeSlug);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Back link */}
      <Link
        href={`/c/${collegeSlug}/student/jobs`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        <ArrowLeft className="size-3.5" />
        All jobs
      </Link>

      {/* Header */}
      <div className="relative rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-primary/70" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1 truncate" title={job.company_name}>{job.company_name}</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">{job.title}</h1>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2.5 shrink-0">
            {vm.isApplied && vm.statusConfig && (
              <Badge variant={vm.statusConfig.variant} className="text-xs">{vm.statusConfig.label}</Badge>
            )}
            {vm.isWithdrawn && (
              <Badge variant="secondary" className="text-xs">Withdrawn</Badge>
            )}

            {vm.ctaState.type === 'visit_website' && vm.ctaState.href && (
              <Button asChild size="lg" className="rounded-xl px-8 font-semibold">
                <a href={vm.ctaState.href} target="_blank" rel="noopener noreferrer">
                  {vm.ctaState.label}
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            )}

            {(vm.ctaState.type === 'apply' || vm.ctaState.type === 'reapply') && vm.ctaState.href && (
              <Button asChild size="lg" className="rounded-xl px-8 font-semibold">
                <Link href={vm.ctaState.href}>
                  {vm.ctaState.label}
                </Link>
              </Button>
            )}

            {vm.ctaState.type === 'edit' && vm.ctaState.href && (
              <Button variant="outline" asChild className="rounded-xl">
                <Link href={vm.ctaState.href}>
                  {vm.ctaState.label}
                </Link>
              </Button>
            )}

            {vm.isWithdrawn && (
              <p className="text-xs text-muted-foreground max-w-[200px] text-right leading-relaxed">
                You previously withdrew. You can re-apply with a new resume.
              </p>
            )}

            {vm.ctaState.type === 'ineligible' && (
              <div className="flex items-center gap-2 text-sm text-foreground bg-muted/50 rounded-xl px-4 py-2.5 border border-border/40">
                <XCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
                {vm.ctaState.reason}
              </div>
            )}
          </div>
        </div>

        {/* Quick facts row */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border/40">
          {job.location && (
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground bg-muted/40 rounded-lg px-3 py-1.5 font-medium">
              <MapPin className="size-3.5 text-muted-foreground" />
              {job.location}
            </span>
          )}
          {job.work_mode && (
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground bg-muted/40 rounded-lg px-3 py-1.5 font-medium">
              {job.work_mode === 'remote' ? <Globe className="size-3.5 text-muted-foreground" /> : job.work_mode === 'hybrid' ? <RefreshCw className="size-3.5 text-muted-foreground" /> : <Building2 className="size-3.5 text-muted-foreground" />}
              {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
            </span>
          )}
          {job.employment_type && (
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground bg-muted/40 rounded-lg px-3 py-1.5 font-medium">
              <Briefcase className="size-3.5 text-muted-foreground" />
              {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </span>
          )}
        </div>
      </div>

      {/* Key details — asymmetric grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Compensation — wider */}
        <div className="sm:col-span-3 rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <IndianRupee className="size-4 text-primary/70" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Compensation</h3>
          </div>
          {vm.formattedSalary ? (
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {vm.formattedSalary}
            </p>
          ) : (
            <p className="text-muted-foreground">Not specified</p>
          )}
          {job.openings != null && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{job.openings}</span> {job.openings === 1 ? 'opening' : 'openings'}
            </p>
          )}
        </div>

        {/* Timeline — narrower */}
        <div className="sm:col-span-2 rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <CalendarDays className="size-4 text-primary/70" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
          </div>
          {vm.deadlineFormatted ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                {vm.isDeadlinePassed ? (
                  <span className="text-sm font-semibold text-destructive">Deadline passed</span>
                ) : vm.isDeadlineUrgent ? (
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Closing soon</span>
                ) : (
                  <span className="text-sm font-medium text-foreground truncate">{vm.deadlineFormatted}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Open deadline</p>
          )}
          {job.published_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Posted {new Date(job.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* About the Company */}
      {job.company_about && (
        <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <Building2 className="size-4 text-primary/70" />
            </div>
            <h3 className="text-base font-bold text-foreground">About the Company</h3>
          </div>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{job.company_about}</div>
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <FileText className="size-4 text-primary/70" />
            </div>
            <h3 className="text-base font-semibold text-foreground">About the Role</h3>
          </div>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">{job.description}</div>
        </div>
      )}

      {/* Lists */}
      {vm.hasAnyList ? (
        <div className="space-y-4">
          {/* Responsibilities & Requirements */}
          {(job.responsibilities?.length || job.requirements?.length) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {job.responsibilities?.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-6">
                  <h3 className="text-base font-bold text-foreground mb-4">Responsibilities</h3>
                  <ul className="space-y-3">
                    {job.responsibilities.map((item) => (
                      <li key={item} className="flex items-baseline gap-2.5 text-sm text-foreground leading-relaxed">
                        <span className="text-foreground shrink-0 leading-relaxed">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {job.requirements?.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-6">
                  <h3 className="text-base font-bold text-foreground mb-4">Requirements</h3>
                  <ul className="space-y-3">
                    {job.requirements.map((item) => (
                      <li key={item} className="flex items-baseline gap-2.5 text-sm text-foreground leading-relaxed">
                        <span className="text-foreground shrink-0 leading-relaxed">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* Skills & Perks */}
          {(job.skills?.length || job.perks?.length) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {job.skills?.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-6">
                  <h3 className="text-base font-bold text-foreground mb-4">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-medium text-xs rounded-lg px-2.5 py-1">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {job.perks?.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-6">
                  <h3 className="text-base font-bold text-foreground mb-4">Perks</h3>
                  <ul className="space-y-3">
                    {job.perks.map((item) => (
                      <li key={item} className="flex items-baseline gap-2.5 text-sm text-foreground leading-relaxed">
                        <span className="text-foreground shrink-0 leading-relaxed">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Application Tips */}
      {eligibility.allowed && !vm.isApplied && !vm.isDeadlinePassed && job.status === 'open' && (
        <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
          <h3 className="text-base font-bold text-foreground mb-4">Application Tips</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <Target className="size-4 text-foreground/70" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Tailor your resume</p>
                <p className="text-xs text-muted-foreground mt-0.5">Highlight relevant experience that matches the job requirements</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <FileText className="size-4 text-foreground/70" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Write a cover note</p>
                <p className="text-xs text-muted-foreground mt-0.5">Explain why you&apos;re interested and what makes you a great fit</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <Shield className="size-4 text-foreground/70" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Double-check details</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ensure your links and contact info are up to date</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky apply bar */}
      {(vm.ctaState.type === 'apply' || vm.ctaState.type === 'reapply') && vm.ctaState.href && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-md shadow-lg shadow-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="font-semibold text-sm text-foreground">Interested in this role?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submit your application{vm.deadlineFormatted ? ` before ${vm.deadlineFormatted}` : ''}.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0 rounded-xl px-8 font-semibold">
              <Link href={vm.ctaState.href}>
                {vm.ctaState.label}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
