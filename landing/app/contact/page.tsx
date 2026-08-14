import ContactFormClient, { type ContactUtmParams } from './ContactFormClient';

function utmFromSearchParams(sp: { [key: string]: string | string[] | undefined }): ContactUtmParams {
  const get = (key: string) => {
    const v = sp[key];
    return typeof v === 'string' ? v : '';
  };
  return {
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_term: get('utm_term'),
    utm_content: get('utm_content'),
  };
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const initialUtm = utmFromSearchParams(sp);
  const utmKey = [
    initialUtm.utm_source,
    initialUtm.utm_medium,
    initialUtm.utm_campaign,
    initialUtm.utm_term,
    initialUtm.utm_content,
  ].join('|');

  return <ContactFormClient key={utmKey} initialUtm={initialUtm} />;
}
