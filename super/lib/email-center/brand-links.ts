/** Public marketing site — footer logo click-through in email HTML. */
const EMAIL_WEBSITE_URL = 'https://nextgen-cto.in/';

/**
 * Approved social destinations for every Email Center / transactional footer.
 * Override with EMAIL_INSTAGRAM_URL / EMAIL_LINKEDIN_URL / EMAIL_YOUTUBE_URL when set.
 */
const DEFAULT_EMAIL_SOCIAL_LINKS = {
  youtube: 'https://www.youtube.com/@CodingwithCTOBhaiya',
  linkedin:
    'https://www.linkedin.com/in/anuj-kumar-a-k-a-cto-bhaiya-on-youtube-9a188968/',
  instagram: 'https://www.instagram.com/anuj.kumar.codes?igsh=N2wxYWo4bGw4OHRq',
} as const;

/**
 * Stable publicly accessible HTTPS PNG icon URLs (email-client safe).
 * Override with EMAIL_INSTAGRAM_ICON_URL / EMAIL_LINKEDIN_ICON_URL / EMAIL_YOUTUBE_ICON_URL.
 */
const DEFAULT_EMAIL_SOCIAL_ICON_URLS = {
  instagram: 'https://img.icons8.com/fluency/48/instagram-new.png',
  linkedin: 'https://img.icons8.com/fluency/48/linkedin.png',
  youtube: 'https://img.icons8.com/fluency/48/youtube-play.png',
} as const;

function pickHttpsUrl(...candidates: (string | undefined | null)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim();
    if (t && /^https:\/\//i.test(t)) return t;
  }
  return null;
}

function readEnvHttps(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return process.env[name]?.trim() || undefined;
}

export function getEmailSocialLinks() {
  return {
    youtube:
      pickHttpsUrl(readEnvHttps('EMAIL_YOUTUBE_URL')) ?? DEFAULT_EMAIL_SOCIAL_LINKS.youtube,
    linkedin:
      pickHttpsUrl(readEnvHttps('EMAIL_LINKEDIN_URL')) ?? DEFAULT_EMAIL_SOCIAL_LINKS.linkedin,
    instagram:
      pickHttpsUrl(readEnvHttps('EMAIL_INSTAGRAM_URL')) ?? DEFAULT_EMAIL_SOCIAL_LINKS.instagram,
  } as const;
}

export function getEmailSocialIconUrls() {
  return {
    instagram:
      pickHttpsUrl(readEnvHttps('EMAIL_INSTAGRAM_ICON_URL'))
      ?? DEFAULT_EMAIL_SOCIAL_ICON_URLS.instagram,
    linkedin:
      pickHttpsUrl(readEnvHttps('EMAIL_LINKEDIN_ICON_URL'))
      ?? DEFAULT_EMAIL_SOCIAL_ICON_URLS.linkedin,
    youtube:
      pickHttpsUrl(readEnvHttps('EMAIL_YOUTUBE_ICON_URL'))
      ?? DEFAULT_EMAIL_SOCIAL_ICON_URLS.youtube,
  } as const;
}

/** Single shared config for destinations + icon PNGs (env overrides applied). */
export function getEmailSocialAssets() {
  const links = getEmailSocialLinks();
  const icons = getEmailSocialIconUrls();
  return {
    instagramUrl: links.instagram,
    linkedinUrl: links.linkedin,
    youtubeUrl: links.youtube,
    instagramIcon: icons.instagram,
    linkedinIcon: icons.linkedin,
    youtubeIcon: icons.youtube,
  } as const;
}

/** Default destinations (no env). Prefer getEmailSocialLinks() at render time. */
export const EMAIL_SOCIAL_LINKS = DEFAULT_EMAIL_SOCIAL_LINKS;

/** Default PNG icons (no env). Prefer getEmailSocialIconUrls() at render time. */
export const EMAIL_SOCIAL_ICON_URLS = DEFAULT_EMAIL_SOCIAL_ICON_URLS;

export type EmailSocialNetwork = keyof typeof DEFAULT_EMAIL_SOCIAL_LINKS;

export function getEmailWebsiteUrl(): string {
  const fromEnv =
    typeof process !== 'undefined'
      ? process.env['NEXT_PUBLIC_EMAIL_WEBSITE_URL']?.trim()
      : undefined;
  if (fromEnv && /^https:\/\//i.test(fromEnv)) {
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`;
  }
  return EMAIL_WEBSITE_URL;
}

export function getEmailCenterAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
