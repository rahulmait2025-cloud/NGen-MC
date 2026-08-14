import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCourseAccessResult,
  classifyAccessValidity,
  isValidityWindowActive,
  mapSourceTypeToCourseAccessSource,
  parseOptionalDate,
  validFromActiveOrFilter,
  validUntilActiveOrFilter,
} from '../../lib/services/entitlement-validity';

const NOW = new Date('2026-07-22T12:00:00.000Z');

describe('parseOptionalDate', () => {
  it('treats null, empty, and invalid strings as null', () => {
    assert.equal(parseOptionalDate(null), null);
    assert.equal(parseOptionalDate(undefined), null);
    assert.equal(parseOptionalDate(''), null);
    assert.equal(parseOptionalDate('   '), null);
    assert.equal(parseOptionalDate('not-a-date'), null);
  });

  it('parses valid ISO timestamps', () => {
    const parsed = parseOptionalDate('2026-07-22T12:00:00.000Z');
    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2026-07-22T12:00:00.000Z');
  });
});

describe('classifyAccessValidity', () => {
  it('treats null valid_until as unlimited active access', () => {
    assert.equal(
      classifyAccessValidity({ valid_from: '2026-01-01T00:00:00.000Z', valid_until: null }, NOW),
      'active',
    );
    assert.equal(isValidityWindowActive({ validFrom: null, validUntil: null }, NOW), true);
  });

  it('allows free course with future expiry', () => {
    assert.equal(
      classifyAccessValidity(
        {
          valid_from: '2026-01-01T00:00:00.000Z',
          valid_until: '2026-12-31T23:59:59.000Z',
        },
        NOW,
      ),
      'active',
    );
  });

  it('marks genuinely past valid_until as expired', () => {
    assert.equal(
      classifyAccessValidity(
        {
          valid_from: '2025-01-01T00:00:00.000Z',
          valid_until: '2026-07-01T00:00:00.000Z',
        },
        NOW,
      ),
      'expired',
    );
  });

  it('does not classify future valid_from as expired', () => {
    assert.equal(
      classifyAccessValidity(
        {
          valid_from: '2026-08-01T00:00:00.000Z',
          valid_until: null,
        },
        NOW,
      ),
      'not_started',
    );
  });

  it('treats null valid_from as already started', () => {
    assert.equal(
      classifyAccessValidity({ valid_from: null, valid_until: null }, NOW),
      'active',
    );
  });

  it('uses exclusive now > validUntil for expiry (exact equality stays active)', () => {
    assert.equal(
      classifyAccessValidity(
        {
          valid_from: null,
          valid_until: NOW.toISOString(),
        },
        NOW,
      ),
      'active',
    );
  });
});

describe('PostgREST validity filters', () => {
  it('includes null valid_from (unlike .lte alone)', () => {
    const nowIso = NOW.toISOString();
    const filter = validFromActiveOrFilter(nowIso);
    assert.match(filter, /valid_from\.is\.null/);
    assert.match(filter, new RegExp(`valid_from\\.lte\\.${nowIso.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  it('includes null valid_until as unlimited', () => {
    const nowIso = NOW.toISOString();
    const filter = validUntilActiveOrFilter(nowIso);
    assert.match(filter, /valid_until\.is\.null/);
    assert.match(filter, /valid_until\.gte\./);
  });
});

describe('buildCourseAccessResult + source mapping', () => {
  it('maps free enrollment metadata and active access', () => {
    const result = buildCourseAccessResult({
      status: 'active',
      source: mapSourceTypeToCourseAccessSource('b2c_direct', {
        enrollment_type: 'free_course',
      }),
      validFrom: null,
      validUntil: null,
      entitlementId: 'ent-1',
    });
    assert.equal(result.hasAccess, true);
    assert.equal(result.status, 'active');
    assert.equal(result.source, 'free_enrollment');
    assert.equal(result.validUntil, null);
  });

  it('maps expired and not_enrolled without granting access', () => {
    assert.equal(buildCourseAccessResult({ status: 'expired' }).hasAccess, false);
    assert.equal(buildCourseAccessResult({ status: 'not_enrolled' }).hasAccess, false);
    assert.equal(buildCourseAccessResult({ status: 'not_started' }).hasAccess, false);
  });

  it('maps college assignment and legacy sources', () => {
    assert.equal(mapSourceTypeToCourseAccessSource('b2b_college'), 'college_assignment');
    assert.equal(mapSourceTypeToCourseAccessSource('legacy_enrollment'), 'legacy');
    assert.equal(mapSourceTypeToCourseAccessSource('bundle_purchase'), 'bundle');
  });
});

describe('resolver consistency contract', () => {
  it('keeps listing-style null validity and player-style classification aligned', () => {
    // My Courses RPC: (valid_from IS NULL OR valid_from <= now) AND (valid_until IS NULL OR valid_until >= now)
    // Player helper must agree for the same row shapes.
    const cases = [
      { valid_from: null, valid_until: null, expect: 'active' as const },
      { valid_from: '2026-01-01T00:00:00.000Z', valid_until: null, expect: 'active' as const },
      { valid_from: null, valid_until: '2026-12-31T00:00:00.000Z', expect: 'active' as const },
      { valid_from: null, valid_until: '2026-01-01T00:00:00.000Z', expect: 'expired' as const },
      { valid_from: '2026-08-01T00:00:00.000Z', valid_until: null, expect: 'not_started' as const },
    ];

    for (const row of cases) {
      assert.equal(
        classifyAccessValidity(row, NOW),
        row.expect,
        `mismatch for ${JSON.stringify(row)}`,
      );
    }
  });
});
