# College Leads Operational Runbook

This document provides debugging steps, verifying states, and operational overviews for the College Leads pipeline on the landing website.

---

## Normal Flow Summary

1. **User Submission**: User submits contact form on `/contact`.
2. **System Validation**: Rate-limiting and schema assertions happen natively in `/api/college-leads/route.ts`.
3. **Database Assertion**: Data executes a `supabase.from('college_leads').insert()` mapping heavily sanitized values.
4. **Side Effects**: If insertion succeeds, three detached Side Effects fire concurrently (`Promise.allSettled`):
    - `appendLeadToSheet`: Synchronizes to the designated Google Sheet securely using a Service Account.
    - `sendCollegeLeadConfirmationEmail`: Submits a Welcome confirmation to the user using SendGrid.
    - `sendCollegeLeadAdminNotificationEmail`: Submits an internal notification map natively to `Anuj@nextgen-cto.in` or the current `.env` override.

---

## Required Environment Variables

For the pipeline to fully execute, you must securely declare the following keys inside Vercel `.env`:

### Supabase (Critical - Blocks Route)
* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### SendGrid (Best-effort - Side effect)
* `SENDGRID_API_KEY=SG.xxxx`
* `SENDGRID_FROM_EMAIL=no-reply@nextgen-cto.in`
* `ADMIN_LEADS_EMAIL=Anuj@nextgen-cto.in` *(optional override)*

### Google Sheets (Best-effort - Side effect)
* `GOOGLE_SHEETS_SPREADSHEET_ID=1xBx...`
* `GOOGLE_SHEETS_SHEET_NAME=Sheet1`
* `GOOGLE_SHEETS_CLIENT_EMAIL=service-x@...iam.gserviceaccount.com`
* `GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nM...=\n-----END PRIVATE KEY-----\n"`

---

## Common Failure Cases

### 1. `[college-leads] Insert error: Duplicate submission`
**Symptom:** Logs throw 429 duplicate warnings.
**Fix:** Working precisely as intended. Supabase is blocking rapid redundant identical IP submission. No action required.

### 2. `Rate limit exceeded {"event":"rate_limit_rejected"}`
**Symptom:** Over 5 submissions hit the server in 60000ms.
**Fix:** Internal IP rate throttling. Wait 1 min.

### 3. `"status":"rejected","error":"Forbidden"` (SendGrid)
**Symptom:** Confirmations or Admin emails are bouncing in the orchestrator log.
**Fix:** Double check that `SENDGRID_FROM_EMAIL` exists securely in SendGrid's *Sender Authentication* as verified with proper DKIM.

### 4. `Error: missing GOOGLE_SHEETS_PRIVATE_KEY` / `SyntaxError in JSON`
**Symptom:** Google Sheets side-effect array responds with missing token parameters.
**Fix:** Make sure the multi-line `\n` characters embedded in string-quotes inside Vercel format properly.

---

## Log Debugging (How to read Vercel Logs)

Logs are strictly normalized in structured JSON.

We heavily mask sensitive PII (`password`, `token`, `key`) inside the global context and only stringify essential context metrics (`work_email`: `j***e@domain.com`, `college_name`, `utm_source`). Search Vercel Logs for `"service": "college-leads"` to trace paths cleanly.

**Success Signature:**
```json
// Event 1
{"message":"Lead submission received","context":{"event":"lead_submission_received","work_email":"j***e@domain.com","college_name":"Stanford"}}
// Event 2
{"message":"Lead successfully inserted to Supabase","context":{"event":"lead_inserted_successfully"}}
// Event 3
{"message":"Post-create side effects completed","context":{"event":"side_effects_completed"},"meta":{"results":[{"action":"Google Sheets Sync","status":"fulfilled"}...]}
```

**Non-blocking failures by design:**
Any side-effect failure (Sheet, Admin email, User email) guarantees the database preserves the payload but securely logs `"status": "rejected"` alongside a detailed reason embedded dynamically in the JSON `{ meta: { results: [...] }}`. The HTTP server **will still return 200 OK**.
