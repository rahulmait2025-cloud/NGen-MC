import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  audienceRouteForCampaign,
  isMissingComposerColumnError,
  mapCampaignDraftError,
  resolveSaveAndContinueHref,
  shouldNavigateAfterSave,
} from '../../lib/email-center/campaign-draft-save';

describe('campaign draft save navigation', () => {
  it('successful create resolves audience route for navigation', () => {
    const href = resolveSaveAndContinueHref({
      ok: true,
      campaignId: '11111111-1111-1111-1111-111111111111',
    });
    assert.equal(
      href,
      '/email-center/campaigns/11111111-1111-1111-1111-111111111111?tab=audience'
    );
    assert.equal(
      shouldNavigateAfterSave({
        ok: true,
        saveAndContinue: true,
        campaignId: '11111111-1111-1111-1111-111111111111',
      }),
      true
    );
  });

  it('successful update resolves the same audience route', () => {
    const id = '22222222-2222-2222-2222-222222222222';
    assert.equal(audienceRouteForCampaign(id), `/email-center/campaigns/${id}?tab=audience`);
    assert.equal(
      shouldNavigateAfterSave({ ok: true, saveAndContinue: true, campaignId: id }),
      true
    );
  });

  it('database insert failure does not start navigation', () => {
    assert.equal(
      resolveSaveAndContinueHref({ ok: false, campaignId: 'x' }),
      null
    );
    assert.equal(
      shouldNavigateAfterSave({
        ok: false,
        saveAndContinue: true,
        campaignId: 'x',
      }),
      false
    );
  });

  it('missing content_mode/composer_state column produces a visible migration error', () => {
    const raw =
      'Failed to create campaign: column "content_mode" of relation "email_campaigns" does not exist';
    assert.equal(isMissingComposerColumnError(raw), true);
    const mapped = mapCampaignDraftError(raw);
    assert.match(mapped, /00324_email_campaigns_custom_composer/);
    assert.match(mapped, /content_mode/);
  });

  it('composer validation failure path does not navigate', () => {
    assert.equal(
      shouldNavigateAfterSave({
        ok: false,
        saveAndContinue: true,
        campaignId: null,
      }),
      false
    );
  });

  it('navigation does not start when saving fails', () => {
    assert.equal(
      resolveSaveAndContinueHref({
        ok: false,
        campaignId: '11111111-1111-1111-1111-111111111111',
      }),
      null
    );
  });

  it('Save Draft does not navigate (saveAndContinue false)', () => {
    assert.equal(
      shouldNavigateAfterSave({
        ok: true,
        saveAndContinue: false,
        campaignId: '11111111-1111-1111-1111-111111111111',
      }),
      false
    );
  });

  it('Save & Continue navigates to the campaign audience route', () => {
    const id = '33333333-3333-3333-3333-333333333333';
    assert.equal(
      shouldNavigateAfterSave({ ok: true, saveAndContinue: true, campaignId: id }),
      true
    );
    assert.equal(
      resolveSaveAndContinueHref({ ok: true, campaignId: id }),
      `/email-center/campaigns/${id}?tab=audience`
    );
  });

  it('missing campaign id after ok does not invent a route', () => {
    assert.equal(resolveSaveAndContinueHref({ ok: true, campaignId: '' }), null);
    assert.equal(resolveSaveAndContinueHref({ ok: true, campaignId: null }), null);
  });
});

describe('redirect errors must not be swallowed', () => {
  it('maps only non-redirect failures to draft error results', () => {
    // Mirrors create/update catch: rethrow redirect, map everything else.
    function handleActionError(
      err: unknown,
      isRedirect: (e: unknown) => boolean
    ): { ok: false; error: string } {
      if (isRedirect(err)) throw err;
      const message = err instanceof Error ? err.message : 'Failed to save campaign';
      return { ok: false, error: mapCampaignDraftError(message) };
    }

    const redirectErr = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;push;/x' });
    assert.throws(
      () => handleActionError(redirectErr, () => true),
      (err: unknown) => err === redirectErr
    );

    const dbErr = new Error('column "composer_state" does not exist');
    const result = handleActionError(dbErr, () => false);
    assert.equal(result.ok, false);
    assert.match(result.error, /00324/);
  });
});

describe('duplicate save guard contract', () => {
  it('in-flight flag allows only one concurrent save', async () => {
    let inFlight = false;
    let saves = 0;

    async function saveOnce() {
      if (inFlight) return;
      inFlight = true;
      try {
        saves += 1;
        await new Promise((r) => setTimeout(r, 20));
      } finally {
        inFlight = false;
      }
    }

    await Promise.all([saveOnce(), saveOnce(), saveOnce()]);
    assert.equal(saves, 1);
  });
});
