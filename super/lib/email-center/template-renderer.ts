import type { RenderedEmail, EmailTemplate } from './types';
import { applyEmailLogoImgStyle } from '@/lib/brand/email-logo-markup';
import { getEmailBrandLogoUrl, resolveEmailLogoUrl } from './brand-logo';
import { getEmailCenterAppBaseUrl, getEmailWebsiteUrl } from './brand-links';
import { normalizeEmailCopyrightYear } from './email-shell';
import {
  DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK,
  normalizeRecipientMergeValues,
} from './recipient-name';
import {
  buildEmailHeaderDisplay,
  isPlaceholderEmailHeaderDisplay,
  normalizeRecipientCollegeName,
} from './email-header-branding';

export interface RenderVariables {
  [key: string]: string | number | boolean | unknown[] | unknown;
}

/** Keys that must be HTML-escaped when substituted into HTML bodies. */
const HTML_ESCAPED_TEXT_KEYS = new Set([
  'first_name',
  'full_name',
  'college_name',
  'name',
  'display_name',
]);

const DEFAULT_VARIABLES: RenderVariables = {
  // Empty → normalizeRecipientMergeValues fills with shared fallback ("there").
  first_name: '',
  full_name: '',
  college_name: '',
  course_name: 'Your Course',
  program_name: 'Your Program',
  cta_url: '#',
  cta_label: 'Learn More',
  dashboard_url: 'https://nextgencto.com/dashboard',
  support_url: 'https://nextgencto.com/support',
  unsubscribe_url: `${getEmailCenterAppBaseUrl()}/email/preferences/preview`,
  email_website_url: getEmailWebsiteUrl(),
  subject: '',
  preview_text: '',
  headline: '',
  body: '',
  footer_text: '(c) 2026 NextGen-CTO Pvt. Ltd. All rights reserved.',
  // Never leave an empty logo default — withLogoDefaults always resolves a real HTTPS URL.
  email_logo_url: '',
  email_header_display: 'NextGen CTO',
  email_preheader_text: '',
  email_program_lead_html: '',
  email_program_lead_text: '',
};

function withLogoDefaults(vars: RenderVariables): RenderVariables {
  const passthrough: RenderVariables = {};
  const stringVars: Record<string, string> = {};

  for (const [key, value] of Object.entries(vars)) {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      passthrough[key] = value;
      continue;
    }
    if (value !== null && value !== undefined) {
      stringVars[key] = String(value);
    }
  }

  const normalized = normalizeRecipientMergeValues({
    ...Object.fromEntries(
      Object.entries(DEFAULT_VARIABLES).map(([k, v]) => [k, String(v ?? '')])
    ),
    ...stringVars,
    email: typeof vars.email === 'string' ? vars.email : stringVars.email,
  }, { fallback: DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK });

  const collegeName = normalizeRecipientCollegeName(normalized.college_name);
  const headerFromVars = normalized.email_header_display;
  const emailHeaderDisplay = isPlaceholderEmailHeaderDisplay(headerFromVars)
    ? buildEmailHeaderDisplay(collegeName)
    : headerFromVars;

  return {
    ...DEFAULT_VARIABLES,
    ...passthrough,
    ...normalized,
    college_name: collegeName ?? '',
    // Must win over empty DEFAULT / normalized overwrite — broken logos came from src="".
    email_logo_url: resolveEmailLogoUrl(normalized.email_logo_url),
    email_header_display: emailHeaderDisplay,
  };
}

