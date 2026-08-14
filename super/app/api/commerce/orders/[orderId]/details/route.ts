import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    await requireSuperadmin();

    const { orderId } = await params;

    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const [{ data: paymentsData, error: paymentsError }, { data: itemsData, error: itemsError }] = await Promise.all([
      admin
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
      admin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId),
    ]);

    if (paymentsError) {
      console.error('[order-details] Payments query error:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment data' },
        { status: 500 },
      );
    }

    if (itemsError) {
      console.error('[order-details] Items query error:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch order items' },
        { status: 500 },
      );
    }

    if (!paymentsData?.length && !itemsData?.length) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      payments: paymentsData ?? [],
      items: itemsData ?? [],
    });
  } catch (error) {
    console.error('[order-details] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 },
    );
  }
}
