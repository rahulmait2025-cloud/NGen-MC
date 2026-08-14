import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_CUSTOM_CTAS,
  buildComposerPlainText,
  compileCustomEmail,
  createCtaId,
  createEmptyComposerState,
  findUnsupportedVariables,
  isSafeHttpsUrl,
  looksLikeFullEmailDocument,
  parseComposerState,
  resolveContentMode,
  validateComposerState,
  type CustomEmailComposerState,
} from '../../lib/email-center/custom-composer';
import {
  brandedShellIncludesHeader,
  brandedShellIncludesUnsubscribe,
  wrapInBrandedEmailShell,
} from '../../lib/email-center/email-shell';
import { COMPOSER_BODY_SANITIZE_OPTIONS } from '../../lib/email-center/sanitize-html-config';
import { renderCampaignContent } from '../../lib/email-center/template-renderer';
import { EMAIL_PREVIEW_IFRAME_SANDBOX } from '../../lib/email-center/email-preview-sandbox';

describe('custom email composer validation', () => {
  it('rejects empty subject and empty body when required', () => {
    const state = createEmptyComposerState();
    const result = validateComposerState(state, {
      subject: '',
      previewText: '',
      emailCategory: 'growth_marketing',
      requireNonEmptyBody: true,
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'subject_empty'));
    assert.ok(result.issues.some((i) => i.code === 'body_empty'));
  });

  it('enforces max three CTAs and one primary', () => {
    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      body_html: '<p>Hello {{first_name}}</p>',
      body_text: 'Hello',
      ctas: [
        { id: '1', label: 'A', url: 'https://example.com/a', style: 'primary' },
        { id: '2', label: 'B', url: 'https://example.com/b', style: 'primary' },
        { id: '3', label: 'C', url: 'https://example.com/c', style: 'secondary' },
        { id: '4', label: 'D', url: 'https://example.com/d', style: 'secondary' },
      ],
    };
    const result = validateComposerState(state, {
      subject: 'Hello',
      emailCategory: 'growth_marketing',
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'primary_cta' || i.code === 'schema' || i.code === 'cta_max'));
    assert.ok(state.ctas.length > MAX_CUSTOM_CTAS);
  });

  it('rejects unsafe CTA URLs', () => {
    assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);
    assert.equal(isSafeHttpsUrl('data:text/html,hi'), false);
    assert.equal(isSafeHttpsUrl('http://insecure.example'), false);
    assert.equal(isSafeHttpsUrl('https://nextgen-cto.in/dashboard'), true);

    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      body_html: '<p>Hi</p>',
      body_text: 'Hi',
      ctas: [{ id: createCtaId(), label: 'Bad', url: 'javascript:alert(1)', style: 'primary' }],
    };
    const result = validateComposerState(state, {
      subject: 'Test',
      emailCategory: 'notices',
    });
    assert.equal(result.ok, false);
  });

  it('requires transactional confirmation when lane is transactional_essential', () => {
    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      body_html: '<p>Account notice</p>',
      body_text: 'Account notice',
    };
    const blocked = validateComposerState(state, {
      subject: 'Essential',
      emailCategory: 'transactional_essential',
      transactionalConfirmed: false,
    });
    assert.equal(blocked.ok, false);
    assert.ok(blocked.issues.some((i) => i.code === 'transactional_confirm'));

    const allowed = validateComposerState(state, {
      subject: 'Essential',
      emailCategory: 'transactional_essential',
      transactionalConfirmed: true,
    });
    assert.equal(allowed.ok, true);
  });

  it('blocks unsupported merge variables', () => {
    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      body_html: '<p>Secret {{internal_user_id}}</p>',
      body_text: 'Secret',
    };
    const unsupported = findUnsupportedVariables(state, 'Hi', '');
    assert.deepEqual(unsupported, ['internal_user_id']);
    const result = validateComposerState(state, {
      subject: 'Hi',
      emailCategory: 'growth_marketing',
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'unsupported_variable'));
  });

  it('warns on duplicate CTA destinations', () => {
    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      body_html: '<p>Hi</p>',
      body_text: 'Hi',
      ctas: [
        { id: '1', label: 'One', url: 'https://example.com/x', style: 'primary' },
        { id: '2', label: 'Two', url: 'https://example.com/x', style: 'secondary' },
      ],
    };
    const result = validateComposerState(state, {
      subject: 'Hi',
      emailCategory: 'growth_marketing',
    });
    assert.equal(result.ok, true);
    assert.ok(result.issues.some((i) => i.code === 'cta_duplicate' && i.level === 'warning'));
  });
});

