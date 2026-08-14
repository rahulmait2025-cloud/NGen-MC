/**

 * Shared email logo URL for all platform emails.

 * Asset: brand-assets/nextgen-cto/NextGen CTO Logo.png (transparent PNG, N stroke for light backgrounds)

 */



const DEFAULT_EMAIL_BRAND_LOGO_URL =

  'https://afgnktqrevcxbrimtdlx.supabase.co/storage/v1/object/public/brand-assets/nextgen-cto/NextGen%20CTO%20Logo.png';



const EMAIL_LOGO_OBJECT_PATH = 'brand-assets/nextgen-cto/NextGen%20CTO%20Logo.png';



function pickHttpsUrl(...candidates: (string | undefined)[]): string | null {

  for (const c of candidates) {

    const t = c?.trim();

    if (t && /^https:\/\//i.test(t)) return t;

  }

  return null;

}



function buildDefaultEmailLogoUrl(): string {

  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');

  if (supabase) {

    return `${supabase}/storage/v1/object/public/${EMAIL_LOGO_OBJECT_PATH}`;

  }

  return DEFAULT_EMAIL_BRAND_LOGO_URL;

}



export function getEmailBrandLogoUrl(): string {

  return (

    pickHttpsUrl(

      process.env.EMAIL_BRAND_LOGO_URL,

      process.env.NEXT_PUBLIC_EMAIL_BRAND_LOGO_URL,

    ) ?? buildDefaultEmailLogoUrl()

  );

}


