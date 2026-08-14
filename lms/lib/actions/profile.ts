'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import { revalidatePath, revalidateTag } from 'next/cache';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';
import { studentUsernameSchema } from '@/lib/profile/student-username';
import { invalidateProfileForUser, invalidateProfile } from '@/lib/profile/public-profile-cache';

import { isDirectLearnerCollegeSlug } from '@/lib/tenant/direct-learner-slug';
import { updateNonPartneredStudentCollege } from '@/lib/actions/update-non-partnered-student-college';

function isGoogleDriveUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === 'drive.google.com' || host === 'docs.google.com';
  } catch {
    return false;
  }
}

const urlFieldSchema = z
  .union([z.literal(''), z.string().trim().url('Invalid URL.')])
  .transform((value) => (value ? value : null));

const resumeUrlSchema = z
  .union([z.literal(''), z.string().trim().url('Enter a valid Google Drive link.')])
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || isGoogleDriveUrl(value), {
    message: 'Resume must be a Google Drive share link (drive.google.com).',
  });

const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(20, 'Full name must be 20 characters or fewer.')
    .optional()
    .transform((value) => value || null),
  github_url: urlFieldSchema.optional(),
  linkedin_url: urlFieldSchema.optional(),
  resume_url: resumeUrlSchema.optional(),
  year_or_semester: z
    .string()
    .trim()
    .max(6, 'Year or semester must be 6 characters or fewer.')
    .optional()
    .transform((value) => value || null),
  student_code: z
    .string()
    .trim()
    .max(50, 'Student code is too long.')
    .optional()
    .transform((value) => value || null),
  self_reported_college_name: z
    .string()
    .trim()
    .max(200, 'College name is too long.')
    .optional()
    .transform((value) => value || null),
  collegeSlug: z.string().trim().max(120).optional(),
});

const collegeIdSchema = z.object({
  collegeId: z.uuid('Invalid college id.'),
});

function normalizeGithubInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const fromUrl = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)\/?$/i);
  if (fromUrl) return `https://github.com/${fromUrl[1]}`;
  const username = trimmed.replace(/^@/, '');
  if (/^[A-Za-z0-9_-]+$/.test(username)) return `https://github.com/${username}`;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function normalizeLinkedinInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function normalizeResumeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function dbSetupHint(errorMessage: string): string | null {
  if (/column .* does not exist/i.test(errorMessage)) {
    return 'Profile database columns are missing. Run scripts/add-student-profile-fields.sql in Supabase.';
  }
  return null;
}

async function assertStudentMembership(
  userId: string,
  collegeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: membership, error } = await admin
    .from('college_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('college_id', collegeId)
    .in('role', ['student'])
    .in('status', ['active', 'invited'])
    .maybeSingle();

  if (error) {
    console.error('[profile] membership check error:', error.code);
    return { ok: false, error: 'Could not verify your account.' };
  }
  if (!membership) {
    return { ok: false, error: 'Access denied: not a member of this college' };
  }
  return { ok: true };
}

