import type { Metadata } from 'next';
import { getMetadataBaseUrl } from './app-url';

const title = 'NextGen CTO College Admin Portal';
const description =
  'Manage college learning programs, students, and progress from one dashboard.';

function absoluteOgImage(path: string): string {
  return new URL(path, getMetadataBaseUrl()).toString();
}

const COLLEGE_ADMIN_OG_IMAGE = absoluteOgImage(
  '/og/nextgen-cto-college-admin-portal-v2.png',
);

export const collegeAdminPortalMetadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: 'NextGen CTO',
    type: 'website',
    url: getMetadataBaseUrl(),
    images: [
      {
        url: COLLEGE_ADMIN_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: title,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [COLLEGE_ADMIN_OG_IMAGE],
  },
};
