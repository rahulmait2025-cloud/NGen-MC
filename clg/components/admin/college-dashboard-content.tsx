'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  Target,
  Trophy,
  Video,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StaggerContainer, StaggerItem } from '@/components/admin/_components/gsap-client';
import { AnimatedCounter } from '@/components/admin/gsap-animation';
import type { CurrentAdminCollegeSnapshot, CollegeDashboardExtendedData } from '@/lib/services/dashboard';
import type { MentorshipSessionRow } from '@/lib/services/mentorship-sessions';

function safeNum(
  value: unknown,
  fallback: number | string = 0,
): number | string {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const KPICard = ({
  label,
  value,
  suffix = '',
  icon: Icon,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  return (
    <div className="card-tier-1 rounded-xl p-5 sm:p-6 group hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-[border-color,box-shadow] duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="size-4 text-primary" />
          </div>
        )}
      </div>
      <span className="text-2xl font-bold tracking-tight text-foreground leading-none tabular-nums">
        {typeof value === 'string' && isNaN(parseFloat(value))
          ? value
          : (
            <>
              <AnimatedCounter
                value={typeof value === 'number' ? value : parseFloat(value) || 0}
                suffix={suffix}
              />
            </>
          )}
      </span>
    </div>
  );
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getRelativeDate(dateStr: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  return '';
}

export function CollegeDashboardContent({
  snapshot,
  extendedData,
  adminBasePath: _adminBasePath,
  nextMentorshipSession,
}: {
  snapshot: CurrentAdminCollegeSnapshot;
  extendedData: CollegeDashboardExtendedData;
  adminBasePath: string;
  nextMentorshipSession?: MentorshipSessionRow | null;
}) {
  const relative = nextMentorshipSession ? getRelativeDate(nextMentorshipSession.session_date) : '';

  return (
    <StaggerContainer className="space-y-6 sm:space-y-8">
      {extendedData._error && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200">
            Some dashboard metrics could not be loaded. Core student and admin counts are still
            available below.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-6">
        <StaggerItem>
          <KPICard
            label="Total students"
            value={safeNum(snapshot.studentsCount) as number}
            icon={Users}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            label="Active admins"
            value={safeNum(snapshot.adminsCount) as number}
            icon={ShieldCheck}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            label="Placement readiness"
            value={extendedData.placementFunnel
              ? Math.round(
                  (((extendedData.placementFunnel?.interview_ready_count ?? 0) +
                    (extendedData.placementFunnel?.placed_count ?? 0)) /
                    ((extendedData.placementFunnel?.not_ready_count ?? 0) +
                      (extendedData.placementFunnel?.needs_improvement_count ?? 0) +
                      (extendedData.placementFunnel?.interview_ready_count ?? 0) +
                      (extendedData.placementFunnel?.placed_count ?? 0))) * 100
                )
              : 0}
            suffix="%"
            icon={Target}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            label="Avg assessment score"
            value={Number(extendedData.assessmentAnalytics?.average_score ?? 0)}
            icon={Trophy}
          />
        </StaggerItem>
      </div>

      {nextMentorshipSession && (
        <StaggerItem>
          <Link href={`${_adminBasePath}/mentorship`} className="block group">
            <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] p-5 sm:p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-[border-color,box-shadow] duration-200">
              <div className="flex items-start gap-4">
                <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Video className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">
                      Upcoming Session
                    </p>
                    {relative && (
                      <span className="text-[11px] font-medium text-primary/60">— {relative}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-foreground truncate mb-1.5 group-hover:text-primary transition-colors">
                    {nextMentorshipSession.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {formatDate(nextMentorshipSession.session_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {formatTime(nextMentorshipSession.start_time_ist)} – {formatTime(nextMentorshipSession.end_time_ist)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </div>
            </div>
          </Link>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}