export async function updateStudentProfile(
  collegeId: string,
  data: {
    full_name?: string;
    github_url?: string;
    linkedin_url?: string;
    resume_url?: string;
    year_or_semester?: string;
    student_code?: string;
    self_reported_college_name?: string;
    collegeSlug?: string;
  },
) {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return { error: 'Not authenticated' };
  }
  const userId = identity.userId;

  const limited = await consumeRateLimit({
    key: `student-profile-update:${userId}`,
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.ok) {
    return { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
  }

  const collegeParsed = collegeIdSchema.safeParse({ collegeId });
  if (!collegeParsed.success) {
    return { error: collegeParsed.error.issues[0]?.message ?? 'Invalid college id.' };
  }

  const normalizedInput = {
    ...data,
    github_url:
      data.github_url !== undefined ? normalizeGithubInput(data.github_url) : undefined,
    linkedin_url:
      data.linkedin_url !== undefined ? normalizeLinkedinInput(data.linkedin_url) : undefined,
    resume_url:
      data.resume_url !== undefined ? normalizeResumeInput(data.resume_url) : undefined,
  };

  const parsed = profileUpdateSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const membership = await assertStudentMembership(userId, collegeParsed.data.collegeId);
  if (!membership.ok) {
    return { error: membership.error };
  }

  if (parsed.data.full_name !== undefined && parsed.data.full_name !== null) {
    const newName = parsed.data.full_name.trim();
    if (newName.length >= 2 && newName.length <= 20) {
      const admin = createAdminClient();
      await admin.from('profiles').update({ full_name: newName, updated_at: new Date().toISOString() }).eq('id', userId);
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      if (userData?.user) {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            full_name: newName,
          },
        });
      }
    }
  }

  if (
    parsed.data.self_reported_college_name !== undefined &&
    parsed.data.self_reported_college_name !== null &&
    parsed.data.self_reported_college_name.trim().length > 0 &&
    parsed.data.collegeSlug &&
    isDirectLearnerCollegeSlug(parsed.data.collegeSlug)
  ) {
    const nameToSave = parsed.data.self_reported_college_name.trim();
    const res = await updateNonPartneredStudentCollege(parsed.data.collegeSlug, nameToSave);
    if (res.error) {
      return { error: res.error };
    }
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.github_url !== undefined) updatePayload.github_url = parsed.data.github_url;
  if (parsed.data.linkedin_url !== undefined) updatePayload.linkedin_url = parsed.data.linkedin_url;
  if (parsed.data.resume_url !== undefined) updatePayload.resume_url = parsed.data.resume_url;
  if (parsed.data.year_or_semester !== undefined) {
    updatePayload.year_or_semester = parsed.data.year_or_semester;
  }
  if (parsed.data.student_code !== undefined) updatePayload.student_code = parsed.data.student_code;

  const fieldKeys = Object.keys(updatePayload).filter((k) => k !== 'updated_at');
  if (fieldKeys.length === 0) {
    return { success: true };
  }

  const admin = createAdminClient();
  let { data: updated, error } = await admin
    .from('students')
    .update(updatePayload)
    .eq('user_id', userId)
    .eq('college_id', collegeParsed.data.collegeId)
    .select('id')
    .maybeSingle();

  if (!updated && !error) {
    // If exact college_id match found 0 rows, try updating by user_id directly
    const retry = await admin
      .from('students')
      .update(updatePayload)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    updated = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('[profile] updateStudentProfile error:', error.code, error.message);
    return { error: dbSetupHint(error.message) ?? 'Failed to update profile' };
  }
  if (!updated) {
    return { error: 'Student record not found.' };
  }

  if (parsed.data.collegeSlug) {
    revalidatePath(`/c/${parsed.data.collegeSlug}/student/profile`, 'page');
  } else {
    revalidatePath('/c/[collegeSlug]/student/profile', 'page');
  }
  revalidateTag(`student-profile-${userId}`, 'max');

  await invalidateProfileForUser(userId);

  return { success: true };
}

