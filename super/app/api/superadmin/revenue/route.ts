import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { getAdminRevenueData, getAdminOrderStats } from '@/lib/superadmin/commerce/services/orders';

/**
 * GET /api/superadmin/revenue
 * Query params: period (7d|30d|90d|all)
 *
 * Returns: total revenue, breakdown by source, breakdown by entity type, trend data
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = request.nextUrl;

    const period = (searchParams.get('period') as '7d' | '30d' | '90d' | 'all') ?? '30d';

    const [revenueData, stats] = await Promise.all([
      getAdminRevenueData({ period }),
      getAdminOrderStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        revenue: revenueData,
        stats,
      },
    });
  } catch (error) {
    console.error('[superadmin/revenue] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch revenue data' },
      { status: 500 },
    );
  }
}
