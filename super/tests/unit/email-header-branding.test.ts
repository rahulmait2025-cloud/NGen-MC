import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildEmailHeaderDisplay,
  isPlaceholderEmailHeaderDisplay,
  normalizeRecipientCollegeName,
} from '../../lib/email-center/email-header-branding';
import { renderCampaignContent } from '../../lib/email-center/template-renderer';
import { wrapInBrandedEmailShell } from '../../lib/email-center/email-shell';
import { resolveEmailLogoUrl } from '../../lib/brand/email-logo-url';

describe('email header college branding', () => {
  it('builds NextGen CTO × college when a real college name exists', () => {
    assert.equal(buildEmailHeaderDisplay('MAIT'), 'NextGen CTO &times; MAIT');
    assert.equal(normalizeRecipientCollegeName('  MAIT  '), 'MAIT');
  });

  it('omits separator when college is missing or a placeholder', () => {
    assert.equal(buildEmailHeaderDisplay(null), 'NextGen CTO');
    assert.equal(buildEmailHeaderDisplay(''), 'NextGen CTO');
    assert.equal(buildEmailHeaderDisplay('Your College'), 'NextGen CTO');
    assert.equal(buildEmailHeaderDisplay('College'), 'NextGen CTO');
    assert.equal(buildEmailHeaderDisplay('Unknown College'), 'NextGen CTO');
    assert.equal(normalizeRecipientCollegeName('Your College'), null);
  });

  it('forces NextGen CTO only for explicit external audience mode', () => {
    assert.equal(buildEmailHeaderDisplay('MAIT', { audienceMode: 'external' }), 'NextGen CTO');
    assert.equal(buildEmailHeaderDisplay('MAIT', { showCollegeBranding: false }), 'NextGen CTO');
  });

  it('detects placeholder header strings', () => {
    assert.equal(isPlaceholderEmailHeaderDisplay('NextGen CTO &times; Your College'), true);
    assert.equal(isPlaceholderEmailHeaderDisplay('NextGen CTO × Your College'), true);
    assert.equal(isPlaceholderEmailHeaderDisplay('NextGen CTO'), false);
    assert.equal(isPlaceholderEmailHeaderDisplay('NextGen CTO &times; MAIT'), false);
  });
});

describe('custom email logo merge', () => {
  it('never leaves email_logo_url empty in rendered HTML', () => {
    const shell = wrapInBrandedEmailShell({
      bodyHtml: '<p>Hello</p>',
      previewText: 'pre',
      title: 't',
      includeUnsubscribe: true,
    });
    const rendered = renderCampaignContent('Subject', 'Preview', shell, 'text', {
      // Simulate the bug: empty logo from defaults must not win.
      email_logo_url: '',
      email_header_display: 'NextGen CTO &times; Your College',
      college_name: 'MAIT',
    });
    assert.match(rendered.html, /src="https:\/\//);
    assert.doesNotMatch(rendered.html, /src=""/);
    assert.doesNotMatch(rendered.html, /Your College/);
    assert.match(rendered.html, /NextGen CTO &times; MAIT/);
  });

  it('resolveEmailLogoUrl falls back to a https brand URL', () => {
    const url = resolveEmailLogoUrl('');
    assert.match(url, /^https:\/\//i);
    assert.match(url, /\/storage\/v1\/object\/public\//);
    assert.match(url, /NextGen%20CTO%20Logo\.png/i);
  });

  it('rejects known-broken logo-hd.png candidates', () => {
    const broken =
      'https://afgnktqrevcxbrimtdlx.supabase.co/storage/v1/object/public/brand-assets/nextgen-cto/logo-hd.png';
    const url = resolveEmailLogoUrl(broken);
    assert.doesNotMatch(url, /logo-hd\.png/i);
    assert.match(url, /NextGen%20CTO%20Logo\.png/i);
  });
});
