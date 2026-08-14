import type { Metadata } from 'next';
import { getMetadataBaseUrl } from './app-url';

const title = 'NextGen CTO';
const description = 'Structured learning programs for students and college administrators.';

export const nextGenCtoMetadata: Metadata = {
  metadataBase: new URL(getMetadataBaseUrl()),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: 'NextGen CTO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};
