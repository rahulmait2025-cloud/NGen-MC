import Link from 'next/link';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ShieldCheck, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSuperadminDashboardExtendedData } from '@/lib/services/dashboard';
import type { CollegeWithCounts } from '@/lib/services/colleges';

function SectionCard({
  icon: Icon,
  iconBg,
  title,
  description,
  badge,
  badgeVariant,
  children,
  className = '',
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`min-w-0 border border-border bg-card overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`size-7 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-foreground truncate">{title}</CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground truncate">{description}</CardDescription>
          </div>
        </div>
        {badge && (
          <Badge variant="outline" className={`text-[10px] font-medium h-5 px-2 shrink-0 ${badgeVariant || ''}`}>
            {badge}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message, sub }: { icon: React.ComponentType<{ className?: string }>; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-2">
        <Icon className="size-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
    </div>
  );
}

export default async function SuperAdminExtendedDashboard({
  colleges,
}: {
  colleges?: CollegeWithCounts[];
}) {
  const extendedData = await getSuperadminDashboardExtendedData(colleges);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      {/* College Leaderboard */}
      <SectionCard
        icon={TrendingUp}
        iconBg="bg-blue-500/10 text-blue-500"
        title="College Leaderboard"
        description="Top colleges by students and admins"
      >
        {extendedData.leaderboard.length === 0 ? (
          <EmptyState icon={Building2} message="No data yet" sub="Leaderboard will appear once data is available." />
        ) : (
          <Table className="border-separate border-spacing-y-1">
            <TableHeader>
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-8 text-[10px] font-medium uppercase tracking-wider h-auto pb-2 px-2 text-muted-foreground">#</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider h-auto pb-2 px-2 text-muted-foreground">College</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider h-auto pb-2 px-2 text-center text-muted-foreground">Students</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider h-auto pb-2 px-2 text-center text-muted-foreground">Admins</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extendedData.leaderboard.map((row) => (
                <TableRow key={row.id} className="border-none hover:bg-muted/50">
                  <TableCell className="first:rounded-l-lg px-3 py-2 text-xs font-bold text-primary font-mono">{row.rank}</TableCell>
                  <TableCell className="px-3 py-2">
                    <Link href={`/colleges/${row.id}`} className="text-xs font-semibold hover:text-primary transition-colors block truncate">
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs font-semibold font-mono text-center">{row.studentsCount}</TableCell>
                  <TableCell className="last:rounded-r-lg px-3 py-2 text-xs font-semibold font-mono text-center">{row.adminsCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* At-Risk Colleges */}
      <SectionCard
        icon={AlertTriangle}
        iconBg="bg-amber-500/10 text-amber-500"
        title="At-Risk Colleges"
        description="Suspended, inactive, or no admins/students"
        badge={extendedData.atRiskColleges.length > 0 ? `${extendedData.atRiskColleges.length} colleges` : undefined}
        badgeVariant="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      >
        {extendedData.atRiskColleges.length === 0 ? (
          <EmptyState icon={ShieldCheck} message="All clear" sub="No at-risk colleges identified." />
        ) : (
          <ul className="space-y-1.5">
            {extendedData.atRiskColleges.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors group/item">
                <Link href={`/colleges/${c.id}`} className="text-xs font-semibold hover:text-primary transition-colors truncate pr-3 flex items-center gap-1.5">
                  {c.name}
                  <ArrowUpRight className="size-3 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0" />
                </Link>
                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-tight h-5 bg-destructive/10 text-destructive border-destructive/20 px-2 shrink-0">{c.reason}</Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

    </div>
  );
}
