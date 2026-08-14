/**
 * Pre-queue / pre-provider validation for Email Center HTML.
 * Does not log recipient PII or full HTML bodies.
 */

export type EmailHtmlValidationIssue = {
  code: string;
  message: string;
  /** Asset hostname when relevant (safe to log). */
  hostname?: string;
};

export type EmailHtmlValidationResult = {
  ok: boolean;
  issues: EmailHtmlValidationIssue[];
  firstNameResolved: boolean;
};

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function collectImgSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    out.push(match[1] ?? '');
  }
  return out;
}

function collectAnchorHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    out.push(match[1] ?? '');
  }
  return out;
}

/**
 * Validate final generated HTML before queue / provider send.
 * Safe diagnostics only — no recipient email content logged by this function.
 */
export function validateFinalEmailHtml(
  html: string,
  options?: { requireSocialDestinations?: boolean },
): EmailHtmlValidationResult {
  const issues: EmailHtmlValidationIssue[] = [];
  const requireSocial = options?.requireSocialDestinations !== false;

  if (html.includes('{{first_name}}')) {
    issues.push({
      code: 'unresolved_first_name',
      message: 'Literal {{first_name}} remains in final HTML',
    });
  }

  if (/process\.env\.|EMAIL_[A-Z0-9_]+(?![a-z])/i.test(html) && /\$\{|process\.env/.test(html)) {
    issues.push({
      code: 'unresolved_env',
      message: 'Unresolved environment-variable expression in HTML',
    });
  }

  for (const src of collectImgSrcs(html)) {
    const trimmed = src.trim();
    const host = hostnameOf(trimmed);

    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
      issues.push({
        code: 'empty_image_src',
        message: 'Empty or nullish image src',
        hostname: host,
      });
      continue;
    }

    if (trimmed.includes('undefined') || trimmed.includes('null')) {
      issues.push({
        code: 'nullish_image_src',
        message: 'Image src contains undefined/null',
        hostname: host,
      });
    }

    if (/^(\.|\/)/.test(trimmed) || !/^https?:\/\//i.test(trimmed)) {
      issues.push({
        code: 'relative_image_src',
        message: 'Relative or non-absolute image URL',
        hostname: host,
      });
      continue;
    }

    if (!/^https:\/\//i.test(trimmed)) {
      issues.push({
        code: 'non_https_image',
        message: 'Non-HTTPS image URL',
        hostname: host,
      });
    }

    if (/localhost|127\.0\.0\.1/i.test(trimmed)) {
      issues.push({
        code: 'localhost_image',
        message: 'Localhost image URL',
        hostname: host,
      });
    }

    if (/\/storage\/v1\/object\/sign\//i.test(trimmed) || /[?&]token=/i.test(trimmed)) {
      issues.push({
        code: 'signed_supabase_url',
        message: 'Signed / expiring Supabase URL',
        hostname: host,
      });
    }

    if (/supabase\.com\/dashboard/i.test(trimmed)) {
      issues.push({
        code: 'supabase_dashboard_url',
        message: 'Supabase dashboard URL used as image src',
        hostname: host,
      });
    }
  }

  if (requireSocial) {
    const hrefs = collectAnchorHrefs(html).join(' ');
    if (!/instagram\.com/i.test(hrefs)) {
      issues.push({
        code: 'missing_instagram_link',
        message: 'Missing Instagram destination link',
      });
    }
    if (!/linkedin\.com/i.test(hrefs)) {
      issues.push({
        code: 'missing_linkedin_link',
        message: 'Missing LinkedIn destination link',
      });
    }
    if (!/youtube\.com/i.test(hrefs)) {
      issues.push({
        code: 'missing_youtube_link',
        message: 'Missing YouTube destination link',
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    firstNameResolved: !html.includes('{{first_name}}'),
  };
}

/** Compact safe summary for logs (no PII / no full HTML). */
export function summarizeEmailHtmlValidation(
  result: EmailHtmlValidationResult,
  meta?: { campaignId?: string; templateId?: string },
): Record<string, unknown> {
  return {
    ok: result.ok,
    firstNameResolved: result.firstNameResolved,
    issueCodes: result.issues.map((i) => i.code),
    hostnames: [...new Set(result.issues.map((i) => i.hostname).filter(Boolean))],
    campaignId: meta?.campaignId,
    templateId: meta?.templateId,
  };
}
