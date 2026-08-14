/** Email-safe `<img>` markup for the NextGen CTO logo (transparent PNG, no black matte). */

const EMAIL_LOGO_IMG_STYLE =
  'display:block;border:0;outline:none;text-decoration:none;width:SIZE_PXpx;height:SIZE_PXpx;max-width:SIZE_PXpx;background:transparent;background-color:transparent;';

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildEmailLogoImgHtml(
  logoUrl: string,
  size: 48 | 56 = 56,
  alt = 'NextGen CTO',
): string {
  const safeUrl = escapeAttr(logoUrl);
  const safeAlt = escapeAttr(alt);
  const style = EMAIL_LOGO_IMG_STYLE.replaceAll('SIZE_PX', String(size));
  return `<img src="${safeUrl}" width="${size}" height="${size}" alt="${safeAlt}" style="${style}"/>`;
}

/** Normalize logo `<img>` tags in stored email HTML templates after merge variables. */
export function applyEmailLogoImgStyle(html: string, logoUrl: string): string {
  return html.replace(/<img([^>]*?)>/gi, (full, attrs: string) => {
    if (!/alt="NextGen CTO/i.test(attrs)) return full;
    if (/Instagram|LinkedIn|YouTube/i.test(attrs)) return full;
    const width = attrs.match(/width="(\d+)"/i)?.[1];
    const size: 48 | 56 = width && Number(width) <= 48 ? 48 : 56;
    return buildEmailLogoImgHtml(logoUrl, size);
  });
}
