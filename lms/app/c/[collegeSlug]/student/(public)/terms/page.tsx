import type { Metadata } from 'next';
import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { TermsOfServiceContent } from '@/components/legal/terms-of-service-content';

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: 'Terms of Service | NextGen CTO',
  description:
    'Terms of Service for NextGen CTO Pvt. Ltd., based in Bengaluru, India. Read our terms and conditions for using our LMS and services.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | NextGen CTO',
    description:
      'Terms of Service for NextGen CTO Pvt. Ltd., based in Bengaluru, India.',
    url: '/terms',
    siteName: 'NextGen CTO',
    type: 'website',
  },
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  return <TermsOfServiceContent collegeSlug={collegeSlug} />;
}
