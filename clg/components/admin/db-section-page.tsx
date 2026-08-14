import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentAdminCollegeSnapshot } from '@/lib/services/dashboard';
import { PageContainer } from '@/components/shared/page-container';
import { PageHeader } from '@/components/shared/page-header';
import { Users, ShieldCheck } from 'lucide-react';

function DbSectionPageShell({
  title,
  subtitle,
  studentsCount,
  adminsCount,
}: {
  title: string;
  subtitle: string;
  studentsCount: number;
  adminsCount: number;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={`${subtitle} (Live records)`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="card-tier-1 border-0 p-4 bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="size-3 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Students</p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground font-mono">{studentsCount}</p>
        </Card>
        <Card className="card-tier-1 border-0 p-4 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="size-3 text-emerald-600" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Admins</p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground font-mono">{adminsCount}</p>
        </Card>
      </div>
    </>
  );
}

function DbSectionPageLists({
  snapshot,
}: {
  snapshot: CurrentAdminCollegeSnapshot;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="card-tier-1 border-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/30">
          <CardTitle className="text-sm font-semibold">Recent Students</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {snapshot.students.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-4 text-center">No students found.</p>
          ) : (
            <div className="space-y-2">
              {snapshot.students.map((student) => (
                <div key={student.id} className="rounded-xl border border-border/30 p-4 text-sm hover:bg-primary/[0.02] transition-colors group">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{student.full_name ?? 'Unnamed Student'}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{student.email ?? 'No email'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-tier-1 border-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/30">
          <CardTitle className="text-sm font-semibold">Active Admin Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {snapshot.admins.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-4 text-center">No active admins found.</p>
          ) : (
            <div className="space-y-2">
              {snapshot.admins.map((admin) => (
                <div key={admin.id} className="rounded-xl border border-border/30 p-4 text-sm hover:bg-primary/[0.02] transition-colors group">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{admin.full_name ?? 'Unnamed Admin'}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{admin.email ?? 'No email'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DbSectionPage({
  title,
  subtitle,
  snapshot,
}: {
  title: string;
  subtitle: string;
  snapshot: CurrentAdminCollegeSnapshot | null;
}) {
  if (!snapshot) {
    return (
      <PageContainer>
        <PageHeader title={title} description="No active college membership found." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DbSectionPageShell
        title={title}
        subtitle={subtitle}
        studentsCount={snapshot.studentsCount}
        adminsCount={snapshot.adminsCount}
      />
      <DbSectionPageLists snapshot={snapshot} />
    </PageContainer>
  );
}
