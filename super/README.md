# SuperAdmin Portal

Platform-wide administration console for managing colleges, content, students, and platform operations.

## Quick Start

```bash
npm install
npm run dev
# Opens on http://localhost:3000
```

### Other Scripts

```bash
npm run lint        # ESLint
npm run build       # Production build (with 4GB memory limit)
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
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + RLS)
- **Video CDN**: TPStreams
- **UI**: shadcn/ui + Tailwind CSS
- **Animations**: Framer Motion, GSAP
- **Email**: SendGrid, Resend, pg_cron
- **Validation**: Zod

### Key Principles

- Server-side only (no client-side Supabase direct access for mutations)
- All mutations go through Server Actions with auth guards
- Service-role client for admin operations (bypasses RLS)
- Audit logging on all SuperAdmin mutations
- Landing page data stored in `metadata.landing_page` JSON columns
- Content resolution supports both UUID and slug URLs with canonical redirects
- Course resource management with lesson attachments and standalone module items
- Instant-send email campaigns with approval workflow (no scheduling)
- Video analytics idempotency via `client_segment_id` deduplication

## Folder Structure

```
app/
├── (app)/                    # Authenticated app routes
│   ├── activity/             # Platform activity feed
│   ├── analytics-settings/    # GA4 configuration
│   ├── analytics/            # Platform analytics
│   ├── appeals/              # Student appeals
│   ├── approvals/            # Pending approvals
│   ├── assessments/          # Assessment management
│   ├── assignments/          # Content assignments list
│   ├── audit/                # Audit log viewer
│   ├── billing/              # Billing management
│   ├── bundles/              # Course bundle management
│   ├── college-leads/         # Lead tracking
│   ├── colleges/             # College/tenant CRUD
│   ├── commerce/             # Commerce settings
│   ├── dashboard/            # SuperAdmin dashboard
│   ├── email-center/          # Email center (with per-campaign cron)
│   ├── entitlements/         # Entitlement management
│   ├── master-courses/       # Pillars & courses (core content)
│   │   ├── pillars/[pillarId]/
│   │   │   ├── courses/[courseId]/
│   │   │   │   ├── modules/[moduleId]/videos/  # Video asset management
│   │   │   │   └── preview/                   # Course preview
│   │   │   └── page.tsx                       # Pillar detail
│   │   ├── [courseId]/
│   │   │   ├── builder/        # Course builder
│   │   │   ├── course-resources-actions.ts # Resource server actions
│   │   │   ├── curriculum/     # Curriculum editor
│   │   │   └── video-assets/   # Video assets
│   │   └── sync/               # TPStreams sync page
│   ├── module-access/         # Access control
│   ├── placements/            # Placement tracking
│   ├── platform-analytics/    # Analytics
│   ├── programs/              # Program management
│   ├── reports/               # Reporting
│   ├── settings/              # Platform settings
│   ├── students/              # Cross-college student view
│   ├── support/               # Support tickets
│   ├── tpstreams/             # TPStreams management
│   ├── users/                 # User management
│   └── variants/              # Course variants
├── api/
│   ├── cron/
│   │   └── email-center/
│   │       ├── campaign/      # Per-campaign cron endpoint
│   │       └── index.ts       # Global email center cron
│   └── webhooks/              # Webhook handlers
├── auth/                      # Auth pages (login, signup, reset)
├── email/                     # Email templates
└── login/                     # Login page

components/
├── admin/                     # Admin-specific components
├── analytics/                 # Analytics charts
├── auth/                      # Auth UI components
├── college-admin/             # College admin components
├── colleges/                  # College CRUD UI
├── commerce/                  # Commerce components
├── dashboard/                 # Dashboard widgets
├── email-center/              # Email center components
│   ├── campaign-ops-diagnostics.tsx # Live pipeline diagnostics
│   └── email-center-cron-ops.tsx    # Cron ops management
├── layout/                    # Shell, sidebar, header
├── master-courses/            # Pillar/course management UI
│   ├── attach-resource-dialog.tsx         # Attach resource to lesson
│   ├── course-landing-page-template.tsx   # Landing page preview
│   ├── course-resource-manager.tsx        # Resource management panel
│   ├── create-course-dialog.tsx           # Course creation + Landing Page
│   ├── edit-pillar-dialog.tsx             # Pillar editing + Landing Page
│   ├── markdown-resource-editor.tsx       # Inline Markdown editor
│   ├── publish-pillar-button.tsx          # Pillar publish control
│   ├── repair-entitlements-button.tsx     # Entitlement repair
│   ├── resource-list.tsx                  # Resource display with actions
│   ├── resource-upload-dropzone.tsx       # File upload dropzone
│   ├── standalone-resource-insert-dialog.tsx # Insert standalone resource
│   ├── sync-tpstreams-button.tsx          # TPStreams sync trigger
│   ├── video-resource-badge.tsx           # Resource count badge
│   └── retry-*-sync-button.tsx            # Per-entity sync retry
├── pages/                     # Page-level components
├── shared/                    # Cross-app shared components
├── superadmin/                # SuperAdmin-specific
└── ui/                        # shadcn/ui components

