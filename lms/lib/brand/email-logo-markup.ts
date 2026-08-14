/** Email-safe `<img>` markup for the NextGen CTO logo (transparent PNG, no black matte). */



const EMAIL_LOGO_IMG_STYLE =

  'display:block;border:0;outline:none;text-decoration:none;height:auto;width:auto;max-width:100%;background:transparent;background-color:transparent;object-fit:contain;';



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

  return `<img src="${safeUrl}" width="${size}" height="${size}" alt="${safeAlt}" style="${EMAIL_LOGO_IMG_STYLE}width:${size}px;max-width:${size}px;"/>`;

}



/** Normalize logo `<img>` tags in stored email HTML templates after merge variables. */

function _applyEmailLogoImgStyle(html: string, logoUrl: string): string {

  return html.replace(/<img([^>]*?)>/gi, (full, attrs: string) => {

    if (!/alt="NextGen CTO/i.test(attrs)) return full;

    if (/Instagram|LinkedIn|YouTube/i.test(attrs)) return full;

    const width = attrs.match(/width="(\d+)"/i)?.[1];

    const size: 48 | 56 = width && Number(width) <= 48 ? 48 : 56;

    return buildEmailLogoImgHtml(logoUrl, size);

  });

}


