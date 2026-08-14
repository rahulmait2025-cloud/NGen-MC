-- Add slug column to dsa_sheets for URL-friendly routing
-- Slug is derived from title: lowercase, hyphens instead of spaces, alphanumeric only

ALTER TABLE dsa_sheets ADD COLUMN slug TEXT;

-- Populate existing rows with slugs generated from their titles
UPDATE dsa_sheets
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'
  )
);

-- Enforce uniqueness on slug
CREATE UNIQUE INDEX idx_dsa_sheets_slug ON dsa_sheets (slug);

-- Make slug NOT NULL after populating existing data
ALTER TABLE dsa_sheets ALTER COLUMN slug SET NOT NULL;
