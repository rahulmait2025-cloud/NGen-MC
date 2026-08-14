import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

let cachedLogoDataUri: string | null = null;

const LOGO_RELATIVE_PATH = path.join('public', 'assets', 'logo-icon.png');

/** Embedded PNG for invoice HTML/PDF (no remote fetch). Returns empty string on failure. */
function getInvoiceLogoDataUri(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri;

  try {
    const logoPath = path.join(process.cwd(), LOGO_RELATIVE_PATH);
    const logoBuffer = fs.readFileSync(logoPath);
    cachedLogoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    return cachedLogoDataUri;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[invoice] Failed to load local logo asset', error);
    }
    return '';
  }
}

export function renderInvoiceLogoImg(): string {
  const logoSrc = getInvoiceLogoDataUri();
  if (!logoSrc) return '';

  return `<img src="${logoSrc}" alt="NextGen CTO" width="60" height="60" style="display:block;width:60px;height:60px;object-fit:contain;border:0;outline:none;text-decoration:none;"/>`;
}
