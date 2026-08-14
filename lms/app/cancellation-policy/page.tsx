import type { Metadata } from 'next';
import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { RefundPolicyContent } from '@/components/legal/refund-policy-content';

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: 'Cancellation & Refund Policy | NextGen CTO',
  description:
    'Cancellation and Refund Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India.',
  alternates: {
    canonical: '/cancellation-policy',
  },
  openGraph: {
    title: 'Cancellation & Refund Policy | NextGen CTO',
    description:
      'Cancellation and Refund Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India.',
    url: '/cancellation-policy',
    siteName: 'NextGen CTO',
    type: 'website',
  },
};

export default function RootCancellationPolicyPage() {
  return <RefundPolicyContent />;
}
