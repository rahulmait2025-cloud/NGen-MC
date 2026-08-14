/**
 * Public HTTPS logo URL for email HTML (Gmail-safe).
 *
 * Configure in environment (optional override):
 *   EMAIL_LOGO_URL=https://.../NextGen%20CTO%20Logo.png
 *   EMAIL_BRAND_LOGO_URL=https://...
 *   NEXT_PUBLIC_EMAIL_BRAND_LOGO_URL=https://...
 *
 * Default bucket asset:
 *   brand-assets/nextgen-cto/NextGen CTO Logo.png
 */

export { getEmailBrandLogoUrl, resolveEmailLogoUrl, isSupabasePublicObjectUrl } from '@/lib/brand/email-logo-url';
export { DEFAULT_EMAIL_BRAND_LOGO_URL, EMAIL_LOGO_OBJECT_PATH } from '@/lib/brand/email-logo-url';
