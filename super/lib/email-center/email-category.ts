import type { EmailCampaignType } from '@/lib/email-center/types';

/** NextGen CTO Email Center delivery lanes (stored on campaigns + outbox). */
export const EMAIL_CENTER_LANES = [
  'growth_marketing',
  'academics',
  'mentorship_community',
  'notices',
  'transactional_essential',
] as const;

export type EmailCenterLane = (typeof EMAIL_CENTER_LANES)[number];

const EMAIL_CENTER_LANE_LABELS: Record<EmailCenterLane, string> = {
  growth_marketing: 'Growth / Marketing',
  academics: 'Academics',
  mentorship_community: 'Mentorship / Community',
  notices: 'Notices',
  transactional_essential: 'Transactional / Essential',
};

export const EMAIL_CENTER_LANE_OPTIONS = EMAIL_CENTER_LANES.map((value) => ({
  value,
  label: EMAIL_CENTER_LANE_LABELS[value],
}));

type PreferenceOptOutKey =
  | 'marketing_opt_out'
  | 'announcements_opt_out'
  | 'product_updates_opt_out'
  | 'notices_opt_out';

const LANE_PREFERENCE_MAP: Record<EmailCenterLane, PreferenceOptOutKey | null> = {
  growth_marketing: 'marketing_opt_out',
  academics: 'announcements_opt_out',
  mentorship_community: 'product_updates_opt_out',
  notices: 'notices_opt_out',
  transactional_essential: null,
};

function isEmailCenterLane(value: string): value is EmailCenterLane {
  return (EMAIL_CENTER_LANES as readonly string[]).includes(value);
}

export function normalizeEmailCenterLane(
  value: string | null | undefined,
  fallback: EmailCenterLane = 'growth_marketing',
): EmailCenterLane {
  if (value && isEmailCenterLane(value)) return value;
  return fallback;
}

function legacyCampaignTypeToLane(campaignType: string | null | undefined): EmailCenterLane {
  switch (campaignType) {
    case 'marketing':
    case 'product_launch':
    case 'custom':
      return 'growth_marketing';
    case 'announcement':
      return 'academics';
    case 'notice':
      return 'notices';
    case 'operational':
    case 'notification':
      return 'transactional_essential';
    default:
      return 'growth_marketing';
  }
}

export function laneToLegacyCampaignType(lane: EmailCenterLane): EmailCampaignType {
  switch (lane) {
    case 'growth_marketing':
      return 'marketing';
    case 'academics':
      return 'announcement';
    case 'mentorship_community':
      return 'product_launch';
    case 'notices':
      return 'notice';
    case 'transactional_essential':
      return 'operational';
    default:
      return 'marketing';
  }
}

export function getCampaignEmailCategory(campaign: {
  email_category?: string | null;
  campaign_type?: string | null;
}): EmailCenterLane {
  if (campaign.email_category && isEmailCenterLane(campaign.email_category)) {
    return campaign.email_category;
  }
  return legacyCampaignTypeToLane(campaign.campaign_type);
}

export function laneRespectsGlobalUnsubscribe(lane: EmailCenterLane): boolean {
  return lane !== 'transactional_essential';
}

export function getPreferenceKeyForLane(lane: EmailCenterLane): PreferenceOptOutKey | null {
  return LANE_PREFERENCE_MAP[lane];
}

/** Provider sendEmail category (unchanged adapter contract). */
export function laneToProviderSendCategory(lane: EmailCenterLane): 'announcement' | 'test_email' {
  if (lane === 'transactional_essential') return 'announcement';
  return 'announcement';
}

export function templateCategoryToDefaultLane(templateCategory: string | null | undefined): EmailCenterLane {
  switch (templateCategory) {
    case 'marketing':
    case 'product_launch':
      return 'growth_marketing';
    case 'announcement':
      return 'academics';
    case 'notice':
      return 'notices';
    case 'operational':
    case 'notification':
      return 'transactional_essential';
    default:
      return 'growth_marketing';
  }
}
