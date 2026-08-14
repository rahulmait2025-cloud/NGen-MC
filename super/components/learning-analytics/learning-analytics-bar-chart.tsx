'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/lib/recharts-client';
import { PremiumCard } from '@/components/analytics/premium-card';
import { BarChart3 } from 'lucide-react';

type ValueFormatterKey = 'hours-1dp';

function formatYAxis(value: number, formatterKey?: ValueFormatterKey): string {
  if (formatterKey === 'hours-1dp') {
    return `${value.toFixed(1)}h`;
  }
  return String(value);
}

export function LearningAnalyticsBarChart({
  title,
  data,
  xKey,
  yKey,
  formatterKey,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  formatterKey?: ValueFormatterKey;
}) {
  const numericValues = data.map((row) => Number(row[yKey]) || 0);
  const hasData = numericValues.some((v) => Number.isFinite(v) && v > 0);

  return (
    <PremiumCard className="flex min-h-[400px] flex-col overflow-hidden">
      <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      </div>

      {!hasData ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="rounded-full bg-muted p-4">
            <BarChart3 className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground/80">No activity in this period</p>
          <p className="max-w-[220px] text-xs text-muted-foreground">
            Watch time will appear on days when students view lectures.
          </p>
        </div>
      ) : (
        <div className="h-[300px] w-full p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border/40"
                vertical={false}
              />
              <XAxis
                dataKey={xKey}
                stroke="currentColor"
                className="text-muted-foreground"
                fontSize={10}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="currentColor"
                className="text-muted-foreground"
                fontSize={10}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                dx={-10}
                tickFormatter={(v) => formatYAxis(Number(v), formatterKey)}
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  borderRadius: '12px',
                  color: 'var(--foreground)',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ color: 'var(--primary)', fontWeight: 600 }}
                formatter={(value) => formatYAxis(Number(value), formatterKey)}
              />
              <Bar dataKey={yKey} fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PremiumCard>
  );
}
