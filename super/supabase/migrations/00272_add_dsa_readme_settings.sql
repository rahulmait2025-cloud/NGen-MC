-- Migration: Add dsa_readme_markdown to platform_settings
-- To store platform-level customizable DSA sheets landing page readme content.

ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS dsa_readme_markdown TEXT DEFAULT NULL;
