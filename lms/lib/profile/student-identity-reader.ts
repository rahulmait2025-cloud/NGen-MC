import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type StudentIdentity = {
  userId: string;
  studentId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  resumeUrl: string | null;
};

type IdentityLookupResult = {
  identity: StudentIdentity;
} | null;

export async function readIdentityByUsername(
  username: string,
): Promise<IdentityLookupResult> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, username, username_set')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();

  if (profileError) {
    console.error('[identity] Profile query error:', profileError.code);
    throw new Error('Database query failed during identity lookup.');
  }

  if (!profile || !profile.username) {
    return null;
  }

  const { data: students, error: studentError } = await admin
    .from('students')
    .select('id, bio, resume_url')
    .eq('user_id', profile.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (studentError) {
    console.error('[identity] Student query error:', studentError.code);
    throw new Error('Database query failed during student lookup.');
  }

  const student = students?.[0] ?? null;
  if (!student) {
    return null;
  }

  const displayName =
    profile.full_name?.trim()
    || `@${profile.username}`;

  return {
    identity: {
      userId: profile.id,
      studentId: student.id,
      username: profile.username,
      displayName,
      avatarUrl: profile.avatar_url || null,
      bio: student.bio || null,
      resumeUrl: student.resume_url || null,
    },
  };
}

export async function readIdentityByUserId(
  userId: string,
): Promise<IdentityLookupResult> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, username, username_set')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[identity] Profile query error:', profileError.code);
    throw new Error('Database query failed during identity lookup.');
  }

  if (!profile) {
    return null;
  }

  const { data: students, error: studentError } = await admin
    .from('students')
    .select('id, bio, resume_url')
    .eq('user_id', profile.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (studentError) {
    console.error('[identity] Student query error:', studentError.code);
    throw new Error('Database query failed during student lookup.');
  }

  const student = students?.[0] ?? null;
  if (!student) {
    return null;
  }

  const displayName =
    profile.full_name?.trim()
    || (profile.username ? `@${profile.username}` : 'Student');

  return {
    identity: {
      userId: profile.id,
      studentId: student.id,
      username: profile.username || '',
      displayName,
      avatarUrl: profile.avatar_url || null,
      bio: student.bio || null,
      resumeUrl: student.resume_url || null,
    },
  };
}
