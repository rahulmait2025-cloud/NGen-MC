export interface NormalizedEmailEvent {
  provider: 'sendgrid' | 'resend';
  providerEventId: string | null;
  providerMessageId: string | null;
  eventType: EmailEventType;
  email: string | null;
  timestamp: Date;
  url: string | null;
  userAgent: string | null;
  rawEvent: Record<string, unknown>;
}

export type EmailEventType =
  | 'sent'
  | 'queued'
  | 'processed'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'dropped'
  | 'deferred'
  | 'complained'
  | 'unsubscribed'
  | 'group_unsubscribe'
  | 'failed';

export interface WebhookConfig {
  provider: 'sendgrid' | 'resend';
  secret?: string;
  allowUnverified?: boolean;
}

export const EVENT_TYPE_MAPPING: Record<string, EmailEventType> = {
  delivered: 'delivered',
  open: 'opened',
  click: 'clicked',
  bounce: 'bounced',
  dropped: 'dropped',
  deferred: 'deferred',
  spamreport: 'complained',
  unsubscribe: 'unsubscribed',
  group_unsubscribe: 'unsubscribed',
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};