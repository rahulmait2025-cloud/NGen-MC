import type { Metadata } from 'next';
import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { RefundPolicyContent } from '@/components/legal/refund-policy-content';

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: 'Refund & Subscription Policy | NextGen CTO',
  description:
    'Refund and Subscription Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India. Read our payment, cancellation, and non-refundable course policies.',
  alternates: {
    canonical: '/refund-policy',
  },
  openGraph: {
    title: 'Refund & Subscription Policy | NextGen CTO',
    description:
      'Refund & Subscription Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India.',
    url: '/refund-policy',
    siteName: 'NextGen CTO',
    type: 'website',
  },
};

export default async function RefundPolicyPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  return <RefundPolicyContent collegeSlug={collegeSlug} />;
}
