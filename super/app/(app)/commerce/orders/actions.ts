'use server';

/**
 * Server actions for Commerce Orders.
 * All actions are gated by requireAuth().
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { cancelAdminOrder, getAdminOrderById, revokeOrderAccess } from '@/lib/superadmin/commerce/services/orders';
import type { AdminOrderWithItems } from '@/lib/superadmin/commerce/services/orders';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Cancel a pending order.
 */
export async function cancelOrderAction(
  orderId: string,
  reason?: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await cancelAdminOrder(orderId, undefined, reason);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetch order details with items.
 */
async function _fetchOrderDetailsAction(
  orderId: string,
): Promise<ActionResponse<AdminOrderWithItems | null>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const order = await getAdminOrderById(orderId);
    return { success: true, data: order };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Revoke course access for a paid order.
 */
export async function revokeOrderAccessAction(
  orderId: string,
  reason?: string,
): Promise<ActionResponse> {
  const result = await requireAuth();
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  try {
    await revokeOrderAccess(orderId, result.user.id, reason);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}
