'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { DsaCategoryBreakdown } from './dsa-category-breakdown';
import { DsaStudentLeaderboard } from './dsa-student-leaderboard';
import { DsaProblemStats } from './dsa-problem-stats';
import { BookOpen, Users, BarChart3, TrendingUp } from 'lucide-react';
import type { DsaAnalytics as DsaAnalyticsType } from '@/types/dsa';

interface Props {
  analytics: DsaAnalyticsType;
  onRefresh: () => void;
}

export const DsaAnalytics = React.memo(function DsaAnalytics({ analytics, onRefresh: _onRefresh }: Props) {
  const kpis = [
    {
      label: 'Total Students',
      value: analytics.totalStudents,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Total Problems',
      value: analytics.totalProblems,
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Overall Completion',
      value: `${analytics.overallCompletionPct}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Avg Problems/Student',
      value: analytics.avgProblemsPerStudent,
      icon: BarChart3,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4 hover:border-primary/20 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${kpi.bg} p-2.5`}>
                <kpi.icon className={`size-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DsaCategoryBreakdown breakdown={analytics.categoryBreakdown} />

      <div className="grid lg:grid-cols-2 gap-6">
        <DsaStudentLeaderboard
          leaderboard={analytics.studentLeaderboard}
          totalProblems={analytics.totalProblems}
        />
        <DsaProblemStats stats={analytics.problemStats} />
      </div>
    </div>
  );
});
