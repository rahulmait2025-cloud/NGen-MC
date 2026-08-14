import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_EMAIL_SENDER_PROFILE_ID,
  EMAIL_SENDER_PROFILES,
  extractSenderProfileIdFromComposerState,
  extractSenderSnapshotFromComposerState,
  formatEmailFromHeader,
  formatSenderOptionLabel,
  listEnabledSenderProfiles,
  mergeSenderIntoComposerState,
  resolveCampaignSender,
  resolveSenderProfile,
  resolveSenderProfileForSend,
  resolveSenderProfileOrDefault,
  snapshotFromProfile,
} from '../../lib/email-center/sender-profiles';

describe('EMAIL_SENDER_PROFILES registry', () => {
  it('hello resolves to hello@nextgen-cto.in', () => {
    const r = resolveSenderProfile('hello');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.profile.fromEmail, 'hello@nextgen-cto.in');
    assert.equal(r.profile.replyTo, 'hello@nextgen-cto.in');
    assert.equal(r.profile.fromName, 'NextGen CTO');
  });

  it('support resolves to support@nextgen-cto.in', () => {
    const r = resolveSenderProfile('support');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.profile.fromEmail, 'support@nextgen-cto.in');
  });

  it('anuj resolves to anuj@nextgen-cto.in', () => {
    const r = resolveSenderProfile('anuj');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.profile.fromEmail, 'anuj@nextgen-cto.in');
    assert.equal(r.profile.fromName, 'Anuj Kumar');
  });

  it('default profile is hello', () => {
    assert.equal(DEFAULT_EMAIL_SENDER_PROFILE_ID, 'hello');
    const r = resolveSenderProfile(undefined);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.profile.id, 'hello');
  });

  it('exactly three enabled profiles', () => {
    const list = listEnabledSenderProfiles();
    assert.equal(list.length, 3);
    assert.deepEqual(
      list.map((p) => p.id).toSorted(),
      ['anuj', 'hello', 'support'],
    );
  });

  it('rejects unknown IDs', () => {
    const r = resolveSenderProfile('marketing');
    assert.equal(r.ok, false);
  });

  it('rejects arbitrary addresses', () => {
    const r = resolveSenderProfile('hello@nextgen-cto.in');
    assert.equal(r.ok, false);
  });

  it('rejects non-nextgen-cto.in domains disguised as IDs', () => {
    const r = resolveSenderProfile('evil@attacker.com');
    assert.equal(r.ok, false);
  });

  it('rejects header-injection attempts', () => {
    assert.equal(resolveSenderProfile('hello\nBcc: evil@x.com').ok, false);
    assert.equal(resolveSenderProfile('hello\r\nFrom: x').ok, false);
  });

  it('soft default for missing ID; soft default also for unknown on OrDefault', () => {
    assert.equal(resolveSenderProfileOrDefault(null).id, 'hello');
    assert.equal(resolveSenderProfileOrDefault('nope').id, 'hello');
  });

  it('strict send resolve rejects invalid present IDs', () => {
    assert.equal(resolveSenderProfileForSend('nope').ok, false);
    assert.equal(resolveSenderProfileForSend('').ok, true);
  });

  it('formats From header from server profile only', () => {
    assert.equal(
      formatEmailFromHeader(EMAIL_SENDER_PROFILES.anuj.fromName, EMAIL_SENDER_PROFILES.anuj.fromEmail),
      'Anuj Kumar <anuj@nextgen-cto.in>',
    );
    assert.equal(
      formatSenderOptionLabel(EMAIL_SENDER_PROFILES.support),
      'NextGen CTO Support <support@nextgen-cto.in>',
    );
  });
});

describe('composer_state sender persistence', () => {
  it('extracts profile ID and falls back for legacy campaigns', () => {
    assert.equal(extractSenderProfileIdFromComposerState({ sender_profile_id: 'support' }), 'support');
    assert.equal(extractSenderProfileIdFromComposerState({ schema_version: 1 }), null);
    const legacy = resolveCampaignSender({ schema_version: 1, heading: '', body_html: 'x', body_text: '', ctas: [] });
    assert.equal(legacy.ok, true);
    if (!legacy.ok) return;
    assert.equal(legacy.profile.id, 'hello');
    assert.equal(legacy.fromHeader, 'NextGen CTO <hello@nextgen-cto.in>');
  });

  it('locked snapshot wins for retry parity', () => {
    const locked = mergeSenderIntoComposerState(
      { schema_version: 1, heading: '', body_html: 'hi', body_text: '', ctas: [] },
      'anuj',
      { lockSnapshot: true },
    );
    const resolved = resolveCampaignSender(locked);
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.snapshot.profileId, 'anuj');
    assert.equal(resolved.fromHeader, 'Anuj Kumar <anuj@nextgen-cto.in>');
    assert.equal(resolved.snapshot.replyTo, 'anuj@nextgen-cto.in');
  });

  it('rejects tampered snapshot From email', () => {
    const snap = extractSenderSnapshotFromComposerState({
      sender_snapshot: {
        profileId: 'hello',
        fromName: 'NextGen CTO',
        fromEmail: 'attacker@evil.com',
        replyTo: 'hello@nextgen-cto.in',
      },
    });
    assert.equal(snap, null);
  });

  it('rejects tampered snapshot Reply-To', () => {
    const snap = extractSenderSnapshotFromComposerState({
      sender_snapshot: {
        ...snapshotFromProfile(EMAIL_SENDER_PROFILES.hello),
        replyTo: 'other@nextgen-cto.in',
      },
    });
    assert.equal(snap, null);
  });
});

describe('send-path parity helpers', () => {
  for (const id of ['hello', 'support', 'anuj'] as const) {
    it(`${id}: preview/confirmation/test/send resolve the same From`, () => {
      const state = mergeSenderIntoComposerState(
        { schema_version: 1, heading: '', body_html: 'body', body_text: 'body', ctas: [] },
        id,
      );
      const a = resolveCampaignSender(state);
      const b = resolveCampaignSender(state);
      assert.equal(a.ok, true);
      assert.equal(b.ok, true);
      if (!a.ok || !b.ok) return;
      assert.equal(a.fromHeader, b.fromHeader);
      assert.equal(a.snapshot.replyTo, b.snapshot.replyTo);
      assert.equal(a.profile.fromEmail, EMAIL_SENDER_PROFILES[id].fromEmail);
    });
  }
});
