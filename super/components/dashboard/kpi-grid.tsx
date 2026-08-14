'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { toast } from 'sonner';
import { Building2, UserPlus, ShieldAlert, Megaphone, BookOpen, Layers, Package, FileText, Sparkles } from 'lucide-react';
import { KpiCard } from '@/components/shared/kpi-card';
import { PendingInvitesDialog } from './pending-invites-dialog';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import type { SuperadminDashboardStats } from '@/lib/services/dashboard';

type CreateCollegeDialogModule = typeof import('@/components/colleges/create-college-dialog');
type CreateCollegeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function usePreloadedDialog() {
  const preloadRef = React.useRef<Promise<CreateCollegeDialogModule> | null>(null);

  const loadCreateCollegeDialog = React.useCallback(() => {
    if (!preloadRef.current) {
      preloadRef.current = import('@/components/colleges/create-college-dialog');
    }
    return preloadRef.current;
  }, []);

  return loadCreateCollegeDialog;
}

const CreateCollegeDialog = dynamic<CreateCollegeDialogProps>(
  () => import('@/components/colleges/create-college-dialog').then((mod) => ({ default: mod.CreateCollegeDialog })),
  { ssr: false, loading: () => null }
);

function ActionChip({
  icon: Icon,
  label,
  onClick,
  href,
  onMouseEnter,
  onFocus,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  const shared = (
    <button type="button"
      className="group/chip inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-primary/5 hover:border-primary/20 transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] whitespace-nowrap"
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onClick={onClick}
    >
      <div className="size-5 rounded-md bg-primary/10 flex items-center justify-center group-hover/chip:bg-primary/15 transition-colors duration-150">
        <Icon className="size-3 text-primary" />
      </div>
      <span className="text-xs font-semibold text-foreground">
        {label}
      </span>
    </button>
  );

  if (href) {
    return <Link href={href}>{shared}</Link>;
  }

  return shared;
}

export function KpiGrid({ stats }: { stats: SuperadminDashboardStats }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const loadCreateCollegeDialog = usePreloadedDialog();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => {
        void loadCreateCollegeDialog();
      });
      return () => window.cancelIdleCallback(id);
    }
    void loadCreateCollegeDialog();
    return;
  }, [loadCreateCollegeDialog]);

  const openCreateCollege = useCallback(() => {
    void loadCreateCollegeDialog();
    setCreateOpen(true);
  }, [loadCreateCollegeDialog]);

  const kpis = useMemo(() => [
    {
      title: 'Active colleges',
      subtitle: 'Platform',
      value: String(stats.activeColleges),
      delta: `+${stats.newActiveCollegesThisMonth} this month`,
      deltaType: 'up' as const,
      description: 'Colleges currently active on the platform.',
      href: '/colleges',
    },
    {
      title: 'Total students',
      subtitle: 'All cohorts',
      value: String(stats.totalStudents),
      delta: `+${stats.newStudentsThisMonth} this month`,
      deltaType: 'up' as const,
      description: 'Students enrolled across all partner colleges.',
      href: '/students',
    },
    {
      title: 'College leads',
      subtitle: 'Pipeline',
      value: String(stats.collegeLeads),
      delta: 'Contact requests',
      deltaType: 'neutral' as const,
      description: 'Potential partnerships from landing page demos.',
      href: '/college-leads',
    },
    {
      title: 'Pending invites',
      subtitle: 'Awaiting',
      value: String(stats.pendingInvites),
      delta: `+${stats.invitesLast7Days} in 7d`,
      deltaType: (stats.invitesLast7Days > 0 ? 'up' : 'neutral') as 'up' | 'down' | 'neutral',
      description: 'Invitations sent but not yet accepted.',
      onClick: () => setInvitesOpen(true),
    },
  ], [stats]);

  return (
    <>
      {/* Bento KPI Grid */}
      <StaggerReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" stagger={0.08} delay={0.1}>
        {kpis.map((kpi) => (
          <StaggerChild key={kpi.title}>
            <KpiCard {...kpi} className="min-w-0 border-0 h-full" />
          </StaggerChild>
        ))}
      </StaggerReveal>

      {/* Actions: Horizontal scrolling chips */}
      <StaggerReveal className="mt-3" stagger={0.04} delay={0.5}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-2 p-3 overflow-x-auto scrollbar-hide"
            >
              <StaggerChild>
                <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-border mr-1">
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Quick Actions</span>
                </div>
              </StaggerChild>
              <StaggerChild>
                <ActionChip
                  icon={Building2}
                  label="Add college"
                  onMouseEnter={() => { void loadCreateCollegeDialog(); }}
                  onFocus={() => { void loadCreateCollegeDialog(); }}
                  onClick={openCreateCollege}
                />
              </StaggerChild>
              <StaggerChild>
                <ActionChip icon={UserPlus} label="Invite admin" href="/colleges" />
              </StaggerChild>
              <StaggerChild>
                <ActionChip icon={BookOpen} label="Manage courses" href="/master-courses" />
              </StaggerChild>
              <StaggerChild>
                <ActionChip icon={Layers} label="Create variant" href="/variants/create" />
              </StaggerChild>
              <StaggerChild>
                <ActionChip icon={Package} label="Create bundle" href="/bundles/create" />
              </StaggerChild>
              <StaggerChild>
                <ActionChip icon={FileText} label="Create assignment" href="/assignments/create" />
              </StaggerChild>
              <StaggerChild>
                <ActionChip
                  icon={Megaphone}
                  label="Announcement"
                  onClick={() => toast.info('Announcement publishing is not implemented yet.')}
                />
              </StaggerChild>
              <StaggerChild>
                <ActionChip icon={ShieldAlert} label="Security logs" href="/audit" />
              </StaggerChild>
            </div>
            {/* Fade edge */}
            <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-card/80 to-transparent pointer-events-none" />
          </div>
        </div>
      </StaggerReveal>

      {createOpen ? <CreateCollegeDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}
      <PendingInvitesDialog open={invitesOpen} onOpenChange={setInvitesOpen} />
    </>
  );
}
