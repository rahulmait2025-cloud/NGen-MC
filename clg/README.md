# CollegeAdmin Portal

Institution-level administration console scoped to a single college tenant. Manages students, faculty, assigned content, placements, assessments, video analytics, and activity tracking.

## Quick Start

```bash
npm install
npm run dev
# Opens on http://localhost:3001
```

### Other Scripts

```bash
npm run dev:3001    # Dev server on port 3001
npm run lint        # ESLint
npm run build       # Production build
npm run start       # Start production server
npm run typecheck   # TypeScript check
npm run email:test  # Test email adapter
```

## Environment Variables

Create a `.env` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_LMS_APP_URL=<your-lms-url>   # e.g., http://localhost:3002
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + RLS)
- **Video CDN**: TPStreams
- **UI**: shadcn/ui + Tailwind CSS
- **Animations**: GSAP, Tailwind animate
- **Security**: Rate limiting via Supabase RPC, audit logging

### Tenant Scoping

All routes are scoped under `/c/[collegeSlug]/admin/*`. The `requireCollegeAdmin` guard:
1. Resolves the tenant from the URL slug
2. Validates the authenticated user is a member of that college
3. Returns `{ tenant, user }` context

### Key Principles

- All mutations require SuperAdmin or CollegeAdmin auth
- No create/edit/delete on content — read-only view of SuperAdmin-provisioned content
- Student invite emails sent via Supabase Auth SMTP (SendGrid)
- Tenant guards on all `/c/[collegeSlug]/admin/*` pages
- Content is rendered through the same landing page design as the student LMS
- Content and pillar resolution supports both UUID and slug URLs with canonical redirects
- Fast-path authentication via proxy headers (`x-user-id`, `x-user-email`)
- Rate limiting on all public API endpoints via Supabase RPC
- Security audit logging on all auth events and mutations

## Folder Structure

```
app/
├── c/[collegeSlug]/
│   ├── admin/
│   │   ├── (authenticated)/    # Protected admin routes
│   │   │   ├── activity/       # Activity feed, video analytics, performance
│   │   │   ├── ai-modern-development/  # Pillar content (read-only)
│   │   │   ├── analytics/      # Analytics (redirects to activity/performance)
│   │   │   ├── assessments/    # Assessments
│   │   │   ├── behavioral-skills/       # Pillar content (read-only)
│   │   │   ├── content/        # Assigned courses (read-only)
│   │   │   │   └── [id]/       # Course/bundle/variant detail with slug support
│   │   │   ├── dashboard/      # Institution dashboard
│   │   │   ├── github-monitoring/       # Pillar content (read-only)
│   │   │   ├── linkedin-monitoring/     # Pillar content (read-only)
│   │   │   ├── placements/     # Placement tracking
│   │   │   ├── pillars/        # Pillar catalog with slug routing
│   │   │   │   └── [pillarId]/ # Pillar detail page
│   │   │   ├── resume-readiness/         # Pillar content (read-only)
│   │   │   ├── settings/        # Admin settings
│   │   │   ├── students/        # Student management + invite
│   │   │   ├── technical-bootcamp/       # Pillar content (read-only)
│   │   │   └── error.tsx
│   │   ├── forgot-password/
│   │   ├── login/
│   │   └── layout.tsx
│   └── not-found.tsx
├── api/
│   ├── admin/
│   │   ├── auth-events/         # Auth event logging (rate-limited)
│   │   ├── session/
│   │   │   ├── history/         # Admin session history
│   │   │   └── revoke/          # Revoke own admin session
│   │   └── video-analytics/
│   │       └── student-detail/  # Student video analytics drilldown
│   └── my-admin-tenant/         # Auto-tenant redirect slug
├── auth/                      # Auth pages (callback, etc.)
└── login/                     # Login page

components/
├── admin/                     # Admin UI components
│   ├── activity-feed-page.tsx # Activity feed
│   ├── activity-section-nav.tsx # Activity navigation
│   ├── bento-card.tsx         # Bento card components
│   ├── date-picker.tsx        # Date picker
│   ├── dashboard-content-skeleton.tsx # Dashboard loading
│   ├── db-section-page.tsx    # DB-backed section
│   ├── metric-carousel.tsx    # Metric carousel
│   ├── page-transition.tsx    # Page transitions
│   ├── protected-data-provider.tsx # Protected data
│   ├── video-analytics-body.tsx     # Video analytics main
│   ├── video-analytics-charts.tsx   # Video analytics charts
│   ├── video-analytics-content.tsx  # Video analytics content
│   ├── video-analytics-drilldown-provider.tsx # Drilldown
│   ├── video-analytics-leaderboard.tsx # Leaderboard
│   ├── video-analytics-leaderboard-body.tsx
│   ├── video-analytics-leaderboard-content.tsx
│   ├── video-analytics-leaderboard-filters.tsx
│   ├── video-analytics-student-detail-sheet.tsx # Student detail
│   └── video-analytics-student-table.tsx # Student table
├── analytics/                 # Analytics charts
├── auth/                      # Auth components
├── content/                   # Course/bundle detail view (read-only)
├── dashboard/                 # Dashboard widgets
├── shared/                    # Shared components
└── ui/                        # shadcn/ui components

lib/
├── actions/                   # Server actions
├── activity/                  # Activity feed system
│   ├── emit.ts                # Activity event emitter
│   ├── event-types.ts         # Event type definitions
│   ├── format-activity-event.ts # Event formatting
│   └── queries.ts             # Activity queries
├── auth/
│   ├── admin-session.ts       # Session history & self-revoke
│   ├── app-url.ts             # App URL builder
│   ├── college-admin-constants.ts # Constants
│   ├── context.ts             # Full auth context via RPC
│   ├── guards.ts              # Two-tier auth (fast + slow path)
│   ├── logout.ts              # Logout helper
│   ├── redirects.ts           # Standardized redirect reasons
│   ├── require-admin-action.ts # Auth guard for actions/API
│   └── session.ts             # Fast-path session helper
├── college-admin/
│   ├── activity/
│   │   └── activity-section-links.ts # Activity nav config
│   └── analytics/
│       ├── college-scope.ts   # College-scoped ID lookups
│       ├── parse-video-analytics-filters.ts # Filter parsing
│       └── services/
│           ├── content.ts     # Course/lecture completion
│           ├── engagement.ts  # Student engagement metrics
│           └── institution.ts # Institution overview
├── resolvers/                 # Content/pillar resolution (UUID + slug)
│   └── index.ts               # resolveCourseByKey, resolveBundleByKey, etc.
├── security/
│   ├── audit.ts               # Security event logging
│   └── rate-limit.ts          # Rate limiting via Supabase RPC
├── services/
│   ├── assessments.ts         # Assessment queries
│   ├── assigned-courses.ts    # Content assignment queries
│   ├── college-video-analytics.ts # Video analytics engine
│   ├── dashboard.ts           # Dashboard queries
│   ├── evaluations.ts         # Evaluation queries
│   ├── placements.ts          # Placement queries
│   └── students.ts            # Student CRUD
├── supabase/
│   ├── client.ts              # Browser client
│   └── server.ts              # Server client
├── tenant/
│   └── get-tenant.ts          # Case-insensitive slug resolution
└── utils/
    └── slug.ts                # Slug normalization, UUID validation

hooks/
├── use-mobile.ts              # Mobile detection
└── use-prefers-reduced-motion.ts # Reduced motion

providers/
└── tenant-provider.tsx        # Tenant provider

proxy.ts                       # Authentication proxy (replaces middleware)

types/
└── database.ts                # Supabase row types
```

