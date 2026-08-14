export interface AnalyticsConfig {
  measurementId: string;
  debugMode: boolean;
}

export type SectionName =
  | 'hero'
  | 'college_strip'
  | 'program'
  | 'dashboard_preview'
  | 'founders'
  | 'youtube_stats'
  | 'testimonials'
  | 'faq'
  | 'footer'
  | 'sticky_cta'
  | 'roi';

export interface SectionEventParams {
  page_name?: string;
  section_name: string;
  current_path?: string;
  referrer?: string;
}

export interface CTAEventParams {
  cta_name: string;
  cta_location: string;
  page_name?: string;
  current_path?: string;
}

export interface FormEventParams {
  form_name: string;
  form_location?: string;
  success?: boolean;
  error_message?: string;
}
