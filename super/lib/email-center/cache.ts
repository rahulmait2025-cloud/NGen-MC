import 'server-only';
import { revalidatePath, revalidateTag, unstable_noStore as noStore } from 'next/cache';
import { connection } from 'next/server';

/** Opt out of Next.js component/data cache for Email Center operational reads. */
export function emailCenterNoStore(): void {
  noStore();
}

/** Force request-time rendering under cacheComponents (replaces route segment dynamic/revalidate). */
export async function ensureEmailCenterDynamic(): Promise<void> {
  await connection();
  noStore();
}

export function revalidateEmailCenter(campaignId?: string): void {
  revalidatePath('/email-center');
  revalidatePath('/email-center/campaigns');
  revalidateTag('email-center', 'max');

  if (campaignId) {
    revalidatePath(`/email-center/campaigns/${campaignId}`);
    revalidateTag(`email-campaign-${campaignId}`, 'max');
  }
}