lib/
├── auth/                      # requireSuperadmin, session helpers
├── college-admin/             # College admin helpers
├── email-center/              # Email center modules (39+ files)
│   ├── approvals.ts           # Campaign approval workflow
│   ├── campaign-cron.ts       # Per-campaign pg_cron scheduling
│   ├── campaign-schedule.ts   # Schedule validation
│   ├── cache.ts               # Next.js 16 cache busting
│   ├── diagnostics.ts         # Operational diagnostics
│   ├── pg-cron-ops.ts         # pg_cron job management
│   ├── process-campaign-worker.ts # Campaign processing worker
│   └── send-processor.ts      # Outbox batch processing
├── resolvers/                 # Content/pillar resolution (UUID + slug)
│   └── index.ts               # resolveBootcampByKey, resolveCourseByKey, etc.
├── services/                  # Core business logic (35+ services)
│   ├── analytics-settings.ts
│   ├── audit.ts
│   ├── cohorts.ts
│   ├── college-leads.ts
│   ├── colleges.ts            # College CRUD
│   ├── content-assignments.ts # Assignment engine
│   ├── course-bundles.ts      # Bundle management
│   ├── course-pricing.ts      # Pricing configuration
│   ├── course-resources.ts    # Resource management (CRUD, upload, reorder)
│   ├── course-variants.ts     # Variant management
│   ├── master-course-pillars.ts    # Pillar CRUD + diagnostics
│   ├── master-courses.ts           # Course CRUD
│   ├── master-course-structure.ts  # Module/item structure
│   ├── master-course-publish.ts    # Publish workflow
│   ├── master-course-delete.ts     # Deletion with TPStreams cleanup
│   ├── ops-pages.ts
│   ├── payment-dashboard.ts
│   ├── pillar-assignments.ts  # Bulk pillar assignment
│   ├── resolved-content.ts
│   ├── sidebar-metrics.ts
│   ├── student-entitlements.ts    # Entitlement grants
│   ├── students.ts            # Student management
│   ├── tenant-module-overrides.ts
│   ├── tpstreams-analytics.ts
│   ├── tpstreams-force-delete.ts
│   ├── tpstreams-health.ts
│   ├── tpstreams-hierarchy.ts
│   ├── tpstreams-sync.ts      # Full TPStreams sync
│   └── video-assets.ts        # Video asset management
├── supabase/
│   ├── admin.ts               # Service-role client
│   └── server.ts              # Server-side client
├── tenant/                    # Tenant resolution
├── tpstreams/                 # TPStreams API client
├── utils/
│   ├── admin-routes.ts        # Route builder helpers for slug URLs
│   └── slug.ts                # Slug normalization, UUID validation
└── validation/                # Zod schemas (master-course.ts exports types)

