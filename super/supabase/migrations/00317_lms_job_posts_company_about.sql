-- Add company_about column to job_posts table
-- Stores a brief description about the company for job listings

ALTER TABLE job_posts
ADD COLUMN IF NOT EXISTS company_about text;
