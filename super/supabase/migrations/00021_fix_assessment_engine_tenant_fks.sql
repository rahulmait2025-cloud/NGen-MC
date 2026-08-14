-- Migration 00021: Fix assessment engine FKs from tenants(id) to colleges(id)
-- Use when 00016 was previously applied with REFERENCES tenants(id). Safe to run if constraints already reference colleges.
-- Problem: 00016 referenced tenants(id) but schema uses colleges(id). This migration fixes FKs for existing DBs.
-- Impact: assessments.tenant_id and assessment_assignments.tenant_id will reference colleges(id). No data change.
-- Rollback: ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_tenant_id_fkey; ALTER TABLE assessments ADD CONSTRAINT assessments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE; (only if tenants table exists)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments') THEN
    ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_tenant_id_fkey;
    ALTER TABLE public.assessments ADD CONSTRAINT assessments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.colleges(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_assignments') THEN
    ALTER TABLE public.assessment_assignments DROP CONSTRAINT IF EXISTS assessment_assignments_tenant_id_fkey;
    ALTER TABLE public.assessment_assignments ADD CONSTRAINT assessment_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.colleges(id) ON DELETE CASCADE;
  END IF;
END $$;
