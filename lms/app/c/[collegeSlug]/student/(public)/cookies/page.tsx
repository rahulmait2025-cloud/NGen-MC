import type { Metadata } from 'next';
import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { CookiesPolicyContent } from '@/components/legal/cookies-policy-content';

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title: 'Cookie Policy | NextGen CTO',
  description:
    'Cookie Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India. Learn how we use cookies and browser storage on our platform.',
  alternates: {
    canonical: '/cookies',
  },
  openGraph: {
    title: 'Cookie Policy | NextGen CTO',
    description:
      'Cookie Policy for NextGen CTO Pvt. Ltd., based in Bengaluru, India.',
    url: '/cookies',
    siteName: 'NextGen CTO',
    type: 'website',
  },
};

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  return <CookiesPolicyContent collegeSlug={collegeSlug} />;
}
