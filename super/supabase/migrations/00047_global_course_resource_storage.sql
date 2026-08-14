-- 00047: Private storage for global course lesson resources + metadata columns.
-- Path convention: {course_id}/{lesson_id}/{resource_id}/{sanitized_filename}

-------------------------------------------------------------------------------
-- A) Table columns
-------------------------------------------------------------------------------

alter table public.global_course_lesson_resources
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint
    check (size_bytes is null or size_bytes >= 0);

alter table public.global_course_lesson_resources
  alter column url drop not null;

alter table public.global_course_lesson_resources
  drop constraint if exists global_course_lesson_resources_url_or_storage_chk;

alter table public.global_course_lesson_resources
  add constraint global_course_lesson_resources_url_or_storage_chk
  check (
    coalesce(trim(url), '') <> ''
    or coalesce(trim(storage_path), '') <> ''
  );

alter table public.global_course_lesson_resources
  drop constraint if exists global_course_lesson_resources_resource_type_check;

alter table public.global_course_lesson_resources
  add constraint global_course_lesson_resources_resource_type_check
  check (
    resource_type in (
      'pdf',
      'link',
      'file',
      'notes_pdf',
      'assignment',
      'attachment',
      'assignment_file',
      'attachment_file',
      'external_link'
    )
  );

comment on column public.global_course_lesson_resources.storage_bucket is
  'Supabase Storage bucket id; null for external_link-only rows.';
comment on column public.global_course_lesson_resources.storage_path is
  'Object path within the bucket (first segment = global course id).';
comment on column public.global_course_lesson_resources.original_filename is
  'Original client filename for download display.';
comment on column public.global_course_lesson_resources.mime_type is
  'MIME type from upload (optional).';
comment on column public.global_course_lesson_resources.size_bytes is
  'Byte size of uploaded object (optional).';

-------------------------------------------------------------------------------
-- B) Storage bucket (private; signed URLs for learners)
-------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'global-course-resources',
  'global-course-resources',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Global course resources: superadmin full access" on storage.objects;
create policy "Global course resources: superadmin full access"
on storage.objects for all
to authenticated
using (
  bucket_id = 'global-course-resources'
  and exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
)
with check (
  bucket_id = 'global-course-resources'
  and exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
);

drop policy if exists "Global course resources: enrolled students read" on storage.objects;
create policy "Global course resources: enrolled students read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'global-course-resources'
  and (storage.foldername(name))[1]::uuid in (
    select e.course_id
    from public.global_course_enrollments e
    join public.students s on s.id = e.student_id
    where s.user_id = auth.uid()
      and e.status = 'active'
  )
);

-------------------------------------------------------------------------------
-- C) Student RPC: include storage metadata on resources
-------------------------------------------------------------------------------

