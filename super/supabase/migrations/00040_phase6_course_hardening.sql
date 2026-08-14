do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'global_course_modules_sort_order_nonnegative_chk'
  ) then
    alter table public.global_course_modules
      add constraint global_course_modules_sort_order_nonnegative_chk
      check (sort_order >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'global_course_lessons_sort_order_nonnegative_chk'
  ) then
    alter table public.global_course_lessons
      add constraint global_course_lessons_sort_order_nonnegative_chk
      check (sort_order >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'global_course_lesson_resources_sort_order_nonnegative_chk'
  ) then
    alter table public.global_course_lesson_resources
      add constraint global_course_lesson_resources_sort_order_nonnegative_chk
      check (sort_order >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'global_course_assignment_blocks_sort_order_nonnegative_chk'
  ) then
    alter table public.global_course_assignment_blocks
      add constraint global_course_assignment_blocks_sort_order_nonnegative_chk
      check (sort_order >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'global_course_assignment_blocks_parent_scope_chk'
  ) then
    alter table public.global_course_assignment_blocks
      add constraint global_course_assignment_blocks_parent_scope_chk
      check (num_nonnulls(module_id, lesson_id) = 1);
  end if;
end
$$;

create unique index if not exists idx_global_course_order_intents_provider_payment_unique
  on public.global_course_order_intents(provider, provider_payment_id)
  where provider_payment_id is not null;