Database schema and SQL migrations are maintained in the **Student LMS** repo (`nextgen-cto-lms-product`). This app connects to the same Supabase project via `lib/supabase/` and does not ship migration files.

## Core Concepts

### Content Resolution

CollegeAdmin supports both UUID and slug-based URLs for content, pillars, bundles, and variants. The resolver system (`lib/resolvers/index.ts`):

1. Accepts either a UUID or a slug
2. Resolves to the canonical entity
3. Redirects UUIDs to their slug counterparts (canonical URL)

```typescript
import { resolveCourseByKey, resolveBundleByKey, resolveVariantByKey, resolvePillarByKey } from '@/lib/resolvers'
```

### Content Rendering

CollegeAdmin sees content that has been:
1. Assigned to the college via SuperAdmin's "Assign Pillar" action
2. Has `publish_status = 'published'`
3. Has `visible_to_college_admins = true`
4. Has an active `content_assignment` record

Content is grouped by real DB pillars (not fake/null pillars).

### Pillar Routes

CollegeAdmin exposes pillar-specific routes under `/admin/` that mirror the content view but grouped by pillar:

- `/admin/technical-bootcamp`
- `/admin/ai-modern-development`
- `/admin/behavioral-skills`
- `/admin/github-monitoring`
- `/admin/linkedin-monitoring`
- `/admin/resume-readiness`

All pillar routes are **read-only** — they display content assigned to the college but do not allow any modifications.

### Video Analytics

The video analytics system provides comprehensive insights into student video watch progress across courses.

**Core features:**
- College-wide overview: total/active/inactive students, total watch hours, lectures watched/completed
- Per-student video stats: watch time, lectures watched, completion %, courses started/completed
- Student leaderboard ranked by watch time
- Module-level breakdown per student per course
- Daily and weekly watch activity charts
- Search, status filtering (all/active/inactive/completed), sorting, date range filtering

**Key service:**
```typescript
import {
  getCollegeVideoAnalyticsOverview,
  getCollegeStudentVideoStats,
  mapStudentStatsToLeaderboard,
  getCollegeVideoAnalyticsCharts,
  getCollegeStudentVideoDetailBundle,
  listCollegeVideoAnalyticsCourses,
} from '@/lib/services/college-video-analytics'
```

