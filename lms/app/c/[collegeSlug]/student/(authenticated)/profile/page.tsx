import { Suspense } from 'react';
import { StudentRouteLoadingShell } from '@/components/student/student-route-loading-shell';
import { requireStudent, type StudentContext } from '@/lib/auth/require-student';
import { getStudentByCollegeId } from '@/lib/tenant/get-tenant';
import { createClient } from '@/lib/supabase/server';
import { isDirectLearnerCollegeSlug } from '@/lib/tenant/direct-learner-slug';
import { ProfileDashboard } from './profile-dashboard';
import type { ProfileField } from './profile-types';
import { Skeleton } from '@/components/ui/skeleton';

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ collegeSlug }, sp] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[]>),
  ]);
  const collegeUpdated = (sp as Record<string, string | string[]>).college_updated === '1';

  return (
    <Suspense fallback={<StudentRouteLoadingShell />}>
      <StudentProfilePageContent collegeSlug={collegeSlug} collegeUpdated={collegeUpdated} />
    </Suspense>
  );
}

async function StudentProfilePageContent({
  collegeSlug,
  collegeUpdated,
}: {
  collegeSlug: string;
  collegeUpdated: boolean;
}) {
  // Fast auth context (from proxy headers — 0ms blocking)
  const { tenant, user, membership } = await requireStudent(collegeSlug);
  const isUnknownCollege = tenant.slug === 'unknown';
  const isB2cDirectLearner = isDirectLearnerCollegeSlug(tenant.slug);

  return (
    <div className="relative max-w-3xl mx-auto space-y-6">
      {/* Profile main details — loads dynamically using Suspense */}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileDashboardAsync
          collegeSlug={collegeSlug}
          user={user}
          tenant={tenant}
          membership={membership}
          collegeUpdated={collegeUpdated}
          isB2cDirectLearner={isB2cDirectLearner}
          isUnknownCollege={isUnknownCollege}
        />
      </Suspense>
    </div>
  );
}

async function ProfileDashboardAsync({
  collegeSlug,
  user,
  tenant,
  membership,
  collegeUpdated,
  isB2cDirectLearner,
  isUnknownCollege,
}: {
  collegeSlug: string;
  user: StudentContext['user'];
  tenant: StudentContext['tenant'];
  membership: StudentContext['membership'];
  collegeUpdated: boolean;
  isB2cDirectLearner: boolean;
  isUnknownCollege: boolean;
}) {
  const student = await getStudentByCollegeId(tenant.id);
  const supabase = await createClient();

  const [authUserResult, npsResult, profileResult, studentRecordResult] = await Promise.all([
    supabase.auth.getUser(),
    isB2cDirectLearner
      ? supabase
          .from('non_partnered_students')
          .select('self_reported_college_name')
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('profiles')
      .select('avatar_url, username, username_set')
      .eq('id', user.id)
      .maybeSingle(),
    student?.id
      ? supabase
          .from('students')
          .select('bio, year_or_semester, github_url, linkedin_url, resume_url')
          .eq('id', student.id)
          .maybeSingle()
      : supabase
          .from('students')
          .select('bio, year_or_semester, github_url, linkedin_url, resume_url')
          .eq('user_id', user.id)
          .maybeSingle(),
  ]);

  const _selfReportedCollegeName = (npsResult?.data as { self_reported_college_name?: string | null } | null)?.self_reported_college_name ?? null;
  const dbStudent = studentRecordResult?.data as {
    bio?: string | null;
    year_or_semester?: string | null;
    github_url?: string | null;
    linkedin_url?: string | null;
    resume_url?: string | null;
  } | null;

  const bio = dbStudent?.bio ?? student?.bio ?? null;
  const yearOrSemester = dbStudent?.year_or_semester ?? student?.year_or_semester ?? null;
  const githubUrl = dbStudent?.github_url ?? student?.github_url ?? null;
  const linkedinUrl = dbStudent?.linkedin_url ?? student?.linkedin_url ?? null;
  const resumeUrl = dbStudent?.resume_url ?? student?.resume_url ?? null;

  const hasProfileQueryFailed = !profileResult || profileResult.error !== null;

  if (hasProfileQueryFailed) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
        <h3 className="text-sm font-bold text-destructive">Failed to load profile</h3>
        <p className="text-xs text-muted-foreground">Could not retrieve profile information due to a database query error.</p>
        <a
          href={`/c/${collegeSlug}/student/profile`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-xs"
        >
          Retry loading profile
        </a>
      </div>
    );
  }

  const authUser = authUserResult?.data?.user;
  const googleAvatarUrl =
    (authUser?.user_metadata?.avatar_url as string | undefined) ||
    (authUser?.user_metadata?.picture as string | undefined) ||
    null;

  const profileData = profileResult.data;
  const avatarUrl = profileData?.avatar_url || googleAvatarUrl || null;
  const username = profileData?.username ?? null;
  const usernameSet = Boolean(profileData?.username_set || (profileData?.username && profileData.username.trim().length > 0));

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0] ?? 'S').toUpperCase();

  const personalInfoFields: ProfileField[] = [
    {
      label: 'Full Name',
      key: 'full_name',
      value: user.fullName,
      icon: 'User',
      editable: true,
      maxLength: 20,
      placeholder: 'e.g. Avesh',
    },
    {
      label: 'Email',
      key: 'email',
      value: user.email,
      icon: 'Mail',
      editable: false,
    },
    {
      label: 'Semester / Year',
      key: 'year_or_semester',
      value: yearOrSemester,
      icon: 'Calendar',
      editable: true,
      maxLength: 6,
      placeholder: '6thSem',
    },
    ...(isB2cDirectLearner
      ? []
      : [
          {
            label: 'College',
            key: 'college',
            value: tenant.name,
            icon: 'MapPin',
            editable: false,
          },
        ]),
  ];

  const externalLinksFields: ProfileField[] = [
    {
      label: 'GitHub',
      key: 'github_url',
      value: githubUrl,
      icon: 'Github',
      editable: true,
      isLink: true,
      placeholder: 'https://github.com/username',
    },
    {
      label: 'LinkedIn',
      key: 'linkedin_url',
      value: linkedinUrl,
      icon: 'Linkedin',
      editable: true,
      isLink: true,
      placeholder: 'https://linkedin.com/in/username',
    },
    {
      label: 'Resume (Google Drive)',
      key: 'resume_url',
      value: resumeUrl,
      icon: 'FileText',
      editable: true,
      isLink: true,
      placeholder: 'https://drive.google.com/file/d/…/view',
    },
  ];

  return (
    <ProfileDashboard
      collegeSlug={collegeSlug}
      collegeId={tenant.id}
      fullName={user.fullName ?? 'Student'}
      email={user.email ?? ''}
      avatarUrl={avatarUrl}
      username={username}
      usernameSet={usernameSet}
      initials={initials}
      membershipStatus={membership.status}
      personalFields={personalInfoFields}
      linkFields={externalLinksFields}
      isUnknownCollege={isUnknownCollege}
      collegeUpdated={collegeUpdated}
      bio={bio}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="border border-border/60 rounded-xl p-6 bg-card space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/60">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2 text-center sm:text-left flex-1">
          <Skeleton className="h-6 w-48 mx-auto sm:mx-0 rounded" />
          <Skeleton className="h-4 w-32 mx-auto sm:mx-0 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

