import { NextRequest, NextResponse } from 'next/server';
import {
  getAllAdminOrders,
  getAdminOrderById,
  cancelAdminOrder,
} from '@/lib/superadmin/commerce/services/orders';
import type { AdminOrderFilter, AdminOrderStatus } from '@/lib/superadmin/commerce/services/orders';

/**
 * GET /api/superadmin/orders
 * Query params: status, source, entityType, purchaserEmail, purchaserUserId, couponCode, dateFrom, dateTo, limit, offset
 *
 * GET /api/superadmin/orders?id=<orderId> — returns single order details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // If ?id is provided, return single order
    const orderId = searchParams.get('id');
    if (orderId) {
      const order = await getAdminOrderById(orderId);

      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: order });
    }

    // Otherwise, return list with filters
    const filter: AdminOrderFilter = {};

    const status = searchParams.get('status');
    if (status) filter.status = status as AdminOrderStatus;

    const source = searchParams.get('source');
    if (source) filter.source = source as 'lms' | 'college_admin';

    const entityType = searchParams.get('entityType');
    if (entityType) filter.entityType = entityType as 'course_variant' | 'course_bundle';

    const purchaserEmail = searchParams.get('purchaserEmail');
    if (purchaserEmail) filter.purchaserEmail = purchaserEmail;

    const purchaserUserId = searchParams.get('purchaserUserId');
    if (purchaserUserId) filter.purchaserUserId = purchaserUserId;

    const couponCode = searchParams.get('couponCode');
    if (couponCode) filter.couponCode = couponCode;

    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) filter.dateFrom = dateFrom;

    const dateTo = searchParams.get('dateTo');
    if (dateTo) filter.dateTo = dateTo;

    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const result = await getAllAdminOrders({ filter, limit, offset });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[superadmin/orders] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/superadmin/orders?action=cancel&id=<orderId>
 * Cancel an order.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const orderId = searchParams.get('id');

    if (action === 'cancel' && orderId) {
      const body = await request.json();
      const cancelledBy = body.cancelledBy as string | undefined;
      const reason = body.reason as string | undefined;

      const order = await cancelAdminOrder(orderId, cancelledBy, reason);
      return NextResponse.json({ success: true, data: order });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action or missing order ID' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[superadmin/orders] POST error:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to cancel order' },
      { status },
    );
  }
}
