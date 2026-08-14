'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { previewMentorshipRecipients, listMentorshipAudienceTargets, resolveAudienceTargetLabels, mentorshipSessionHasQueuedOrSentEmails, countMentorshipRecipients } from '@/lib/services/mentorship-audience-resolver';
import type { MentorshipAudienceTargetInput } from '@/lib/services/mentorship-audience-types';

export async function previewMentorshipRecipientsAction(
  targets: MentorshipAudienceTargetInput[],
) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  try {
    const preview = await previewMentorshipRecipients(targets);
    return { ok: true as const, preview };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to preview recipients';
    return { ok: false as const, error: message };
  }
}

export async function searchMentorshipCollegesAction(query: string, limit = 20) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  try {
    const admin = createAdminClient();
    const trimmed = query.trim();

    let request = admin
      .from('colleges')
      .select('id, name, slug')
      .eq('status', 'active')
      .order('name', { ascending: true })
      .limit(limit);

    if (trimmed) {
      request = request.or(`name.ilike.%${trimmed}%,slug.ilike.%${trimmed}%`);
    }

    const { data, error } = await request;
    if (error) throw new Error(error.message);

    return {
      ok: true as const,
      items: (data ?? []).map((row) => ({
        id: row.id as string,
        label: row.name as string,
        sublabel: row.slug as string,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search colleges';
    return { ok: false as const, error: message };
  }
}

export async function searchMentorshipStudentsAction(query: string, limit = 25) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  try {
    const admin = createAdminClient();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { ok: true as const, items: [] };
    }

    const { data: profiles, error: profileError } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
      .limit(limit);

    if (profileError) throw new Error(profileError.message);

    const userIds = (profiles ?? []).map((p) => p.id);
    if (userIds.length === 0) {
      return { ok: true as const, items: [] };
    }

    const { data: students, error: studentError } = await admin
      .from('students')
      .select('id, user_id, college_id')
      .in('user_id', userIds);

    if (studentError) throw new Error(studentError.message);

    const collegeIds = [...new Set((students ?? []).reduce<string[]>((acc, s) => { if (s.college_id) acc.push(s.college_id as string); return acc; }, []))];
    const collegeNames = new Map<string, string>();
    if (collegeIds.length > 0) {
      const { data: colleges } = await admin.from('colleges').select('id, name').in('id', collegeIds);
      for (const college of colleges ?? []) {
        collegeNames.set(college.id, college.name);
      }
    }

    const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const items = (students ?? []).map((student) => {
      const profile = profileByUserId.get(student.user_id as string);
      const collegeId = student.college_id as string | null;
      return {
        id: student.id as string,
        label: (profile?.full_name as string) || (profile?.email as string) || 'Student',
        sublabel: [
          profile?.email as string,
          collegeId ? collegeNames.get(collegeId) : null,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    });

    return { ok: true as const, items };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search students';
    return { ok: false as const, error: message };
  }
}

export async function searchMentorshipProductsAction(query: string, limit = 30) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  try {
    const admin = createAdminClient();
    const trimmed = query.trim();

    const items: Array<{
      id: string;
      label: string;
      sublabel: string;
      targetType: MentorshipAudienceTargetInput['targetType'];
    }> = [];

    const { data: bootcamp } = await admin
      .from('bootcamps')
      .select('id, title, slug')
      .eq('slug', 'job-ready-bootcamp')
      .maybeSingle();

    if (
      bootcamp
      && (
        !trimmed
        || (bootcamp.title as string).toLowerCase().includes(trimmed.toLowerCase())
        || (bootcamp.slug as string).toLowerCase().includes(trimmed.toLowerCase())
        || 'job ready bootcamp'.includes(trimmed.toLowerCase())
      )
    ) {
      items.push({
        id: bootcamp.id as string,
        label: 'Job Ready Bootcamp',
        sublabel: 'All enrolled bootcamp students shortcut',
        targetType: 'all_bootcamp_enrolled',
      });
    }

    let courseQuery = admin
      .from('master_courses')
      .select('id, title, code, catalog_type, show_as_paid_course, publish_status')
      .eq('publish_status', 'published')
      .order('title', { ascending: true })
      .limit(limit);

    if (trimmed) {
      courseQuery = courseQuery.or(`title.ilike.%${trimmed}%,code.ilike.%${trimmed}%`);
    }

    const { data: courses } = await courseQuery;
    for (const course of courses ?? []) {
      const isPaidBuilder =
        course.catalog_type === 'bootcamp' || course.show_as_paid_course;
      items.push({
        id: course.id as string,
        label: course.title as string,
        sublabel: isPaidBuilder ? `Paid Course · ${course.code}` : `Master Course · ${course.code}`,
        targetType: isPaidBuilder ? 'paid_course' : 'master_course',
      });
    }

    let variantQuery = admin
      .from('course_variants')
      .select('id, title, code, publish_status, show_as_paid_course')
      .eq('publish_status', 'published')
      .eq('show_as_paid_course', true)
      .order('title', { ascending: true })
      .limit(limit);

    if (trimmed) {
      variantQuery = variantQuery.or(`title.ilike.%${trimmed}%,code.ilike.%${trimmed}%`);
    }

    const { data: variants } = await variantQuery;
    for (const variant of variants ?? []) {
      items.push({
        id: variant.id as string,
        label: variant.title as string,
        sublabel: `Course Variant · ${variant.code}`,
        targetType: 'course',
      });
    }

    let bundleQuery = admin
      .from('course_bundles')
      .select('id, title, code, publish_status')
      .eq('publish_status', 'published')
      .order('title', { ascending: true })
      .limit(limit);

    if (trimmed) {
      bundleQuery = bundleQuery.or(`title.ilike.%${trimmed}%,code.ilike.%${trimmed}%`);
    }

    const { data: bundles } = await bundleQuery;
    for (const bundle of bundles ?? []) {
      items.push({
        id: bundle.id as string,
        label: bundle.title as string,
        sublabel: `Bundle · ${bundle.code}`,
        targetType: 'bundle',
      });
    }

    return { ok: true as const, items: items.slice(0, limit) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search products';
    return { ok: false as const, error: message };
  }
}

export async function loadMentorshipSessionAudienceAction(sessionId: string) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  try {
    const targets = await listMentorshipAudienceTargets(sessionId);
    const chips = await resolveAudienceTargetLabels(targets);
    const recipientCount = await countMentorshipRecipients(sessionId);
    const emailsLocked = await mentorshipSessionHasQueuedOrSentEmails(sessionId);
    return {
      ok: true as const,
      targets,
      chips,
      recipientCount,
      emailsLocked,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load audience';
    return { ok: false as const, error: message };
  }
}
