import 'server-only';

import { getMetadataBaseUrl } from '@/lib/metadata/app-url';
import { buildPublicProfilePath } from '@/lib/profile/public-profile-url';

export function buildAbsolutePublicProfileUrl(username: string): string {
  return new URL(
    buildPublicProfilePath(username),
    getMetadataBaseUrl(),
  ).toString();
}
