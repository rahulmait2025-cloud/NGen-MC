import type { Metadata } from 'next';
import { getMetadataBaseUrl } from './app-url';

const title = 'NextGen CTO Student Portal';
const description = 'Track your learning journey with structured progress.';

function absoluteOgImage(path: string): string {
  return new URL(path, getMetadataBaseUrl()).toString();
}

const studentPortalOgImage = absoluteOgImage('/og/nextgen-cto-student-portal-v2.png');

export const studentPortalMetadata: Metadata = {
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
        url: studentPortalOgImage,
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
    images: [studentPortalOgImage],
  },
};