describe('composer HTML sanitisation policy', () => {
  it('forbids scripts, iframes, forms, and event handlers in allowlist config', () => {
    assert.ok(COMPOSER_BODY_SANITIZE_OPTIONS.FORBID_TAGS.includes('script'));
    assert.ok(COMPOSER_BODY_SANITIZE_OPTIONS.FORBID_TAGS.includes('iframe'));
    assert.ok(COMPOSER_BODY_SANITIZE_OPTIONS.FORBID_TAGS.includes('form'));
    assert.ok(COMPOSER_BODY_SANITIZE_OPTIONS.FORBID_ATTR.includes('onclick'));
    assert.ok(COMPOSER_BODY_SANITIZE_OPTIONS.FORBID_ATTR.includes('onerror'));
    assert.ok(COMPOSER_BODY_SANITIZE_OPTIONS.ALLOWED_TAGS.includes('p'));
    assert.ok(COMPOSER_BODY_SANITIZE_OPTIONS.ALLOWED_TAGS.includes('a'));
    assert.ok(!COMPOSER_BODY_SANITIZE_OPTIONS.ALLOWED_TAGS.includes('script'));
  });
});

describe('custom email shell and compile', () => {
  it('includes branded header and unsubscribe for non-transactional', () => {
    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      heading: 'Welcome',
      body_html: '<p>Hello {{first_name}}</p>',
      body_text: 'Hello',
      ctas: [{ id: '1', label: 'Open', url: 'https://nextgen-cto.in/', style: 'primary' }],
    };
    const compiled = compileCustomEmail({
      state,
      subject: 'Welcome',
      previewText: 'Preview',
      emailCategory: 'growth_marketing',
      sanitizedBodyHtml: state.body_html,
    });
    assert.ok(brandedShellIncludesHeader(compiled.html_body));
    assert.ok(brandedShellIncludesUnsubscribe(compiled.html_body));
    assert.match(compiled.html_body, /max-width:680px/);
    assert.match(compiled.html_body, /\{\{unsubscribe_url\}\}/);
    assert.match(compiled.html_body, /\{\{email_website_url\}\}/);
    assert.match(compiled.html_body, /Open/);
    assert.match(compiled.text_body, /Open: https:\/\/nextgen-cto\.in\//);
    assert.match(compiled.text_body, /\{\{unsubscribe_url\}\}/);
  });

  it('uses transactional footer without preference unsubscribe link', () => {
    const html = wrapInBrandedEmailShell({
      bodyHtml: '<p>Security notice</p>',
      previewText: 'Security',
      title: 'Security',
      includeUnsubscribe: false,
    });
    assert.ok(brandedShellIncludesHeader(html));
    assert.equal(brandedShellIncludesUnsubscribe(html), false);
    assert.match(html, /essential account or service message/i);
    assert.doesNotMatch(html, /\{\{unsubscribe_url\}\}/);
  });

  it('renders plain-text CTAs', () => {
    const text = buildComposerPlainText({
      ...createEmptyComposerState(),
      body_text: 'Body',
      ctas: [
        { id: '1', label: 'Primary CTA', url: 'https://a.example/', style: 'primary' },
        { id: '2', label: 'Secondary CTA', url: 'https://b.example/', style: 'secondary' },
      ],
    }, 'Subject');
    assert.match(text, /Primary CTA: https:\/\/a\.example\//);
    assert.match(text, /Secondary CTA: https:\/\/b\.example\//);
  });

  it('reopens and edits composer state without parsing compiled HTML', () => {
    const original: CustomEmailComposerState = {
      schema_version: 1,
      heading: 'Heading',
      body_html: '<p>Editable</p>',
      body_text: 'Editable',
      ctas: [{ id: 'cta_1', label: 'Go', url: 'https://example.com', style: 'primary' }],
    };
    const parsed = parseComposerState(original);
    assert.ok(parsed);
    assert.equal(parsed!.heading, 'Heading');
    assert.equal(parsed!.ctas[0]?.label, 'Go');

    const edited = { ...parsed!, heading: 'Updated' };
    assert.equal(edited.heading, 'Updated');
    assert.equal(edited.body_html, '<p>Editable</p>');
  });

  it('keeps legacy no-template campaigns compatible', () => {
    assert.equal(
      resolveContentMode({
        content_mode: null,
        template_id: null,
        composer_state: null,
        html_body: '<html><body>Old custom</body></html>',
      }),
      'legacy_html'
    );
    assert.equal(
      resolveContentMode({
        content_mode: 'custom_composer',
        template_id: null,
        composer_state: createEmptyComposerState(),
        html_body: '<html></html>',
      }),
      'custom_composer'
    );
    assert.equal(
      resolveContentMode({
        content_mode: 'template',
        template_id: '11111111-1111-1111-1111-111111111111',
        composer_state: null,
        html_body: '<html></html>',
      }),
      'template'
    );
  });

  it('produces mobile-safe email HTML structure', () => {
    const html = wrapInBrandedEmailShell({
      bodyHtml: '<p>Mobile check</p>',
      previewText: 'pre',
      title: 't',
      includeUnsubscribe: true,
    });
    assert.match(html, /viewport/);
    assert.match(html, /-webkit-text-size-adjust:100%/);
    assert.match(html, /role="presentation"/);
    assert.match(html, /max-width:680px/);
  });
});

describe('legacy conversion safety', () => {
  it('detects full email documents and refuses nested shell conversion', () => {
    const legacyFull = wrapInBrandedEmailShell({
      bodyHtml: '<p>Legacy body</p>',
      previewText: 'pre',
      title: 'Legacy',
      includeUnsubscribe: true,
    });
    assert.equal(looksLikeFullEmailDocument(legacyFull), true);
    assert.equal(looksLikeFullEmailDocument('<html><body>old</body></html>'), true);
    assert.equal(looksLikeFullEmailDocument('<p>fragment only</p>'), false);

    // Conversion must start from empty composer state — never wrap legacy HTML.
    const converted = createEmptyComposerState();
    assert.equal(looksLikeFullEmailDocument(converted.body_html), false);
    const compiled = compileCustomEmail({
      state: converted,
      subject: 'Fresh',
      previewText: '',
      emailCategory: 'growth_marketing',
      sanitizedBodyHtml: converted.body_html || '<p></p>',
    });
    assert.equal(compiled.html_body.includes(legacyFull), false);
  });
});

describe('preview isolation', () => {
  it('uses empty sandbox attribute for most restrictive iframe isolation', () => {
    assert.equal(EMAIL_PREVIEW_IFRAME_SANDBOX, '');
  });
});

describe('custom email send-test payload (composer → validate → compile → merge)', () => {
  it('includes subject, preview, shell, body, CTA, footer, plain-text CTA URL; leaves links untracked', () => {
    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      heading: 'Launch',
      body_html: '<p>Hello {{first_name}}, custom body here.</p>',
      body_text: 'Hello custom body here.',
      ctas: [{
        id: '1',
        label: 'Open dashboard',
        url: 'https://nextgen-cto.in/dashboard',
        style: 'primary',
      }],
    };

    const validation = validateComposerState(state, {
      subject: 'Custom subject line',
      previewText: 'Custom preview text',
      emailCategory: 'growth_marketing',
      requireNonEmptyBody: true,
    });
    assert.equal(validation.ok, true);
    assert.ok(validation.state);

    // Server path sanitises then compiles; here body is already safe HTML for the unit test.
    const compiled = compileCustomEmail({
      state: validation.state!,
      subject: 'Custom subject line',
      previewText: 'Custom preview text',
      emailCategory: 'growth_marketing',
      sanitizedBodyHtml: validation.state!.body_html,
    });

    const rendered = renderCampaignContent(
      'Custom subject line',
      'Custom preview text',
      compiled.html_body,
      compiled.text_body,
      {
        first_name: 'Ada',
        unsubscribe_url: 'https://prefs.example/u/test',
        email_logo_url: 'https://cdn.example/logo.png',
        email_header_display: 'NextGen CTO',
        email_website_url: 'https://nextgen-cto.in/',
      }
    );

    assert.equal(rendered.subject, 'Custom subject line');
    assert.equal(rendered.previewText, 'Custom preview text');
    assert.match(rendered.html, /#0B0F19/); // common header
    assert.match(rendered.html, /Hello Ada, custom body here/);
    assert.match(rendered.html, /Open dashboard/);
    assert.match(rendered.html, /https:\/\/nextgen-cto\.in\/dashboard/);
    assert.match(rendered.html, /https:\/\/prefs\.example\/u\/test/); // preference/unsubscribe resolved
    assert.match(rendered.html, /Follow us on/); // common footer
    assert.match(rendered.text, /Open dashboard: https:\/\/nextgen-cto\.in\/dashboard/);
    // Test-send does not inject tracking; outbox may add an open pixel only
    // (click href wrapping is off unless EMAIL_CENTER_CLICK_TRACKING=1).
    assert.doesNotMatch(rendered.html, /\/api\/email\/track\/click/);
    assert.doesNotMatch(rendered.text, /\/api\/email\/track\/click/);
  });

  it('transactional custom emails omit unsubscribe merge token after compile', () => {
    const state: CustomEmailComposerState = {
      ...createEmptyComposerState(),
      body_html: '<p>Payment receipt</p>',
      body_text: 'Payment receipt',
    };
    const compiled = compileCustomEmail({
      state,
      subject: 'Receipt',
      previewText: 'Receipt',
      emailCategory: 'transactional_essential',
      sanitizedBodyHtml: state.body_html,
    });
    assert.equal(compiled.includeUnsubscribe, false);
    assert.doesNotMatch(compiled.html_body, /\{\{unsubscribe_url\}\}/);
    assert.match(compiled.html_body, /essential account or service message/i);
  });
});
