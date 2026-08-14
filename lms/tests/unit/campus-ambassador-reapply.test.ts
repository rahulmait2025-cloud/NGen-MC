import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isActiveCampusAmbassador,
  resolveCampusAmbassadorSubmitOutcome,
} from '../../lib/campus-ambassador/reapply';

describe('campus ambassador reapply decisions', () => {
  it('blocks active ambassadors', () => {
    assert.equal(
      resolveCampusAmbassadorSubmitOutcome({
        ambassadorStatus: 'active',
        accessEnabled: true,
        applicationStatus: 'approved',
      }),
      'already_ambassador',
    );
  });

  it('allows reapply when ambassador was removed and application is still approved', () => {
    assert.equal(
      resolveCampusAmbassadorSubmitOutcome({
        ambassadorStatus: 'removed',
        accessEnabled: false,
        applicationStatus: 'approved',
      }),
      'reapply',
    );
  });

  it('allows reapply for rejected applications', () => {
    assert.equal(
      resolveCampusAmbassadorSubmitOutcome({
        ambassadorStatus: null,
        accessEnabled: false,
        applicationStatus: 'rejected',
      }),
      'reapply',
    );
  });

  it('returns already_pending for submitted applications', () => {
    assert.equal(
      resolveCampusAmbassadorSubmitOutcome({
        ambassadorStatus: 'removed',
        accessEnabled: false,
        applicationStatus: 'submitted',
      }),
      'already_pending',
    );
  });

  it('creates when no prior application exists', () => {
    assert.equal(
      resolveCampusAmbassadorSubmitOutcome({
        ambassadorStatus: null,
        accessEnabled: false,
        applicationStatus: null,
      }),
      'create',
    );
  });

  it('treats removed ambassadors as inactive', () => {
    assert.equal(
      isActiveCampusAmbassador({ status: 'removed', accessEnabled: false }),
      false,
    );
    assert.equal(
      isActiveCampusAmbassador({ status: 'active', accessEnabled: true }),
      true,
    );
  });
});
