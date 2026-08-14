import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_EXTERNAL_EMAIL_RECIPIENTS,
  parseExternalEmailList,
  parseExternalEmailToken,
  validateExternalEmailList,
} from '../../lib/email-center/external-emails';
import {
  buildEmailHeaderDisplay,
  resolveEmailAudienceBrandMode,
} from '../../lib/email-center/email-header-branding';
import {
  findUnsupportedVariables,
  createEmptyComposerState,
} from '../../lib/email-center/custom-composer';
import { EMAIL_SOCIAL_LINKS } from '../../lib/email-center/brand-links';
import { getEmailShellSocialLinksForTest, wrapInBrandedEmailShell } from '../../lib/email-center/email-shell';
import { renderCampaignContent } from '../../lib/email-center/template-renderer';
import { resolveEmailLogoUrl } from '../../lib/brand/email-logo-url';

describe('external email parsing', () => {
  it('parses one address', () => {
    const result = parseExternalEmailList('person@example.com');
    assert.equal(result.validCount, 1);
    assert.equal(result.emails[0]?.email, 'person@example.com');
  });

  it('parses newline, comma, and semicolon separators', () => {
    const result = parseExternalEmailList(
      'a@example.com\nb@example.com, c@example.com; d@example.com',
    );
    assert.equal(result.validCount, 4);
  });

  it('trims whitespace and dedupes case-insensitively', () => {
    const result = parseExternalEmailList('  A@Example.com  , a@example.com\nB@example.com ');
    assert.equal(result.validCount, 2);
    assert.equal(result.duplicateCount, 1);
    assert.equal(result.emails[0]?.email, 'a@example.com');
  });

  it('lists invalid addresses instead of silently dropping them', () => {
    const result = parseExternalEmailList('good@example.com, not-an-email, also bad');
    assert.equal(result.validCount, 1);
    assert.deepEqual(result.invalidEntries, ['not-an-email', 'also bad']);
  });

  it('rejects header-injection attempts', () => {
    assert.equal(parseExternalEmailToken('evil@example.com\nBcc: hacker@x.com'), null);
    const result = validateExternalEmailList('ok@example.com\nbad\ninjected@x.com');
    // split on newline yields tokens; the middle "bad" is invalid
    assert.equal(result.ok, false);
  });

  it('blocks empty lists and over-limit lists', () => {
    assert.equal(validateExternalEmailList('').ok, false);
    const many = Array.from({ length: MAX_EXTERNAL_EMAIL_RECIPIENTS + 1 }, (_, i) => `u${i}@ex.com`).join('\n');
    const over = validateExternalEmailList(many);
    assert.equal(over.ok, false);
    if (!over.ok) assert.match(over.error, /Too many recipients/);
  });

  it('accepts Name <email> form', () => {
    const parsed = parseExternalEmailToken('Ada Lovelace <ada@example.com>');
    assert.deepEqual(parsed, { email: 'ada@example.com', full_name: 'Ada Lovelace' });
  });
});

describe('external audience branding and variables', () => {
  it('resolves brand mode from explicit audience context', () => {
    assert.equal(resolveEmailAudienceBrandMode({ audienceMode: 'external' }), 'external');
    assert.equal(resolveEmailAudienceBrandMode({ recipientType: 'manual' }), 'external');
    assert.equal(resolveEmailAudienceBrandMode({ audienceType: 'manual_emails' }), 'external');
    assert.equal(resolveEmailAudienceBrandMode({ audienceMode: 'platform' }), 'platform');
    assert.equal(resolveEmailAudienceBrandMode({ recipientType: 'student' }), 'platform');
  });

  it('never shows college branding for external mode even when a college string is present', () => {
    assert.equal(
      buildEmailHeaderDisplay('MAIT', { audienceMode: 'external' }),
      'NextGen CTO',
    );
    assert.equal(
      buildEmailHeaderDisplay('MAIT', { audienceMode: 'platform' }),
      'NextGen CTO &times; MAIT',
    );
  });

  it('blocks platform-only variables for external Custom Email', () => {
    const state = {
      ...createEmptyComposerState(),
      body_html: '<p>Hi {{first_name}} at {{college_name}} — {{dashboard_url}}</p>',
    };
    const unsupported = findUnsupportedVariables(state, 'Subj', '', 'external');
    assert.ok(unsupported.includes('college_name'));
    assert.ok(unsupported.includes('dashboard_url'));
    assert.ok(!unsupported.includes('first_name'));
  });
});

describe('email social links and logo', () => {
  it('uses approved social destinations in the Custom Email shell', () => {
    const links = getEmailShellSocialLinksForTest();
    assert.equal(links.youtube, EMAIL_SOCIAL_LINKS.youtube);
    assert.equal(links.linkedin, EMAIL_SOCIAL_LINKS.linkedin);
    assert.equal(links.instagram, EMAIL_SOCIAL_LINKS.instagram);
    assert.match(links.instagram, /anuj\.kumar\.codes/);
    assert.doesNotMatch(links.instagram, /code\.with\.ctobhaiya/);

    const html = wrapInBrandedEmailShell({ bodyHtml: '<p>Hi</p>', previewText: 'p' });
    assert.match(html, /anuj\.kumar\.codes/);
    assert.match(html, /youtube\.com\/@CodingwithCTOBhaiya/);
    assert.doesNotMatch(html, /localhost/);
  });

  it('renders absolute https logo and external-only header without college', () => {
    const shell = wrapInBrandedEmailShell({
      bodyHtml: '<p>Hello</p>',
      previewText: 'pre',
      title: 't',
      includeUnsubscribe: true,
    });
    const rendered = renderCampaignContent('Subject', 'Preview', shell, 'text', {
      email_logo_url: '',
      email_header_display: buildEmailHeaderDisplay('MAIT', { audienceMode: 'external' }),
      college_name: 'MAIT',
    });
    assert.match(rendered.html, /src="https:\/\//);
    assert.match(rendered.html, /alt="NextGen CTO"/);
    assert.match(rendered.html, /width="48"/);
    assert.doesNotMatch(rendered.html, /&times;\s*MAIT/);
    assert.match(rendered.html, />NextGen CTO</);
    assert.match(resolveEmailLogoUrl(''), /^https:\/\//i);
  });
});