const ALLOWED_AVATAR_TYPES: ReadonlySet<string> = Object.freeze(new Set(['image/jpeg', 'image/png', 'image/webp']));
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function uploadStudentAvatar(collegeId: string, formData: FormData) {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return { error: 'Not authenticated' };
  }
  const userId = identity.userId;

  const limited = await consumeRateLimit({
    key: `student-avatar-upload:${userId}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) {
    return { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
  }

  const collegeParsed = collegeIdSchema.safeParse({ collegeId });
  if (!collegeParsed.success) {
    return { error: collegeParsed.error.issues[0]?.message ?? 'Invalid college id.' };
  }

  const file = formData.get('avatar');
  if (!(file instanceof File)) {
    return { error: 'No image provided' };
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return { error: 'Photo must be up to 2 MB.' };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: 'Photo must be JPEG, PNG, or WebP.' };
  }

  const membership = await assertStudentMembership(userId, collegeParsed.data.collegeId);
  if (!membership.ok) {
    return { error: membership.error };
  }

  const admin = createAdminClient();
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${collegeParsed.data.collegeId}/${userId}/avatar.${ext}`;

  const uploadOpts = { upsert: true, contentType: file.type };
  let uploadError = (await admin.storage.from('avatars').upload(filePath, file, uploadOpts)).error;
  let bucket = 'avatars';

  if (uploadError) {
    uploadError = (
      await admin.storage.from('resumes').upload(`avatars/${filePath}`, file, uploadOpts)
    ).error;
    bucket = 'resumes';
  }

  if (uploadError) {
    console.error('[profile] uploadStudentAvatar upload error:', uploadError.message);
    return { error: 'Failed to upload photo. Run scripts/add-profile-avatar-url.sql in Supabase.' };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(bucket).getPublicUrl(bucket === 'resumes' ? `avatars/${filePath}` : filePath);

  const [{ error: profileError }, { data: college }] = await Promise.all([
    admin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId),
    admin
      .from('colleges')
      .select('slug')
      .eq('id', collegeParsed.data.collegeId)
      .maybeSingle(),
  ]);

  if (profileError) {
    console.error('[profile] uploadStudentAvatar profile update:', profileError.code, profileError.message);
    return {
      error:
        dbSetupHint(profileError.message) ??
        'Photo uploaded but could not save to profile. Run scripts/add-profile-avatar-url.sql.',
    };
  }

  if (college?.slug) {
    revalidatePath(`/c/${college.slug}/student/profile`, 'page');
  }

  revalidateTag(`student-profile-${userId}`, 'max');

  await invalidateProfileForUser(userId);

  return { success: true, url: publicUrl };
}

const bioSchema = z
  .string()
  .trim()
  .max(200, 'Bio must be 200 characters or fewer.');

export async function updateStudentBio(
  collegeId: string,
  bio: string,
  collegeSlug?: string,
) {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return { error: 'Not authenticated' };
  }
  const userId = identity.userId;

  const limited = await consumeRateLimit({
    key: `student-profile-update:${userId}`,
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.ok) {
    return { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
  }

  const collegeParsed = collegeIdSchema.safeParse({ collegeId });
  if (!collegeParsed.success) {
    return { error: collegeParsed.error.issues[0]?.message ?? 'Invalid college id.' };
  }

  const parsedBio = bioSchema.safeParse(bio);
  if (!parsedBio.success) {
    return { error: parsedBio.error.issues[0]?.message ?? 'Invalid bio.' };
  }

  const bioValue = parsedBio.data || null;

  const membership = await assertStudentMembership(userId, collegeParsed.data.collegeId);
  if (!membership.ok) {
    return { error: membership.error };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('students')
    .update({
      bio: bioValue,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('college_id', collegeParsed.data.collegeId)
    .select('id');

  if (error) {
    console.error('[profile] updateStudentBio error:', error.code, error.message);
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('bio')) {
      return { error: 'Bio feature not enabled. Run the migration first.' };
    }
    return { error: 'Failed to update bio' };
  }

  if (!data || data.length === 0) {
    return { error: 'Student record not found' };
  }

  if (collegeSlug) {
    revalidatePath(`/c/${collegeSlug}/student/profile`, 'page');
  } else {
    revalidatePath('/c/[collegeSlug]/student/profile', 'page');
  }

  revalidateTag(`student-profile-${userId}`, 'max');

  await invalidateProfileForUser(userId);

  return { success: true };
}

export async function setStudentUsername(
  username: string,
  collegeSlug: string,
): Promise<
  | { success: true; username: string }
  | { success?: false; error: string }
> {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return { error: 'Unauthenticated request.' };
  }
  const userId = identity.userId;

  const limited = await consumeRateLimit({
    key: `student-username-set:${userId}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.ok) {
    return { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
  }

  const parsed = studentUsernameSchema.safeParse(username);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid username format.' };
  }
  const validUsername = parsed.data;

  const admin = createAdminClient();

  // 1. Check if user already has a saved username or confirmed username_set
  const { data: existingProfile, error: profileFetchErr } = await admin
    .from('profiles')
    .select('username, username_set')
    .eq('id', userId)
    .maybeSingle();

  if (profileFetchErr) {
    console.error('[profile] setStudentUsername profile read error:', profileFetchErr.code);
    return { error: 'Failed to read profile. Please try again.' };
  }

  if (existingProfile && (existingProfile.username_set === true || (existingProfile.username && existingProfile.username.trim().length > 0))) {
    return { error: 'Username has already been set and cannot be changed.' };
  }

  // 2. Atomic conditional update: only update if username_set is not true (false or null)
  const { data, error } = await admin
    .from('profiles')
    .update({
      username: validUsername,
      username_set: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .or('username_set.eq.false,username_set.is.null')
    .select('username')
    .maybeSingle();

  if (error) {
    console.error('[profile] setStudentUsername update error:', error.code, error.message);
    if (
      error.code === '23505' ||
      error.message?.includes('profiles_username_key') ||
      error.message?.includes('unique')
    ) {
      return { error: 'Username is already taken.' };
    }
    return { error: 'Failed to update username. Please try again.' };
  }

  if (!data) {
    // If update returned 0 rows, check if username was set concurrently by another request
    const { data: recheckProfile } = await admin
      .from('profiles')
      .select('username, username_set')
      .eq('id', userId)
      .maybeSingle();

    if (recheckProfile && (recheckProfile.username_set || recheckProfile.username)) {
      return { error: 'Username has already been set and cannot be changed.' };
    }
    return { error: 'Failed to update username. Please try again.' };
  }

  if (collegeSlug) {
    revalidatePath(`/c/${collegeSlug}/student/profile`, 'page');
  } else {
    revalidatePath('/c/[collegeSlug]/student/profile', 'page');
  }
  revalidateTag(`student-profile-${userId}`, 'max');

  invalidateProfile(data.username.trim().toLowerCase());

  return { success: true, username: validUsername };
}

