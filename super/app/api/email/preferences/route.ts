import { NextRequest, NextResponse } from 'next/server';
import { getEmailPreferences } from '@/lib/email-center/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const admin = createAdminClient();

  const { data: tokenData, error } = await admin
    .from('email_unsubscribe_tokens')
    .select('email, campaign_id, recipient_id')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !tokenData) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  }

  const prefs = await getEmailPreferences(tokenData.email);

  return NextResponse.json({
    email: tokenData.email,
    marketing: prefs?.marketing ?? false,
    announcements: prefs?.announcements ?? false,
    productUpdates: prefs?.productUpdates ?? false,
    notices: prefs?.notices ?? false,
    operational: prefs?.operational ?? false,
    global: prefs?.global ?? false,
  });
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const body = await request.json();
  const { marketing, announcements, productUpdates, notices, operational, global } = body;

  const tokenHash = hashToken(token);
  const admin = createAdminClient();

  const { data: tokenData, error: tokenError } = await admin
    .from('email_unsubscribe_tokens')
    .select('email, campaign_id, recipient_id')
    .eq('token_hash', tokenHash)
    .single();

  if (tokenError || !tokenData) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  }

  const normalizedEmail = tokenData.email.toLowerCase().trim();

  const existingPref = await admin
    .from('email_preferences')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  const now = new Date().toISOString();

  if (existingPref.data) {
    await admin
      .from('email_preferences')
      .update({
        marketing_opt_out: marketing ?? false,
        announcements_opt_out: announcements ?? false,
        product_updates_opt_out: productUpdates ?? false,
        notices_opt_out: notices ?? false,
        operational_opt_out: operational ?? false,
        global_unsubscribe: global ?? false,
        unsubscribed_at: global ? now : null,
        unsubscribe_reason: global ? 'user_unsubscribe' : null,
        updated_at: now,
      })
      .eq('email', normalizedEmail);
  } else {
    await admin.from('email_preferences').insert({
      email: normalizedEmail,
      marketing_opt_out: marketing ?? false,
      announcements_opt_out: announcements ?? false,
      product_updates_opt_out: productUpdates ?? false,
      notices_opt_out: notices ?? false,
      operational_opt_out: operational ?? false,
      global_unsubscribe: global ?? false,
      unsubscribed_at: global ? now : null,
      unsubscribe_reason: global ? 'user_unsubscribe' : null,
    });
  }

  if (global) {
    await admin.from('email_suppressions').upsert({
      email: normalizedEmail,
      reason: 'unsubscribed',
      source: 'preference_page',
    });
  }

  await admin
    .from('email_unsubscribe_tokens')
    .update({ used_at: now })
    .eq('token_hash', tokenHash);

  return NextResponse.json({ ok: true });
}