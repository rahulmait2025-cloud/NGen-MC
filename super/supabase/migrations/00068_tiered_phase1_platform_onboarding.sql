-- Phase 1 alignment: optional default tiered bundle assignment for new colleges (Super Admin configures code).

alter table public.platform_settings
  add column if not exists default_onboarding_tiered_bundle_code text null;

comment on column public.platform_settings.default_onboarding_tiered_bundle_code is
  'When set to a published tiered_bundles.code, new partner colleges receive an active college-scoped tiered assignment for that bundle (idempotent).';
