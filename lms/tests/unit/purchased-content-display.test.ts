import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvePurchasedContentDisplay } from '../../lib/commerce/purchased-content-display';

describe('resolvePurchasedContentDisplay', () => {
  it('prefers entity_title snapshot over plan_name', () => {
    const display = resolvePurchasedContentDisplay({
      entityType: 'master_course',
      metadata: {
        entity_title: 'C Course',
        course_title: 'C Course',
        plan_name: '6 Months Fast Track',
        validity_days: 180,
      },
    });
    assert.equal(display.primaryTitle, 'C Course');
    assert.equal(display.secondaryLabel, '6 Months Fast Track · 6 months');
  });

  it('never uses plan_name as primary title', () => {
    const display = resolvePurchasedContentDisplay({
      entityType: 'master_course',
      metadata: {
        plan_name: '6 Months Fast Track',
      },
      liveEntityTitle: 'C Course',
    });
    assert.equal(display.primaryTitle, 'C Course');
    assert.equal(display.secondaryLabel, '6 Months Fast Track');
  });

  it('falls back to safe label when no title exists', () => {
    const display = resolvePurchasedContentDisplay({
      entityType: 'master_course',
      metadata: { plan_name: '6 Months Fast Track' },
    });
    assert.equal(display.primaryTitle, 'Purchased course');
    assert.equal(display.secondaryLabel, '6 Months Fast Track');
  });

  it('uses bundle and variant snapshots', () => {
    assert.equal(
      resolvePurchasedContentDisplay({
        entityType: 'course_bundle',
        metadata: { bundle_title: 'Career Bundle' },
      }).primaryTitle,
      'Career Bundle',
    );
    assert.equal(
      resolvePurchasedContentDisplay({
        entityType: 'course_variant',
        metadata: { variant_title: 'Advanced Track' },
      }).primaryTitle,
      'Advanced Track',
    );
  });
});
