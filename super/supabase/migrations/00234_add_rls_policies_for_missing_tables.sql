-- Add RLS policies for tables that had RLS enabled without policies.
-- Superadmin-only access for internal dashboard tables.

-- college_features
DROP POLICY IF EXISTS college_features_superadmin_all ON public.college_features;
CREATE POLICY college_features_superadmin_all
  ON public.college_features FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- rate_limits (service-role only, used by server actions)
DROP POLICY IF EXISTS rate_limits_service_role_all ON public.rate_limits;
CREATE POLICY rate_limits_service_role_all
  ON public.rate_limits FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- legacy_tiered_catalog_archive
DROP POLICY IF EXISTS legacy_tiered_catalog_archive_superadmin_all ON public.legacy_tiered_catalog_archive;
CREATE POLICY legacy_tiered_catalog_archive_superadmin_all
  ON public.legacy_tiered_catalog_archive FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- course_variant_visibility_colleges
DROP POLICY IF EXISTS course_variant_visibility_colleges_superadmin_all ON public.course_variant_visibility_colleges;
CREATE POLICY course_variant_visibility_colleges_superadmin_all
  ON public.course_variant_visibility_colleges FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- course_bundle_visibility_colleges
DROP POLICY IF EXISTS course_bundle_visibility_colleges_superadmin_all ON public.course_bundle_visibility_colleges;
CREATE POLICY course_bundle_visibility_colleges_superadmin_all
  ON public.course_bundle_visibility_colleges FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- student_daily_visits
DROP POLICY IF EXISTS student_daily_visits_superadmin_all ON public.student_daily_visits;
CREATE POLICY student_daily_visits_superadmin_all
  ON public.student_daily_visits FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- student_streaks
DROP POLICY IF EXISTS student_streaks_superadmin_all ON public.student_streaks;
CREATE POLICY student_streaks_superadmin_all
  ON public.student_streaks FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- paid_course_landing_metadata
DROP POLICY IF EXISTS paid_course_landing_metadata_superadmin_all ON public.paid_course_landing_metadata;
CREATE POLICY paid_course_landing_metadata_superadmin_all
  ON public.paid_course_landing_metadata FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- student_todos
DROP POLICY IF EXISTS student_todos_superadmin_all ON public.student_todos;
CREATE POLICY student_todos_superadmin_all
  ON public.student_todos FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- plans
DROP POLICY IF EXISTS plans_superadmin_all ON public.plans;
CREATE POLICY plans_superadmin_all
  ON public.plans FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- plan_features
DROP POLICY IF EXISTS plan_features_superadmin_all ON public.plan_features;
CREATE POLICY plan_features_superadmin_all
  ON public.plan_features FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));

-- tenant_feature_overrides
DROP POLICY IF EXISTS tenant_feature_overrides_superadmin_all_v2 ON public.tenant_feature_overrides;
CREATE POLICY tenant_feature_overrides_superadmin_all_v2
  ON public.tenant_feature_overrides FOR ALL
  USING (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'))
  WITH CHECK (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin'));
