import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyClickTrackingRewrites,
  collectTrackableHrefs,
  rewriteHrefToTrackingUrl,
} from '../../lib/email-center/tracking-href';
import {
  getEmailCenterPublicAppUrl,
  isEmailCenterClickTrackingEnabled,
} from '../../lib/email-center/tracking-route-utils';

describe('email click tracking href rewrite', () => {
  it('rewrites href only and keeps visible WhatsApp URL text', () => {
    const wa = 'https://wa.me/919999999999?text=Hello';
    const html = `<a href="${wa}">${wa}</a>`;
    const tracked = 'https://admin.example/api/email/track/click?token=abc123';
    const out = rewriteHrefToTrackingUrl(html, wa, tracked);

    assert.match(out, new RegExp(`href="${tracked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(out, new RegExp(`>${wa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`));
    assert.doesNotMatch(out, />https:\/\/admin\.example/);
  });

  it('does not rewrite URL appearing only as link text of a different href', () => {
    const wa = 'https://wa.me/919999999999';
    const html = `<a href="https://nextgen-cto.in/">${wa}</a>`;
    const tracked = 'https://admin.example/api/email/track/click?token=xyz';
    const out = rewriteHrefToTrackingUrl(html, wa, tracked);
    assert.equal(out, html);
  });

  it('collects CTA and body links but skips unsubscribe and same-origin tracking', () => {
    const html = `
      <a href="https://wa.me/1">Chat</a>
      <a href="https://example.com/path">Site</a>
      <a href="https://admin.example/api/email/preferences">Unsub</a>
      <a href="https://admin.example/api/email/track/click?token=x">Already</a>
      <a href="#top">Top</a>
      <a href="mailto:hi@example.com">Mail</a>
    `;
    const urls = collectTrackableHrefs(html, {
      baseUrl: 'https://admin.example',
      unsubscribeUrl: 'https://admin.example/api/email/preferences',
    });
    assert.deepEqual(urls.sort(), ['https://example.com/path', 'https://wa.me/1'].sort());
  });

  it('applyClickTrackingRewrites handles multiple links without touching text', () => {
    const html = `
      <a href="https://wa.me/1">https://wa.me/1</a>
      <a href="https://example.com">Visit</a>
    `;
    const out = applyClickTrackingRewrites(html, [
      { originalUrl: 'https://wa.me/1', trackingUrl: 'https://t.example/c?token=1' },
      { originalUrl: 'https://example.com', trackingUrl: 'https://t.example/c?token=2' },
    ]);
    assert.match(out, /href="https:\/\/t\.example\/c\?token=1"/);
    assert.match(out, /href="https:\/\/t\.example\/c\?token=2"/);
    assert.match(out, />https:\/\/wa\.me\/1</);
    assert.match(out, />Visit</);
  });
});

describe('email center public app URL + click tracking flag', () => {
  it('forces https for non-local hosts even when env is http', () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'http://admin-nextgen-cto.vercel.app';
    try {
      assert.equal(getEmailCenterPublicAppUrl(), 'https://admin-nextgen-cto.vercel.app');
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  it('keeps click wrapping off unless EMAIL_CENTER_CLICK_TRACKING is enabled', () => {
    const prev = process.env.EMAIL_CENTER_CLICK_TRACKING;
    delete process.env.EMAIL_CENTER_CLICK_TRACKING;
    try {
      assert.equal(isEmailCenterClickTrackingEnabled(), false);
      process.env.EMAIL_CENTER_CLICK_TRACKING = '1';
      assert.equal(isEmailCenterClickTrackingEnabled(), true);
    } finally {
      if (prev === undefined) delete process.env.EMAIL_CENTER_CLICK_TRACKING;
      else process.env.EMAIL_CENTER_CLICK_TRACKING = prev;
    }
  });
});
