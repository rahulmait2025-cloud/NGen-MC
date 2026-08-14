import * as React from 'react'
import { cn } from '@/lib/utils'
import { BentoCard } from '@/components/learning-analytics/bento-card'

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean
  elevated?: boolean
}

export function PremiumCard({
  className,
  glow = false,
  elevated = false,
  children,
  ..._props
}: PremiumCardProps) {
  return (
    <BentoCard className={cn(
      elevated && 'shadow-lg hover:shadow-xl',
      glow && 'hover:shadow-[0_0_30px_rgba(var(--primary),0.1)]',
      className
    )}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      {children}
    </BentoCard>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  trendLabel?: string
  className?: string
}) {
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0

  return (
    <BentoCard className={cn('px-5 py-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                isNegative ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-muted text-muted-foreground'
              )}>
                {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(trend)}%
              </span>
              {trendLabel && <span className="text-[10px] text-muted-foreground/80 font-medium">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className="size-10 shrink-0 rounded-xl bg-[oklch(0.67_0.19_45)] flex items-center justify-center">
          <Icon className="size-5 text-white" />
        </div>
      </div>
    </BentoCard>
  )
}

/** @deprecated Use KpiCard instead */
export const KPIWidget = KpiCard
