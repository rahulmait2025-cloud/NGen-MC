import type { Metadata } from 'next';
import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { PrivacyPolicyContent } from '@/components/legal/privacy-policy-content';

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: 'Privacy Policy | NextGen CTO',
  description:
    'Privacy Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India. Learn how we handle and protect your data.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | NextGen CTO',
    description:
      'Privacy Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India.',
    url: '/privacy',
    siteName: 'NextGen CTO',
    type: 'website',
  },
};

export default function RootPrivacyPage() {
  return <PrivacyPolicyContent />;
}
