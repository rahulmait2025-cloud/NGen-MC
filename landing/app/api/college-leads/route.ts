import { NextResponse } from 'next/server';

import { handlePostCollegeLeadSideEffects } from '@/lib/services/college-lead-side-effects';
import { logger } from '@/lib/services/lead-logger';
import { getCollegeLeadsCount } from '@/lib/services/google-sheets';

export async function GET() {
  try {
    const count = await getCollegeLeadsCount();
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    logger.error('Failed to fetch lead count', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'Failed to fetch lead count' }, { status: 500 });
  }
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  if (!record || now > record.resetTime) {
    ipRequestMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

const VALID_COLLEGE_TYPES = ['bca', 'btech', 'engineering', 'university', 'other'];
const VALID_INTEREST_TYPES = ['demo', 'partnership', 'pilot_program', 'placement_bootcamp', 'custom_lms'];

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 1000);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      logger.warn('Rate limit exceeded', { event: 'rate_limit_rejected' });
      return NextResponse.json(
        { ok: false, error: `Too many requests. Please try again in ${rateCheck.retryAfter} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    const body = await request.json();

    const fullName = sanitizeString(body.full_name);
    const workEmail = sanitizeString(body.work_email).toLowerCase();
    const phoneNumber = sanitizeString(body.phone_number);
    const collegeName = sanitizeString(body.college_name);
    const designation = sanitizeString(body.designation);
    const city = sanitizeString(body.city);
    const state = sanitizeString(body.state);
    const collegeType = sanitizeString(body.college_type);
    const studentCount = sanitizeString(body.student_count);
    const websiteUrl = sanitizeString(body.website_url);
    const interestType = sanitizeString(body.interest_type);
    const message = sanitizeString(body.message);
    const consentGiven = body.consent_given === true;
    const sourcePage = sanitizeString(body.source_page);
    const utmSource = sanitizeString(body.utm_source);
    const utmMedium = sanitizeString(body.utm_medium);
    const utmCampaign = sanitizeString(body.utm_campaign);
    const utmTerm = sanitizeString(body.utm_term);
    const utmContent = sanitizeString(body.utm_content);
    const honeypot = sanitizeString(body.website);

    if (honeypot) {
      return NextResponse.json({ ok: true, message: 'Thank you! We will contact you soon.' });
    }

    const errors: string[] = [];

    if (!fullName || fullName.length < 2) {
      errors.push('Full name is required (minimum 2 characters).');
    }

    if (!workEmail || !validateEmail(workEmail)) {
      errors.push('Valid work email is required.');
    }

    if (!phoneNumber || !validatePhone(phoneNumber)) {
      errors.push('Valid phone number is required.');
    }

    if (!collegeName || collegeName.length < 2) {
      errors.push('College name is required.');
    }

    if (!consentGiven) {
      errors.push('You must agree to be contacted.');
    }

    if (collegeType && !VALID_COLLEGE_TYPES.includes(collegeType)) {
      errors.push('Invalid college type selected.');
    }

    if (interestType && !VALID_INTEREST_TYPES.includes(interestType)) {
      errors.push('Invalid interest type selected.');
    }

    const logContext = {
      work_email: workEmail,
      college_name: collegeName,
      source_page: sourcePage,
      utm_source: utmSource,
    };

    logger.info('Lead submission received', { ...logContext, event: 'lead_submission_received' });

    if (errors.length > 0) {
      logger.warn('Lead validation rejected', { 
        ...logContext, 
        event: 'lead_validation_rejected',
        error: errors.join(' | ') 
      });
      return NextResponse.json(
        { ok: false, error: errors.join(' ') },
        { status: 400 }
      );
    }

    const leadData = {
      full_name: fullName,
      work_email: workEmail,
      phone_number: phoneNumber,
      college_name: collegeName,
      designation: designation || null,
      city: city || null,
      state: state || null,
      college_type: collegeType || null,
      student_count: studentCount || null,
      website_url: websiteUrl || null,
      interest_type: interestType || null,
      message: message || null,
      consent_given: consentGiven,
      source_page: sourcePage || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      utm_term: utmTerm || null,
      utm_content: utmContent || null,
    };

    logger.info('Lead submission validated - processing via side-effects only', { ...logContext, event: 'lead_processing_started' });


    // Side effects (Best effort execution via orchestrator)
    logger.info('Post-create side effects started', { ...logContext, event: 'side_effects_started' });
    
    const sideEffectResults = await handlePostCollegeLeadSideEffects({
      ...leadData,
      designation: designation || undefined,
      city: city || undefined,
      state: state || undefined,
      college_type: collegeType || undefined,
      student_count: studentCount || undefined,
      website_url: websiteUrl || undefined,
      interest_type: interestType || undefined,
      message: message || undefined,
      source_page: sourcePage || undefined,
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
      utm_term: utmTerm || undefined,
      utm_content: utmContent || undefined,
    });

    logger.info('Post-create side effects completed', { 
      ...logContext, 
      event: 'side_effects_completed',
      meta: { results: sideEffectResults } 
    });

    return NextResponse.json({
      ok: true,
      message: 'Thank you for your interest! Our team will contact you within 24-48 hours.',
    });
  } catch (err) {
    logger.error('Unexpected route-level failure', { 
      event: 'unexpected_route_failure', 
      error: err instanceof Error ? err.message : String(err)
    });
    return NextResponse.json(
      { ok: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}



