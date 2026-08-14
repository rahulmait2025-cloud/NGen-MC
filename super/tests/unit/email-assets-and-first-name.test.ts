import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_EMAIL_BRAND_LOGO_URL,
  getEmailBrandLogoUrl,
  isSupabasePublicObjectUrl,
  resolveEmailLogoUrl,
} from '../../lib/brand/email-logo-url';
import { applyEmailLogoImgStyle, buildEmailLogoImgHtml } from '../../lib/brand/email-logo-markup';
import {
  EMAIL_SOCIAL_ICON_URLS,
  EMAIL_SOCIAL_LINKS,
  getEmailSocialAssets,
  getEmailSocialIconUrls,
  getEmailSocialLinks,
} from '../../lib/email-center/brand-links';
import { wrapInBrandedEmailShell } from '../../lib/email-center/email-shell';
import { renderCampaignContent } from '../../lib/email-center/template-renderer';
import { validateFinalEmailHtml } from '../../lib/email-center/email-html-validation';
import {
  buildRecipientNameFromAuthUser,
  deriveFirstNameFromAuthUser,
  resolveRecipientFirstName,
} from '../../lib/email-center/recipient-name';

describe('email logo (Supabase public object)', () => {
  it('uses the configured Supabase public logo URL', () => {
    const url = getEmailBrandLogoUrl();
    assert.match(url, /^https:\/\//i);
    assert.match(url, /\/storage\/v1\/object\/public\//);
    assert.match(url, /NextGen%20CTO%20Logo\.png|NextGen CTO Logo\.png/);
    assert.ok(isSupabasePublicObjectUrl(url) || isSupabasePublicObjectUrl(DEFAULT_EMAIL_BRAND_LOGO_URL));
  });

  it('rejects relative paths via resolve fallback to absolute HTTPS', () => {
    const url = resolveEmailLogoUrl('/logo.png');
    assert.match(url, /^https:\/\//i);
    assert.doesNotMatch(url, /^\/logo/);
  });

  it('does not use signed Supabase URLs by default', () => {
    const url = getEmailBrandLogoUrl();
    assert.doesNotMatch(url, /\/object\/sign\//);
    assert.doesNotMatch(url, /[?&]token=/);
  });

  it('logo img has explicit width, height and alt', () => {
    const html = buildEmailLogoImgHtml(getEmailBrandLogoUrl(), 56);
    assert.match(html, /width="56"/);
    assert.match(html, /height="56"/);
    assert.match(html, /alt="NextGen CTO"/);
    assert.match(html, /src="https:\/\//);
  });

  it('sanitization / style apply preserves valid Supabase public URL', () => {
    const logo = getEmailBrandLogoUrl();
    const raw = `<img src="${logo}" width="48" height="48" alt="NextGen CTO" />`;
    const styled = applyEmailLogoImgStyle(raw, logo);
    assert.match(styled, /\/storage\/v1\/object\/public\//);
    assert.match(styled, /src="https:\/\//);
  });

  it('shared shell header uses absolute HTTPS logo', () => {
    const html = wrapInBrandedEmailShell({ bodyHtml: '<p>Hi</p>', previewText: 'p' });
    assert.match(html, /src="https:\/\/[^"]+\/storage\/v1\/object\/public\//);
    assert.match(html, /width="48"/);
    assert.match(html, /height="48"/);
    assert.match(html, /alt="NextGen CTO"/);
  });
});

describe('email social icons', () => {
  it('instagram/linkedin/youtube use absolute HTTPS PNG URLs', () => {
    const icons = getEmailSocialIconUrls();
    for (const [name, url] of Object.entries(icons)) {
      assert.match(url, /^https:\/\//i, name);
      assert.match(url, /\.png(\?|$)/i, name);
      assert.doesNotMatch(url, /localhost/i, name);
      assert.doesNotMatch(url, /[?&]token=/i, name);
      assert.doesNotMatch(url, /algozenith\.s3/i, name);
    }
  });

  it('each icon is wrapped in the correct profile link with size attrs', () => {
    const assets = getEmailSocialAssets();
    const html = wrapInBrandedEmailShell({ bodyHtml: '<p>Hi</p>', previewText: 'p' });
    assert.match(html, new RegExp(`href="${assets.instagramUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, new RegExp(`href="${assets.linkedinUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, new RegExp(`href="${assets.youtubeUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, /alt="Instagram"/);
    assert.match(html, /alt="LinkedIn"/);
    assert.match(html, /alt="YouTube"/);
    assert.match(html, /width="24"/);
    assert.match(html, /height="24"/);
    assert.match(html, /anuj\.kumar\.codes/);
    assert.match(html, /youtube\.com\/@CodingwithCTOBhaiya/);
  });

  it('preview and delivery shell share the same icon sources', () => {
    const a = wrapInBrandedEmailShell({ bodyHtml: '<p>A</p>', previewText: 'a' });
    const b = wrapInBrandedEmailShell({ bodyHtml: '<p>B</p>', previewText: 'b' });
    const icons = getEmailSocialIconUrls();
    for (const url of Object.values(icons)) {
      assert.ok(a.includes(url));
      assert.ok(b.includes(url));
    }
    assert.equal(EMAIL_SOCIAL_LINKS.instagram, getEmailSocialLinks().instagram);
    assert.equal(EMAIL_SOCIAL_ICON_URLS.instagram, icons.instagram);
  });
});

describe('first-name personalization', () => {
  it('uses Google given_name first', () => {
    assert.equal(
      resolveRecipientFirstName({
        googleGivenName: 'Rahul',
        googleFullName: 'Rahul Sharma',
        profileFirstName: 'Other',
      }),
      'Rahul',
    );
  });

  it('falls back to first word of full_name / name', () => {
    assert.equal(
      resolveRecipientFirstName({ googleFullName: 'Ada Lovelace' }),
      'Ada',
    );
    assert.equal(
      resolveRecipientFirstName({ googleName: 'Grace Hopper' }),
      'Grace',
    );
  });

  it('uses profile first name when Google metadata missing', () => {
    assert.equal(
      resolveRecipientFirstName({ profileFirstName: 'Priya', profileFullName: 'Priya Nair' }),
      'Priya',
    );
  });

  it('ignores blank metadata and falls back to there (not Student)', () => {
    assert.equal(
      resolveRecipientFirstName({
        googleGivenName: '  ',
        googleFullName: '',
        profileFirstName: null,
      }),
      'there',
    );
    assert.notEqual(
      resolveRecipientFirstName({}),
      'Student',
    );
  });

  it('auth user resolver prefers given_name from user_metadata / raw_user_meta_data', () => {
    assert.equal(
      deriveFirstNameFromAuthUser({
        email: 'r@example.com',
        user_metadata: { given_name: 'Rahul', full_name: 'Rahul Sharma' },
      }),
      'Rahul',
    );
    assert.equal(
      buildRecipientNameFromAuthUser({
        email: 'r@example.com',
        user_metadata: {},
        raw_user_meta_data: { given_name: 'Anuj', name: 'Anuj Kumar' },
      }).first_name,
      'Anuj',
    );
    assert.equal(
      deriveFirstNameFromAuthUser(null),
      'there',
    );
  });

  it('replaces {{first_name}} in preview/campaign render and escapes HTML', () => {
    const shell = wrapInBrandedEmailShell({
      bodyHtml: '<p>Hi {{first_name}},</p>',
      previewText: 'hi',
      title: 't',
    });
    const rendered = renderCampaignContent('Hi {{first_name}}', 'p', shell, 'Hi {{first_name}}', {
      first_name: 'Rahul',
      email_header_display: 'NextGen CTO',
    });
    assert.match(rendered.html, /Hi Rahul,/);
    assert.doesNotMatch(rendered.html, /\{\{first_name\}\}/);
    assert.match(rendered.text, /Hi Rahul/);
    assert.doesNotMatch(rendered.text, /Student/);

    const escaped = renderCampaignContent('s', 'p', '<p>Hi {{first_name}}</p>', 'Hi {{first_name}}', {
      first_name: 'A<script>x</script>',
    });
    assert.match(escaped.html, /A&lt;script&gt;/);
    assert.doesNotMatch(escaped.html, /<script>/);
  });

  it('arbitrary test-send without name uses there', () => {
    const rendered = renderCampaignContent('s', 'p', '<p>Hi {{first_name}},</p>', 'Hi {{first_name}},', {});
    assert.match(rendered.html, /Hi there,/);
    assert.doesNotMatch(rendered.html, /Hi Student/);
  });
});

describe('final HTML validation', () => {
  it('flags unresolved first_name and relative images', () => {
    const bad = validateFinalEmailHtml(
      '<p>Hi {{first_name}}</p><img src="/logo.png" alt="x"/><a href="https://instagram.com/x">i</a><a href="https://linkedin.com/x">l</a><a href="https://youtube.com/x">y</a>',
    );
    assert.equal(bad.ok, false);
    assert.ok(bad.issues.some((i) => i.code === 'unresolved_first_name'));
    assert.ok(bad.issues.some((i) => i.code === 'relative_image_src'));
  });

  it('accepts a well-formed shell render', () => {
    const shell = wrapInBrandedEmailShell({ bodyHtml: '<p>Hi Rahul,</p>', previewText: 'p' });
    const rendered = renderCampaignContent('s', 'p', shell, 'Hi Rahul', {
      first_name: 'Rahul',
      email_header_display: 'NextGen CTO',
    });
    const ok = validateFinalEmailHtml(rendered.html);
    assert.equal(ok.ok, true, JSON.stringify(ok.issues));
    assert.equal(ok.firstNameResolved, true);
  });
});
