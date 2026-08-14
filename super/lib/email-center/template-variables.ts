import type { EmailTemplateVariable } from './types';
import { DEFAULT_EMAIL_BRAND_LOGO_URL } from '@/lib/brand/email-logo-url';
import { getEmailBrandLogoUrl } from './brand-logo';
import { getEmailCenterAppBaseUrl, getEmailWebsiteUrl } from './brand-links';
import { normalizeRecipientMergeValues } from './recipient-name';

export type TemplateVariableSource = 'recipient' | 'campaign' | 'system';
export type TemplateVariableInputType = 'text' | 'url' | 'date' | 'time' | 'number' | 'percent' | 'textarea';

export interface TemplateVariableMetadata extends EmailTemplateVariable {
  inputType?: TemplateVariableInputType;
  source?: TemplateVariableSource;
  sample?: string;
  placeholder?: string;
  helpText?: string;
}

export const RECIPIENT_VARIABLE_KEYS = new Set(['first_name', 'full_name', 'college_name']);
const SYSTEM_VARIABLE_KEYS = new Set(['dashboard_url', 'unsubscribe_url', 'email_logo_url']);

export const DEFAULT_SYSTEM_VARIABLES: Record<string, string> = {
  dashboard_url: 'https://nextgencto.com/dashboard',
  support_url: 'https://nextgencto.com/support',
  unsubscribe_url: `${getEmailCenterAppBaseUrl()}/email/preferences/preview`,
};

export const DEFAULT_SAMPLE_VALUES: Record<string, string> = {
  email_logo_url: DEFAULT_EMAIL_BRAND_LOGO_URL,
  first_name: 'Anuj',
  full_name: 'Anuj Sharma',
  college_name: 'MAIT',
  program_name: 'NextGen CTO Career Readiness Program',
  module_name: 'AI and Modern Development',
  project_name: 'Portfolio Website',
  mentor_name: 'Anuj Kumar',
  session_date: '15 May 2025',
  session_time: '4:00 PM',
  deadline_date: '30 May 2025',
  progress_percent: '72',
  certificate_url: 'https://example.com/certificate',
  cta_url: 'https://example.com',
  cta_label: 'Open Dashboard',
  dashboard_url: 'https://example.com/dashboard',
  support_url: 'https://example.com/support',
  unsubscribe_url: 'https://example.com/unsubscribe',
};

export function inferVariableSource(key: string): TemplateVariableSource {
  if (RECIPIENT_VARIABLE_KEYS.has(key)) return 'recipient';
  if (SYSTEM_VARIABLE_KEYS.has(key)) return 'system';
  return 'campaign';
}

export function inferInputType(key: string): TemplateVariableInputType {
  if (key.endsWith('_url')) return 'url';
  if (key.endsWith('_date')) return 'date';
  if (key.endsWith('_time')) return 'time';
  if (key.includes('percent')) return 'percent';
  return 'text';
}

export function normalizeTemplateVariables(
  variables: EmailTemplateVariable[]
): TemplateVariableMetadata[] {
  return (variables ?? []).map((variable) => ({
    ...variable,
    source: variable.source ?? inferVariableSource(variable.key),
    inputType: variable.inputType ?? inferInputType(variable.key),
    sample: variable.sample ?? DEFAULT_SAMPLE_VALUES[variable.key],
  }));
}

export function buildTemplateSampleValues(
  variables: TemplateVariableMetadata[]
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const variable of variables) {
    const sample = variable.sample
      ?? variable.placeholder
      ?? DEFAULT_SAMPLE_VALUES[variable.key]
      ?? `Sample ${variable.key.replace(/_/g, ' ')}`;
    values[variable.key] = String(sample ?? '');
  }

  return values;
}

export function pickVariableValues(
  values: Record<string, string> | undefined,
  keys: Iterable<string>
): Record<string, string> {
  const output: Record<string, string> = {};
  if (!values) return output;

  for (const key of keys) {
    if (values[key] !== undefined) {
      output[key] = values[key];
    }
  }

  return output;
}

function isBlankMergeValue(value: string | undefined | null): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

/** Later layers only replace earlier values when the new value is non-blank. */
function mergeLayersPreservingNonBlank(
  ...layers: Array<Record<string, string | undefined | null> | undefined>
): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined || value === null) continue;
      if (isBlankMergeValue(value)) continue;
      merged[key] = String(value).trim();
    }
  }

  return merged;
}

/** Campaign JSON must not supply recipient merge keys (legacy rows may still contain them). */
export function stripRecipientKeysFromCampaignValues(
  values: Record<string, string> | undefined
): Record<string, string> {
  if (!values) return {};
  const out = { ...values };
  for (const key of RECIPIENT_VARIABLE_KEYS) {
    delete out[key];
  }
  return out;
}

export function mergePreviewVariables(options: {
  templateSampleValues: Record<string, string>;
  systemValues?: Record<string, string>;
  campaignValues?: Record<string, string>;
  recipientValues?: Record<string, string>;
  recipientEmail?: string | null;
}): Record<string, string> {
  const { templateSampleValues, systemValues, campaignValues, recipientValues, recipientEmail } = options;

  const merged = mergeLayersPreservingNonBlank(
    templateSampleValues,
    systemValues,
    stripRecipientKeysFromCampaignValues(campaignValues),
    recipientValues
  );

  return normalizeRecipientMergeValues(merged, { email: recipientEmail ?? null });
}

export function mergeSendVariables(options: {
  templateSampleValues: Record<string, string>;
  systemValues?: Record<string, string>;
  campaignValues?: Record<string, string>;
  recipientValues?: Record<string, string>;
  unsubscribeUrl?: string;
  recipientEmail?: string | null;
  recipientFallback?: string;
}): Record<string, string> {
  const {
    templateSampleValues,
    systemValues,
    campaignValues,
    recipientValues,
    unsubscribeUrl,
    recipientEmail,
    recipientFallback,
  } = options;

  const merged = mergeLayersPreservingNonBlank(
    templateSampleValues,
    systemValues,
    recipientValues,
    stripRecipientKeysFromCampaignValues(campaignValues)
  );

  if (unsubscribeUrl) {
    merged.unsubscribe_url = unsubscribeUrl;
  }

  return normalizeRecipientMergeValues(merged, {
    email: recipientEmail ?? null,
    fallback: recipientFallback,
  });
}

/** System merge values for preview and outbox (includes public logo URL from env). */
export function getSystemValuesForEmailMerge(): Record<string, string> {
  return {
    ...DEFAULT_SYSTEM_VARIABLES,
    email_logo_url: getEmailBrandLogoUrl(),
    email_website_url: getEmailWebsiteUrl(),
  };
}