supabase/migrations/           # SQL migrations (00199-00206+)
types/
└── database.ts                # Supabase row types
```

## Core Concepts

### Pillars & Courses

Content hierarchy: **Pillars → Courses → Modules → Items → Videos**

- Pillars are top-level groupings (e.g., "Technical Bootcamp", "AI & Modern Development")
- Courses belong to exactly one pillar
- Modules contain curriculum items (videos, PDFs, resources, etc.)
- TPStreams folders mirror this hierarchy for video storage

### Course Resource Management

SuperAdmin can attach resources (Markdown notes, PDFs, external links) to courses at two scopes:

**Lesson Attachment** — resources attached to a specific video/lesson item
**Standalone Module Item** — resources that appear as top-level items in a module's curriculum

**Supported resource types:** `markdown`, `pdf`, `external_link`

**Key components:**
- `course-resource-manager.tsx` — Resource management panel per module
- `resource-list.tsx` — Resource display with actions
- `resource-upload-dropzone.tsx` — Drag-and-drop file upload
- `markdown-resource-editor.tsx` — Inline Markdown editor
- `attach-resource-dialog.tsx` — Attach existing resources to lessons
- `standalone-resource-insert-dialog.tsx` — Insert standalone module items
- `video-resource-badge.tsx` — Badge showing resource count on videos

### Slug-Based Routing

URLs now use human-readable slugs instead of UUIDs for bootcamps, courses, pillars, bundles, and variants. The system supports both slug and UUID access with canonical ID resolution.

```typescript
import { resolveBootcampByKey, resolvePillarByKey, resolveCourseByKey, resolveBundleByKey, resolveVariantByKey } from '@/lib/resolvers'
```

- Both slugs and UUIDs are accepted
- UUIDs are automatically redirected to their slug counterparts
- Route builder helpers available in `lib/utils/admin-routes.ts`

### Landing Page Editor

SuperAdmin editors can customize the public-facing landing page for any course or pillar:

**Course Landing Page** (`create-course-dialog.tsx`, "Landing Page" tab):
- Hero section (title, subtitle, video/image)
- Social proof stats strip
- Pricing with tiers and perks
- Learning outcomes list
- Instructors/mentors (name, designation, image, bio, LinkedIn, YouTube)
- Testimonials (name, role, content, avatar, rating, initials)
- FAQs

**Pillar Landing Page** (`edit-pillar-dialog.tsx`, "Landing Page" tab):
- Hero badge and CTA banner
- Social proof stats
- Pillar mentors
- Student testimonials
- Pillar FAQs

Data is stored in `master_courses.metadata.landing_page` and `master_course_pillars.metadata.landing_page`.

### Content Assignment Flow

1. SuperAdmin creates/publishes a Pillar
2. SuperAdmin toggles `visible_to_college_admins` / `visible_to_college_students`
3. SuperAdmin clicks "Assign Pillar" and selects colleges
4. System creates `content_assignments` for each published+visible course
5. Entitlements are auto-generated for all existing college students
6. Future students get entitlements via repair button or trigger

### TPStreams Sync

The sync system keeps TPStreams folders in sync with the DB hierarchy:
- `tpstreams-sync.ts` — full hierarchical sync
- Per-entity retry buttons (course, module, pillar)
- Force delete cleans up orphaned TPStreams assets
- Health dashboard shows sync status across the platform

### Email Center (instant send)

Campaigns are sent immediately via the superadmin **Send Now** action. Large sends can be continued manually with **Continue Sending**; failed rows are retried only through **Retry Failed**.

- Outbox-based delivery with idempotency, tracking, and suppression checks
- Batched processing within the server action (no pg_cron / no periodic API polling)
- Operational diagnostics on the campaign detail page

**Campaign Approval Workflow:**
- Approval gate controlled by `EMAIL_CENTER_REQUIRE_APPROVAL` env var
- Request, approve, reject, cancel approval with audit events
- Approval events logged in `email_campaign_approval_events` table

### Video Analytics Idempotency

Video watch segments support client-side idempotency to prevent duplicate writes:

- `client_segment_id` — unique identifier per segment from client
- `player_instance_id` — identifies the player instance
- `client_sequence` — sequence number for ordering
- `calculation_version` — tracks which calculation version was used

Unique index on `(student_id, lesson_id, client_segment_id)` ensures deduplication.

### Entitlement Types

| Source | Description |
|--------|-------------|
| `b2b_college` | Assigned via college (from pillar/course assignment) |
| `b2c_direct` | Direct student purchase |
| `bundle` | Access via bundle purchase |
| `subscription` | Subscription-based access |
| `manual_grant` | Manually granted by admin |

## Key Pages

| Route | Purpose |
|-------|---------|
| `/master-courses` | Pillar listing + diagnostics |
| `/master-courses/pillars/[id]` | Pillar detail, course list, visibility toggles |
| `/master-courses/pillars/[id]/courses/[id]` | Course detail, curriculum, video assets, resources |
| `/master-courses/[id]/video-assets` | Video asset management |
| `/master-courses/[id]/course-resources` | Course resource management |
| `/master-courses/sync` | TPStreams sync dashboard |
| `/assignments` | All content assignments, repair entitlements |
| `/colleges` | College CRUD, invite admins |
| `/students` | Cross-college student view |
| `/entitlements` | Entitlement management |
| `/dashboard` | Platform overview |
| `/tpstreams` | Video sync health & management |
| `/email-center` | Email center dashboard |
| `/email-center/[id]` | Campaign detail with diagnostics |

## API Routes

Email Center sends are triggered by server actions (`sendCampaignNowAction`); there are no Email Center cron API routes.

## Auth Guards

- `requireSuperadmin()` — Protects all `/master-courses/*`, `/assignments/*`, etc.
- `requireSuperadminActionSafe()` — Used in Server Actions, returns `{ ok, error }` instead of throwing

## Notes

- All SuperAdmin mutations are audited in `audit_logs` table
- TPStreams folders are created lazily on first video upload
- Diagnostic dashboard shows renderability status for CollegeAdmin and Student portals
- Repair entitlements button calls RPC `grant_assigned_college_courses_to_existing_students`
- Landing page templates rendered in LMS use `LandingPageData` and `PillarLandingPageData` types
- Content resolution supports both UUID and slug URLs with automatic canonical redirects
- Course resources support Markdown, PDF, and external link attachments
- Email center uses instant Send Now / Continue Sending (no scheduled campaigns)
- Campaign approval workflow available when `EMAIL_CENTER_REQUIRE_APPROVAL` is set
- Video analytics segments use `client_segment_id` for idempotent writes
- Migration range spans 00199-00206+ covering course resources, email cron, slug routing, and video analytics