function escapeHtml(text: string | undefined | null): string {
  if (text === undefined || text === null) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function replaceSimpleVariables(
  template: string,
  vars: RenderVariables,
  options?: { html?: boolean },
): string {
  let result = template;
  const allVars = withLogoDefaults(vars);
  const asHtml = options?.html === true;

  for (const [key, value] of Object.entries(allVars)) {
    let replaceWith = '';

    if (value === null || value === undefined) {
      replaceWith = '';
    } else if (Array.isArray(value)) {
      continue;
    } else if (typeof value === 'object') {
      replaceWith = JSON.stringify(value);
    } else {
      replaceWith = String(value);
    }

    if (asHtml && HTML_ESCAPED_TEXT_KEYS.has(key)) {
      replaceWith = escapeHtml(replaceWith);
    }

    result = result.replaceAll(`{{${key}}}`, replaceWith);
  }

  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result;
}

function replaceHandlebarsArrays(
  template: string,
  htmlTemplate: string,
  vars: RenderVariables
): { html: string; text: string } {
  const arrayPattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  let htmlResult = htmlTemplate;
  let textResult = template;

  const allVars = withLogoDefaults(vars);

  for (const [key, value] of Object.entries(allVars)) {
    if (!Array.isArray(value)) continue;

    const itemRegex = new RegExp(`\\{\\{#each\\s+${key}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`, 'g');

    const replaceEach = (match: string, inner: string): string => {
      if (!value || value.length === 0) return '';

      const itemsHtml: string[] = [];
      const itemsText: string[] = [];

      for (const item of value) {
        let itemHtml = inner;
        let itemText = inner;

        if (typeof item === 'object' && item !== null) {
          for (const [itemKey, itemValue] of Object.entries(item)) {
            const _itemPlaceholder = `{{this.${itemKey}}}`;
            const itemValueStr = itemValue !== null ? String(itemValue) : '';
            itemHtml = itemHtml.replaceAll(`{{${itemKey}}}`, escapeHtml(itemValueStr));
            itemText = itemText.replaceAll(`{{${itemKey}}}`, itemValueStr);
          }
        } else {
          const itemValueStr = item !== null ? String(item) : '';
          itemHtml = itemHtml.replace(/\{\{this\}\}/g, escapeHtml(itemValueStr));
          itemText = itemText.replace(/\{\{this\}\}/g, itemValueStr);
        }

        itemsHtml.push(itemHtml);
        itemsText.push(itemText);
      }

      return itemsHtml.join('');
    };

    htmlResult = htmlResult.replace(itemRegex, replaceEach);
    textResult = textResult.replace(itemRegex, replaceEach);
  }

  htmlResult = htmlResult.replace(arrayPattern, '');
  textResult = textResult.replace(arrayPattern, '');

  return { html: htmlResult, text: textResult };
}

 
function _renderTemplate(
  template: EmailTemplate,
  variables: RenderVariables = {}
): RenderedEmail {
  const vars = withLogoDefaults(variables);

  const subject = replaceSimpleVariables(template.subject_template, vars);
  const previewText = template.preview_text_template
    ? replaceSimpleVariables(template.preview_text_template, vars)
    : '';

  let htmlTemplate = template.html_template;
  let textTemplate = template.text_template;

  const hasArrays = Object.values(vars).some((v) => Array.isArray(v));

  if (hasArrays) {
    const { html, text } = replaceHandlebarsArrays(textTemplate, htmlTemplate, vars);
    htmlTemplate = html;
    textTemplate = text;
  }

  const logoUrl = getEmailBrandLogoUrl();
  const htmlBody = applyEmailLogoImgStyle(
    replaceSimpleVariables(htmlTemplate, vars, { html: true }),
    logoUrl,
  );
  const textBody = replaceSimpleVariables(textTemplate, vars);

  return {
    subject,
    previewText,
    html: normalizeEmailCopyrightYear(htmlBody),
    text: textBody,
  };
}

export function renderCampaignContent(
  subject: string,
  previewText: string | null,
  htmlBody: string,
  textBody: string,
  variables: RenderVariables = {}
): RenderedEmail {
  const vars = withLogoDefaults(variables);

  const subjectRendered = replaceSimpleVariables(subject, vars);
  const previewRendered = previewText ? replaceSimpleVariables(previewText, vars) : '';

  let htmlResult = htmlBody;
  const textResult = textBody || htmlBody.replace(/<[^>]*>/g, '\n').replace(/\n{2,}/g, '\n\n').trim();

  const hasArrays = Object.values(vars).some((v) => Array.isArray(v));

  if (hasArrays) {
    const { html } = replaceHandlebarsArrays(textResult, htmlResult, vars);
    htmlResult = html;
  }

  const logoUrl = getEmailBrandLogoUrl();
  const htmlFinal = applyEmailLogoImgStyle(
    replaceSimpleVariables(htmlResult, vars, { html: true }),
    logoUrl,
  );
  const textFinal = replaceSimpleVariables(textResult, vars);

  return {
    subject: subjectRendered,
    previewText: previewRendered,
    html: normalizeEmailCopyrightYear(htmlFinal),
    text: textFinal,
  };
}
