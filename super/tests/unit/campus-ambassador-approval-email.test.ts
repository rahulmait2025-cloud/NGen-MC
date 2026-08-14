import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCampusAmbassadorApprovalEmail } from '../../lib/lms-email/campus-ambassador-approval-content';

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = 0;
  while (true) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

describe('campus ambassador approval email', () => {
  it('builds personalized subject and dashboard CTA', () => {
    const content = buildCampusAmbassadorApprovalEmail({
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      collegeSlug: 'rahul',
      couponCode: 'PRIYACTO10',
    });
    assert.match(content.subject, /Campus Ambassador Program/);
    assert.match(content.html, /Priya Sharma/);
    assert.match(content.html, /Open Ambassador Dashboard/);
    assert.match(content.html, /PRIYACTO10/);
    assert.match(content.html, /NEXTGEN-CTO/);
    assert.match(content.html, /Have questions\? Write to/);
    assert.match(content.html, /support@nextgen-cto\.in/);
    assert.doesNotMatch(content.html, /anuj@nextgen-cto\.in/i);
    assert.match(content.html, /\/c\/rahul\/student\/dashboard\/campus-ambassador/);
    assert.match(content.text, /approved/i);
    assert.match(content.text, /Have questions\? Write to support@nextgen-cto\.in/);
  });

  it('handles missing optional coupon and long names', () => {
    const long = 'A'.repeat(80);
    const content = buildCampusAmbassadorApprovalEmail({
      fullName: long,
      email: 'long@example.com',
    });
    assert.ok(content.html.includes(long));
    assert.ok(content.html.includes('Open Ambassador Dashboard'));
    assert.ok(content.subject.length > 10);
    assert.match(content.html, /Follow us on/);
    assert.match(content.html, /NextGen-CTO Pvt\. Ltd\./);
    assert.doesNotMatch(content.html, /College:/);
    assert.doesNotMatch(content.html, /Ambassador ID/);
    assert.doesNotMatch(content.html, /Cohort/);
  });

  it('escapes ambassador and college names', () => {
    const content = buildCampusAmbassadorApprovalEmail({
      fullName: '<script>alert(1)</script> Ada',
      email: 'ada@example.com',
      collegeName: 'NIT & "Test" <College>',
      ambassadorId: 'NGCA-1',
      cohortName: "Cohort '26",
    });
    assert.doesNotMatch(content.html, /<script>alert\(1\)<\/script>/);
    assert.match(content.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; Ada/);
    assert.match(content.html, /NIT &amp; &quot;Test&quot; &lt;College&gt;/);
    assert.doesNotMatch(content.html, />undefined</);
    assert.doesNotMatch(content.html, />null</);
  });

  it('omits optional detail rows when values are missing', () => {
    const content = buildCampusAmbassadorApprovalEmail({
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
      collegeName: '   ',
      ambassadorId: null,
      cohortName: undefined,
    });
    assert.doesNotMatch(content.html, />College</);
    assert.doesNotMatch(content.html, />Ambassador ID</);
    assert.doesNotMatch(content.html, />Cohort</);
    assert.doesNotMatch(content.html, /National Institute/);
  });

  it('renders optional detail rows when provided', () => {
    const content = buildCampusAmbassadorApprovalEmail({
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
      collegeName: 'National Institute of Technology',
      ambassadorId: 'NGCA-2026-0142',
      cohortName: 'Campus Ambassador Cohort 2026',
      baseUrl: 'https://app.nextgen-cto.in',
    });
    assert.match(content.html, /National Institute of Technology/);
    assert.match(content.html, /NGCA-2026-0142/);
    assert.match(content.html, /Campus Ambassador Cohort 2026/);
    assert.match(content.html, /Open Ambassador Dashboard/);
    assert.match(
      content.html,
      /https:\/\/app\.nextgen-cto\.in\/campus-ambassador/,
    );
    assert.match(content.html, /If the button does not work/);
  });

  it('includes existing header and footer exactly once without duplicated socials', () => {
    const content = buildCampusAmbassadorApprovalEmail({
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
    });
    assert.equal(countOccurrences(content.html, 'NEXTGEN-CTO'), 1);
    assert.equal(countOccurrences(content.html, 'Follow us on'), 1);
    assert.equal(countOccurrences(content.html, 'alt="Instagram"'), 1);
    assert.equal(countOccurrences(content.html, 'alt="LinkedIn"'), 1);
    assert.equal(countOccurrences(content.html, 'alt="YouTube"'), 1);
    assert.equal(countOccurrences(content.html, 'Team NextGen CTO'), 1);
    assert.match(content.html, /Welcome to the community/);
    assert.match(content.html, /This is more than a campus title/);
    assert.match(content.html, /What you can earn along the way/);
    assert.match(content.html, /Your first steps/);
    assert.doesNotMatch(content.html, /Google Student Ambassador/i);
    assert.doesNotMatch(content.html, /Gemini/i);
  });

  it('does not display literal HTML tags as visible text from helpers', () => {
    const content = buildCampusAmbassadorApprovalEmail({
      fullName: 'Test User',
      email: 'test@example.com',
    });
    assert.doesNotMatch(content.html, /&lt;table/i);
    assert.doesNotMatch(content.html, /&lt;tr/i);
    assert.doesNotMatch(content.html, /&lt;td/i);
    assert.match(content.html, /<table role="presentation"/);
  });
});
