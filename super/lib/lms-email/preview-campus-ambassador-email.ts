/**
 * Write HTML previews for the Campus Ambassador welcome / approval email.
 *
 * Usage (from super/):
 *   npx tsx lib/lms-email/preview-campus-ambassador-email.ts
 *
 * Open the files under tmp/email-previews/ in a browser.
 * Resize the window (~320px) to check mobile stacking.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCampusAmbassadorApprovalEmail } from './campus-ambassador-approval-content';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, 'tmp', 'email-previews');

const appUrl = (
  process.env.NEXT_PUBLIC_LMS_URL ??
  process.env.NEXT_PUBLIC_STUDENT_APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://app.nextgen-cto.in'
).replace(/\/+$/, '');

function write(name: string, html: string) {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, name);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`wrote ${file}`);
}

function wrapPreviewFrame(title: string, variants: Array<{ label: string; html: string; width: number }>): string {
  const frames = variants
    .map(
      (v) => `
<section style="margin:0 0 40px 0;">
  <h2 style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748B;margin:0 0 12px 0;">${v.label} (${v.width}px)</h2>
  <div style="width:${v.width}px;max-width:100%;border:1px solid #CBD5E1;border-radius:8px;overflow:auto;background:#F8FAFC;">
    ${v.html}
  </div>
</section>`,
    )
    .join('\n');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;">
<h1 style="font-size:20px;color:#0F172A;margin:0 0 8px 0;">${title}</h1>
<p style="margin:0 0 28px 0;font-size:13px;color:#64748B;">Campus Ambassador welcome email preview — desktop, mobile, and edge cases.</p>
${frames}
</body></html>`;
}

const full = buildCampusAmbassadorApprovalEmail({
  fullName: 'Rahul Sharma',
  email: 'rahul.sharma@example.com',
  collegeSlug: 'nit-example',
  collegeName: 'National Institute of Technology',
  cohortName: 'Campus Ambassador Cohort 2026',
  ambassadorId: 'NGCA-2026-0142',
  couponCode: 'RAHULCTO10',
  baseUrl: appUrl,
});

const longName = buildCampusAmbassadorApprovalEmail({
  fullName: 'Anirudh Venkataraman Subramanian-Rajagopal',
  email: 'long@example.com',
  collegeSlug: 'iit-bombay',
  collegeName: 'Indian Institute of Technology Bombay — Department of Computer Science and Engineering',
  baseUrl: appUrl,
});

const minimal = buildCampusAmbassadorApprovalEmail({
  fullName: 'Priya',
  email: 'priya@example.com',
  baseUrl: appUrl,
});

write('ca-welcome-desktop.html', full.html);
write('ca-welcome-long-name.html', longName.html);
write('ca-welcome-minimal-optional.html', minimal.html);

write(
  'ca-welcome-gallery.html',
  wrapPreviewFrame('Campus Ambassador Welcome Email', [
    { label: 'Desktop — full mock data', html: full.html, width: 680 },
    { label: 'Mobile — full mock data', html: full.html, width: 320 },
    { label: 'Long ambassador / college name', html: longName.html, width: 680 },
    { label: 'Missing optional college / cohort / ID', html: minimal.html, width: 680 },
    { label: 'Mobile — missing optionals (CTA fallback visible)', html: minimal.html, width: 320 },
  ]),
);

console.log('\nPreview files ready.');
console.log(`Dashboard CTA in full mock: ${appUrl}/c/nit-example/student/dashboard/campus-ambassador`);
console.log('Open tmp/email-previews/ca-welcome-gallery.html in a browser.');
