# Email Adapter (Landing Website)

## Purpose

This adapter adds a provider-agnostic email layer for the landing website so future email features can call one internal function: `sendEmail(input)`.

Landing lead email services now use this adapter internally.

## Current Architecture

- Landing lead emails (`college_lead_confirmation`, `college_lead_admin_notification`) send through `lib/email/send-email.ts`.
- Provider selection is controlled by `EMAIL_PROVIDER`.
- Supabase Auth invite/password reset emails are still controlled by Supabase SMTP and are not migrated here.

## Environment Variables

- `EMAIL_PROVIDER` - `sendgrid` or `resend` (defaults to `sendgrid`)
- `EMAIL_FROM` - primary sender address
- `EMAIL_REPLY_TO` - optional default reply-to address
- `SENDGRID_API_KEY` - required when `EMAIL_PROVIDER=sendgrid`
- `RESEND_API_KEY` - required when `EMAIL_PROVIDER=resend`
- `SENDGRID_FROM_EMAIL` - fallback sender when `EMAIL_FROM` is not set

## Switch Provider

Use one of these values:

```bash
EMAIL_PROVIDER=resend
```

```bash
EMAIL_PROVIDER=sendgrid
```

## Provider Switch Checklist

For Resend:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=...
```

- DNS verified in Resend.
- Submit a test lead.
- Run `npm run email:test -- --to someone@example.com`.

For SendGrid:

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=...
EMAIL_FROM=...
# or fallback:
SENDGRID_FROM_EMAIL=...
```

- Sender/domain authentication verified in SendGrid.
- Submit a test lead.
- Run `npm run email:test -- --to someone@example.com`.

## Rollback

If any issue appears after switching provider, set:

```bash
EMAIL_PROVIDER=sendgrid
```

Then redeploy and test the lead form.

## Dry Run

Set:

```bash
EMAIL_DRY_RUN=true
```

In dry-run mode, adapter calls do not send real emails and return `messageId=dry_run`.

## Current Phase Status

Phase 3 complete for landing leads: `sendCollegeLeadConfirmationEmail` and `sendCollegeLeadAdminNotificationEmail` now send through the adapter.

Phase 6B complete for landing template extraction: existing landing lead template builders now live in `lib/email/templates`.

- `buildCollegeLeadConfirmationEmail`
- `buildCollegeLeadAdminNotificationEmail`

Phase 8 complete:

- Production provider switch runbook added: `EMAIL_PROVIDER_PRODUCTION_SWITCH_RUNBOOK.md`.
- Monitoring checklist added: `EMAIL_MONITORING_CHECKLIST.md`.
- Diagnostics dry-run readiness behavior fixed: in `EMAIL_DRY_RUN=true`, missing provider API keys do not mark diagnostics as not ready.
- Resend staging checklist remains: `RESEND_STAGING_TEST_CHECKLIST.md`.

## Phase 6B Notes

- LMS repos do not currently contain production templates. No LMS templates were created in this phase.
- Supabase student invite template remains controlled by Supabase Auth and is not affected.
- Future LMS templates should be added only after final email copy/design is approved.

## Supabase Boundary Reminder

- Resend/sendgrid provider switching in this repo affects landing app-owned lead emails only.
- It does not affect Supabase Auth student invite templates.
- LMS invite/reset flows remain Supabase SMTP controlled.

## Phase 8 Operational References

- `RESEND_STAGING_TEST_CHECKLIST.md`
- `EMAIL_PROVIDER_PRODUCTION_SWITCH_RUNBOOK.md`
- `EMAIL_MONITORING_CHECKLIST.md`

## Manual Test Notes (Safe)

1. Submit the college lead form in local or staging.
2. Confirm submitter confirmation email is attempted.
3. Confirm admin notification email is attempted.
4. Set `EMAIL_PROVIDER=resend` and repeat.
5. Roll back by setting `EMAIL_PROVIDER=sendgrid`.

## Compatibility Notes

- Unsubscribe headers continue to be passed through the adapter.
- Inline CID logo attachment is preserved for SendGrid.
- For Resend, attachment parity for this inline CID rendering is not guaranteed and may appear as a visual fallback depending on provider/client behavior.
- No public email test route exists by design; testing is via CLI and lead submission flow.

## Provider SDK Import Boundary

Direct provider SDK imports should only exist in:

- `lib/email/providers/sendgrid.ts`
- `lib/email/providers/resend.ts`