create or replace function public.get_student_visible_course_detail(
  p_course_id uuid,
  p_college_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access record;
  v_detail jsonb;
begin
  select *
    into v_access
  from public.validate_course_access_for_learner(p_course_id, p_college_slug)
  limit 1;

  if coalesce(v_access.allowed, false) = false then
    if coalesce(v_access.access_reason, '') = 'purchase_required' then
      return (
        select jsonb_build_object(
          'allowed', false,
          'reason', 'purchase_required',
          'student_id', v_access.student_id,
          'college_id', v_access.college_id,
          'course', jsonb_build_object(
            'id', c.id,
            'slug', c.slug,
            'title', c.title,
            'description', c.description,
            'short_description', c.short_description,
            'long_description', c.long_description,
            'pricing_type', c.pricing_type,
            'intro_thumbnail_url', c.intro_thumbnail_url,
            'intro_banner_url', c.intro_banner_url,
            'intro_hero_image_url', c.intro_hero_image_url,
            'intro_section', c.intro_section,
            'display_price_label', c.display_price_label,
            'b2c_price_minor', c.b2c_price_minor,
            'currency_code', c.currency_code,
            'estimated_lesson_count', c.estimated_lesson_count,
            'estimated_duration_label', c.estimated_duration_label,
            'outcomes', c.outcomes,
            'features', c.features,
            'curriculum_summary', c.curriculum_summary,
            'landing_theme', c.landing_theme,
            'default_validity_days', c.default_validity_days,
            'publish_status', c.publish_status
          ),
          'modules', '[]'::jsonb
        )
        from public.global_courses c
        where c.id = p_course_id
      );
    end if;

    return jsonb_build_object(
      'allowed', false,
      'reason', coalesce(v_access.access_reason, 'access_denied')
    );
  end if;

  select jsonb_build_object(
    'allowed', true,
    'reason', v_access.access_reason,
    'student_id', v_access.student_id,
    'college_id', v_access.college_id,
    'assignment_id', v_access.assignment_id,
    'enrollment_id', v_access.enrollment_id,
    'order_intent_id', v_access.order_intent_id,
    'course', jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'title', c.title,
      'description', c.description,
      'short_description', c.short_description,
      'long_description', c.long_description,
      'pricing_type', c.pricing_type,
      'intro_thumbnail_url', c.intro_thumbnail_url,
      'intro_banner_url', c.intro_banner_url,
      'intro_hero_image_url', c.intro_hero_image_url,
      'intro_section', c.intro_section,
      'display_price_label', c.display_price_label,
      'b2c_price_minor', c.b2c_price_minor,
      'currency_code', c.currency_code,
      'estimated_lesson_count', c.estimated_lesson_count,
      'estimated_duration_label', c.estimated_duration_label,
      'outcomes', c.outcomes,
      'features', c.features,
      'curriculum_summary', c.curriculum_summary,
      'landing_theme', c.landing_theme,
      'default_validity_days', c.default_validity_days,
      'publish_status', c.publish_status
    ),
    'modules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'description', m.description,
          'sort_order', m.sort_order,
          'assignment_blocks', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', ab.id,
                'title', ab.title,
                'description', ab.description,
                'instructions', ab.instructions,
                'sort_order', ab.sort_order,
                'max_score', ab.max_score,
                'is_required', ab.is_required
              )
              order by ab.sort_order, ab.created_at
            )
            from public.global_course_assignment_blocks ab
            where ab.module_id = m.id
          ), '[]'::jsonb),
          'lessons', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'title', l.title,
                'description', l.description,
                'lesson_type', l.lesson_type,
                'video_provider', l.video_provider,
                'video_url', l.video_url,
                'video_source_id', l.video_source_id,
                'youtube_video_url', l.youtube_video_url,
                'written_content', l.written_content,
                'is_preview', l.is_preview,
                'sort_order', l.sort_order,
                'publish_status', l.publish_status,
                'assignment_blocks', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', lab.id,
                      'title', lab.title,
                      'description', lab.description,
                      'instructions', lab.instructions,
                      'sort_order', lab.sort_order,
                      'max_score', lab.max_score,
                      'is_required', lab.is_required
                    )
                    order by lab.sort_order, lab.created_at
                  )
                  from public.global_course_assignment_blocks lab
                  where lab.lesson_id = l.id
                ), '[]'::jsonb),
                'resources', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', r.id,
                      'title', r.title,
                      'resource_type', r.resource_type,
                      'url', r.url,
                      'storage_bucket', r.storage_bucket,
                      'storage_path', r.storage_path,
                      'original_filename', r.original_filename,
                      'mime_type', r.mime_type,
                      'size_bytes', r.size_bytes,
                      'sort_order', r.sort_order
                    )
                    order by r.sort_order, r.created_at
                  )
                  from public.global_course_lesson_resources r
                  where r.lesson_id = l.id
                ), '[]'::jsonb)
              )
              order by l.sort_order, l.created_at
            )
            from public.global_course_lessons l
            where l.module_id = m.id
              and l.publish_status = 'published'
          ), '[]'::jsonb)
        )
        order by m.sort_order, m.created_at
      )
      from public.global_course_modules m
      where m.course_id = c.id
    ), '[]'::jsonb)
  )
    into v_detail
  from public.global_courses c
  where c.id = p_course_id;

  return v_detail;
end;
$$;

comment on function public.get_student_visible_course_detail(uuid, text) is
  'Student-facing RPC. Includes lesson resource storage metadata for signed downloads.';