**Analytics services:**
```typescript
import { CollegeEngagementService } from '@/lib/college-admin/analytics/services/engagement'
import { CollegeContentUsageService } from '@/lib/college-admin/analytics/services/content'
import { CollegeInstitutionService } from '@/lib/college-admin/analytics/services/institution'
```

### Security

**Rate limiting:** All public API endpoints use rate limiting via Supabase RPC (`lib/security/rate-limit.ts`). Supports fail-closed mode for security-sensitive endpoints.

**Audit logging:** Security events are logged via `log_security_event` RPC (`lib/security/audit.ts`). Events include failed logins, password resets, invite acceptances, and session revocations.

**Fast-path authentication:** The proxy sets `x-user-id`, `x-user-email`, `x-user-role`, and `x-college-role` headers. The fast-path guard reads JWT claims from these headers to skip RPC calls for performance.

### Admin Session Management

Admins can view their recent sessions and revoke specific sessions:
- Session history (last 50 active sessions)
- Self-revoke capability for compromised sessions
- All session events are audit-logged

### Student Invite Flow

1. Admin enters student email in `/students`
2. `inviteStudent` action calls Supabase Auth "Invite user"
3. Student receives email with confirmation link
4. Student sets password and completes enrollment
5. If college has active assignments, entitlements are auto-generated

### SMTP Configuration

Invite emails are sent by **Supabase** using Auth SMTP. Configure SendGrid in:
**Supabase Dashboard → Authentication → SMTP**

```env
SENDGRID_SMTP_HOST=smtp.sendgrid.net
SENDGRID_SMTP_PORT=587
SENDGRID_SMTP_USERNAME=apikey
SENDGRID_SMTP_PASSWORD=<your-api-key>
```

## Key Pages

| Route | Purpose |
|-------|---------|
| `/c/[slug]/admin/dashboard` | Institution dashboard |
| `/c/[slug]/admin/students` | Student management + invite |
| `/c/[slug]/admin/content` | Assigned courses grouped by pillar |
| `/c/[slug]/admin/content/[id]` | Course/bundle/variant detail (slug or UUID) |
| `/c/[slug]/admin/pillars/[id]` | Pillar catalog with courses |
| `/c/[slug]/admin/assessments` | Assessment management |
| `/c/[slug]/admin/placements` | Placement tracking |
| `/c/[slug]/admin/settings` | Admin settings |
| `/c/[slug]/admin/activity` | Activity feed (logs) |
| `/c/[slug]/admin/activity/performance` | Performance analytics |
| `/c/[slug]/admin/activity/video` | Video analytics & leaderboard |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/my-admin-tenant` | GET | Returns user's first active college slug |
| `/api/admin/auth-events` | POST | Logs auth security events (rate-limited) |
| `/api/admin/video-analytics/student-detail` | GET | Student video analytics drilldown |
| `/api/admin/session/history` | GET | Admin session history (last 50) |
| `/api/admin/session/revoke` | POST | Revoke a specific admin session |

## Important Services

```typescript
// Content & Assignment
import { listAssignedCoursesForCollegeAdmin } from '@/lib/services/assigned-courses'
import { getAssignedCourseDetailForCollegeAdmin } from '@/lib/services/assigned-courses'
import { listStudentsForCollegeAdmin } from '@/lib/services/students'

// Content Resolution (UUID + slug)
import { resolveCourseByKey, resolveBundleByKey, resolveVariantByKey, resolvePillarByKey } from '@/lib/resolvers'

// Video Analytics
import {
  getCollegeVideoAnalyticsOverview,
  getCollegeStudentVideoStats,
  getCollegeVideoAnalyticsCharts,
  getCollegeStudentVideoDetailBundle,
} from '@/lib/services/college-video-analytics'

// Analytics Services
import { CollegeEngagementService } from '@/lib/college-admin/analytics/services/engagement'
import { CollegeContentUsageService } from '@/lib/college-admin/analytics/services/content'
import { CollegeInstitutionService } from '@/lib/college-admin/analytics/services/institution'

// Security
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit'
import { logSecurityEvent } from '@/lib/security/audit'

// Auth
import { getSession } from '@/lib/auth/session'
import { requireCollegeAdminForAction } from '@/lib/auth/require-admin-action'
import { getAdminSessionHistory, revokeOwnAdminSessionById } from '@/lib/auth/admin-session'
```

## Notes

- Login no longer requires entering a slug — tenant resolved from admin membership
- Content is **read-only** — no create/edit/delete controls exist
- Direct URL manipulation to access unassigned courses returns 404
- Pillar routes (`/technical-bootcamp`, `/ai-modern-development`, etc.) are read-only mirrors of `/content` grouped by pillar
- CollegeAdmin can view assessments, placements, and other college-specific data but cannot modify SuperAdmin-provisioned content
- Content resolution supports both UUID and slug URLs with automatic canonical redirects
- Fast-path authentication reads user identity from proxy headers for better performance
- Rate limiting is applied to all public API endpoints via Supabase RPC
- Video analytics requires `student_video_progress` table (gracefully handles missing schema)
- Admin sessions can be viewed and revoked from the settings page