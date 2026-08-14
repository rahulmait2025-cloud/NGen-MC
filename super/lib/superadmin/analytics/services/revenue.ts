import { cacheLife, cacheTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface RevenueAnalyticsFilters {
  startDate?: string
  endDate?: string
}

export interface RepeatCustomerRate {
  rate: number
  repeatCustomers: number
  totalCustomers: number
}

export interface MonthlyGrowthRate {
  growthRate: number | null
  currentMonthRevenue: number
  previousMonthRevenue: number
}

export interface PaymentMethodBreakdown {
  method: string
  count: number
  revenueMinor: number
}

export interface RevenueByCollege {
  collegeId: string
  collegeName: string
  revenueMinor: number
  orderCount: number
}

export class SuperAdminRevenueService {
  static async getRevenueOverview(filters?: RevenueAnalyticsFilters) {
    const supabase = await createClient()

    let query = supabase
      .from('analytics_revenue_summary')
      .select('total_orders, total_net_revenue_minor, total_base_revenue_minor, total_discount_minor')

    if (filters?.startDate) {
      query = query.gte('report_date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('report_date', filters.endDate)
    }

    const { data, error } = await query
    if (error) throw error

    const totals = data.reduce(
      (acc, row) => ({
        orders: acc.orders + Number(row.total_orders),
        netRevenue: acc.netRevenue + Number(row.total_net_revenue_minor),
        baseRevenue: acc.baseRevenue + Number(row.total_base_revenue_minor),
        discounts: acc.discounts + Number(row.total_discount_minor),
      }),
      { orders: 0, netRevenue: 0, baseRevenue: 0, discounts: 0 }
    )

    const aov = totals.orders > 0 ? totals.netRevenue / totals.orders : 0

    return { ...totals, aov }
  }

  static async getRevenueBySource(filters?: RevenueAnalyticsFilters) {
    const supabase = await createClient()
    
    let query = supabase
      .from('analytics_revenue_summary')
      .select('source, total_net_revenue_minor')

    if (filters?.startDate) query = query.gte('report_date', filters.startDate)
    if (filters?.endDate) query = query.lte('report_date', filters.endDate)

    const { data, error } = await query
    if (error) throw error

    const bySource: Record<string, number> = {}
    for (const row of data) {
      bySource[row.source] = (bySource[row.source] || 0) + Number(row.total_net_revenue_minor)
    }

    return bySource
  }

  static async getRevenueByEntity(filters?: RevenueAnalyticsFilters) {
    const supabase = await createClient()
    
    let query = supabase
      .from('analytics_revenue_summary')
      .select('entity_type, total_net_revenue_minor')

    if (filters?.startDate) query = query.gte('report_date', filters.startDate)
    if (filters?.endDate) query = query.lte('report_date', filters.endDate)

    const { data, error } = await query
    if (error) throw error

    const byEntity: Record<string, number> = {}
    for (const row of data) {
      byEntity[row.entity_type] = (byEntity[row.entity_type] || 0) + Number(row.total_net_revenue_minor)
    }

    return byEntity
  }

  static async getRefundsAndFailures(filters?: RevenueAnalyticsFilters) {
    const supabase = await createClient()
    
    let refundQuery = supabase.from('refund_events').select('amount_minor', { count: 'exact' })
    if (filters?.startDate) refundQuery = refundQuery.gte('created_at', filters.startDate)
    if (filters?.endDate) refundQuery = refundQuery.lte('created_at', filters.endDate)
    const { data: refundData, count: refundCount, error: refundError } = await refundQuery
    if (refundError) throw refundError
    const totalRefundsMinor = refundData?.reduce((sum, r) => sum + Number(r.amount_minor), 0) || 0

    let failedQuery = supabase.from('payments').select('amount_minor', { count: 'exact' }).eq('status', 'failed')
    if (filters?.startDate) failedQuery = failedQuery.gte('created_at', filters.startDate)
    if (filters?.endDate) failedQuery = failedQuery.lte('created_at', filters.endDate)
    const { data: failedData, count: failedCount, error: failedError } = await failedQuery
    if (failedError) throw failedError
    const totalFailedMinor = failedData?.reduce((sum, r) => sum + Number(r.amount_minor), 0) || 0

    return {
      refunds: { count: refundCount || 0, amountMinor: totalRefundsMinor },
      failures: { count: failedCount || 0, amountMinor: totalFailedMinor }
    }
  }

  static async getRepeatCustomerRate(): Promise<RepeatCustomerRate> {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('orders')
      .select('purchaser_email')
      .eq('status', 'paid')

    if (error) throw error

    const emailCounts = new Map<string, number>()
    for (const row of data ?? []) {
      const email = row.purchaser_email as string
      if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1)
    }

    const totalCustomers = emailCounts.size
    const repeatCustomers = Array.from(emailCounts.values()).filter(c => c > 1).length

    return {
      rate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
      repeatCustomers,
      totalCustomers,
    }
  }

  static async getMonthlyGrowthRate(): Promise<MonthlyGrowthRate> {
    const admin = createAdminClient()

    const now = new Date()
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const [{ data, error }, { data: noteData, error: noteError }] = await Promise.all([
      admin
        .from('orders')
        .select('total_amount_minor, paid_at')
        .eq('status', 'paid')
        .gte('paid_at', prevStart),
      admin
        .from('note_payment_orders')
        .select('amount_minor, updated_at')
        .eq('status', 'paid')
        .gte('updated_at', prevStart),
    ])

    if (error) throw error

    let currentRevenue = 0
    let previousRevenue = 0

    for (const row of data ?? []) {
      const paidAt = row.paid_at as string
      const amount = Number(row.total_amount_minor) || 0
      if (paidAt >= currentStart) {
        currentRevenue += amount
      } else if (paidAt >= prevStart && paidAt < currentStart) {
        previousRevenue += amount
      }
    }

    // Include note payments (stored in rupees, convert to paise)
    if (!noteError && noteData) {
      for (const row of noteData) {
        const paidAt = row.updated_at as string
        const amount = (Number(row.amount_minor) || 0) * 100
        if (paidAt >= currentStart) {
          currentRevenue += amount
        } else if (paidAt >= prevStart && paidAt < currentStart) {
          previousRevenue += amount
        }
      }
    }

    const growthRate = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : null

    return { growthRate, currentMonthRevenue: currentRevenue, previousMonthRevenue: previousRevenue }
  }

  static async getPaymentMethodBreakdown(): Promise<PaymentMethodBreakdown[]> {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('payments')
      .select('method, amount_minor')
      .in('status', ['captured', 'authorized'])

    if (error) throw error

    const byMethod = new Map<string, { count: number; revenueMinor: number }>()
    for (const row of data ?? []) {
      const method = (row.method as string) || 'unknown'
      const entry = byMethod.get(method) ?? { count: 0, revenueMinor: 0 }
      entry.count++
      entry.revenueMinor += Number(row.amount_minor) || 0
      byMethod.set(method, entry)
    }

    return Array.from(byMethod.entries())
      .map(([method, val]) => ({ method, count: val.count, revenueMinor: val.revenueMinor }))
      .sort((a, b) => b.revenueMinor - a.revenueMinor)
  }

  /**
   * Fetch all 4 revenue KPIs in parallel with shared caching.
   * Cached for 1 minute with 'revenue-kpi' tag for targeted invalidation.
   */
  static async getRevenueKpis(): Promise<{
    repeatCustomerRate: RepeatCustomerRate;
    monthlyGrowthRate: MonthlyGrowthRate;
    paymentMethodBreakdown: PaymentMethodBreakdown[];
    revenueByCollege: RevenueByCollege[];
  }> {
    'use cache';
    cacheLife('minutes');
    cacheTag('revenue-kpi');
    const [repeatCustomerRate, monthlyGrowthRate, paymentMethodBreakdown, revenueByCollege] = await Promise.all([
      SuperAdminRevenueService.getRepeatCustomerRate(),
      SuperAdminRevenueService.getMonthlyGrowthRate(),
      SuperAdminRevenueService.getPaymentMethodBreakdown(),
      SuperAdminRevenueService.getRevenueByCollege(),
    ]);
    return { repeatCustomerRate, monthlyGrowthRate, paymentMethodBreakdown, revenueByCollege };
  }

  static async getRevenueByCollege(): Promise<RevenueByCollege[]> {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('orders')
      .select('total_amount_minor, metadata')
      .eq('status', 'paid')
      .not('metadata', 'is', null)

    if (error) throw error

    const byCollege = new Map<string, { name: string; revenueMinor: number; count: number }>()
    for (const row of data ?? []) {
      const meta = row.metadata as Record<string, unknown> | null
      if (!meta) continue
      const collegeId = meta.college_id as string | undefined
      const collegeName = (meta.college_name as string) || collegeId || 'Unknown'
      if (!collegeId) continue
      const entry = byCollege.get(collegeId) ?? { name: collegeName, revenueMinor: 0, count: 0 }
      entry.revenueMinor += Number(row.total_amount_minor) || 0
      entry.count++
      byCollege.set(collegeId, entry)
    }

    return Array.from(byCollege.entries())
      .map(([collegeId, val]) => ({
        collegeId,
        collegeName: val.name,
        revenueMinor: val.revenueMinor,
        orderCount: val.count,
      }))
      .sort((a, b) => b.revenueMinor - a.revenueMinor)
      .slice(0, 10)
  }
}
