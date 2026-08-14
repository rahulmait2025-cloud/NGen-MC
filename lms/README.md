# LMS (Learning Management System)

Student-facing learning portal for course consumption, progress tracking, and career readiness. Supports both college-enrolled students and global (direct) learners with a modern, redesigned pillar/course landing page experience.

## Quick Start









```bash
npm install
npm run dev
# Opens on http://localhost:3002
```

### Other Scripts

```bash
npm run dev:3002    # Dev server on port 3002
npm run lint        # ESLint
npm run build       # Production build
npm run start       # Start production server
npm run typecheck   # TypeScript check
npm run email:test  # Test email adapter
npm run db:streak   # Apply streak tables migration
npm run db:profile  # Apply profile fields + avatar migration
```

## Environment Variables

Create a `.env` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GITHUB_PUBLIC_API_TOKEN=<server-token-for-public-contribution-queries>
YOUTUBE_API_KEY=<your-youtube-api-key>        # Optional, for subscriber counts
YOUTUBE_CHANNEL_ID=<your-youtube-channel-id>   # Optional, for subscriber counts
STREAK_TIMEZONE=Asia/Kolkata                   # Timezone for daily streak (default)
USE_RICH_VIDEO_ANALYTICS=true                  # Feature flag for rich analytics
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + RLS)
- **Video CDN**: TPStreams
- **UI**: shadcn/ui + Tailwind CSS
- **Animations**: GSAP, Tailwind animate + CSS keyframes
- **Analytics**: Custom video analytics with rich schema

### Student Types

| Type | Auth | Visibility | Access |
|------|------|------------|--------|
| **College Student** | Email/password via college | `visible_to_college_students = true` | Entitlement required |
| **Global Learner** | Google OAuth or email | `visible_to_global_students = true` | Preview/locked, purchase to unlock |

Direct learners are provisioned into the internal `direct-learners` tenant.

### Key Principles

- `/courses` → YouTube/free content only (no platform courses)
- `/pillars` → Platform/paid courses via DB pillars and entitlements
- Global students can preview courses but need to purchase/enroll for full access
- All access validated against `student_entitlements` table
- Pillar slug validated against course's `pillar_id` — prevents URL manipulation
- Landing page data read from `metadata.landing_page` JSON columns
- Content resolution supports both UUID and slug URLs with canonical redirects
- Rich video analytics with session tracking, segment deduplication, and server-side recompute
- Daily visit streak system with timezone-aware calendar boundaries
- Course resources (PDF, Markdown, External Links) attached to lessons
- Auth proxy propagates user identity via headers for fast-path authentication

## Folder Structure

```
app/
├── c/[collegeSlug]/
│   └── student/
│       ├── (authenticated)/   # Protected student routes
│       │   ├── _components/    # Shared student components
│       │   ├── activity/        # Activity feed
│       │   ├── analytics/       # Student analytics
│       │   ├── assessments/     # Assessments
│       │   ├── courses/         # Free YouTube courses
│       │   ├── learn/
│       │   │   └── [courseId]/  # Learning experience (video player)
│       │   │       ├── lessons/[itemId]/ # Lesson detail (slug or UUID)
│       │   │       └── course-resources-actions.ts # Resource server actions
│       │   ├── mentorship/      # Mentorship
│       │   ├── page.tsx         # Dashboard (main page)
│       │   ├── pillars/         # Paid platform courses
│       │   │   └── [pillarSlug]/
│       │   │       ├── page.tsx           # Pillar landing page (redesigned)
│       │   │       └── courses/[courseId]/
│       │   │           └── page.tsx       # Course detail page (slug support)
│       │   ├── placements/     # Placements
│       │   ├── profile/        # Student profile (redesigned)
│       │   │   ├── bio-section.tsx        # Editable bio
│       │   │   ├── enrolled-courses.tsx   # Enrolled courses list
│       │   │   ├── identity-header.tsx    # Avatar + identity
│       │   │   ├── portfolio-links.tsx    # GitHub/LinkedIn/Resume links
│       │   │   └── profile-stats.tsx      # Streak and completion stats
│       │   ├── projects/       # Projects
│       │   └── readiness/      # Career readiness
│       ├── auth/               # Auth pages
│       ├── forgot-password/
│       ├── login/
│       └── layout.tsx
├── api/
│   ├── analytics/
│   │   ├── admin/video/        # Admin cohort analytics
│   │   └── student/video/      # Student personal analytics
│   ├── student/
│   │   ├── auth-events/        # Auth event logging
│   │   ├── lecture-progress/   # Lecture progress (stub)
│   │   └── streak/             # Daily visit streak
│   └── video-analytics/
│       ├── heartbeat/          # Watch segment heartbeats
│       ├── progress/           # Video progress
│       └── session/
│           ├── start/          # Start analytics session
│           └── end/            # End analytics session
└── login/                     # Login page

components/
├── analytics/                 # Analytics
├── auth/                      # Auth components (unified-auth-screen)
├── courses/                   # Course cards, grids
├── dashboard/                 # Dashboard widgets
├── header.tsx                 # App header
├── lessons/                   # Learning experience
├── locked-pillar-appeal-modal.tsx # Appeal for locked pillar access
├── shared/                    # Shared components (breadcrumbs)
├── sidebar.tsx                # App sidebar
├── sidebar-collapser.tsx      # Sidebar toggle
├── sidebar-styles.ts          # Sidebar styling
├── skeletons/                 # Loading skeletons
│   ├── learn-page-skeleton.tsx
│   └── profile-skeleton.tsx
├── student/                   # Student-specific components
│   ├── course-player-playlist-shell.tsx  # Video playlist shell
│   ├── lesson-bookmarks-card.tsx         # Bookmarks panel
│   ├── lesson-engagement-panel.tsx       # Engagement panel
│   ├── lesson-item-placeholder.tsx        # Placeholder for non-video items
│   ├── lesson-notes-card.tsx             # Notes panel
│   ├── lesson-resources-card.tsx          # Resources panel
│   ├── markdown-renderer.tsx             # Markdown content renderer
│   ├── non-video-lesson-renderer.tsx      # PDF/resource renderer
│   ├── pdf-resource-viewer.tsx           # Embedded PDF viewer
│   ├── resource-item-player.tsx          # Non-video lesson items
│   ├── tpstreams-player.tsx               # TPStreams video player
│   ├── youtube-courses-grid.tsx           # YouTube course grid
│   └── youtube-playlist-player.tsx        # YouTube playlist player
└── ui/                        # shadcn/ui components

lib/
├── actions/
│   └── profile.ts             # Profile server actions
├── activity/                  # Activity tracking
├── analytics/                 # Video analytics system
│   ├── admin-video-analytics-service.ts # Admin cohort analytics
│   ├── calculation.ts         # Range merging, watched-second calcs
│   ├── feature-flag.ts        # USE_RICH_VIDEO_ANALYTICS flag
│   ├── resolve-analytics-student.ts # Student identity resolver
│   ├── service.ts             # VideoAnalyticsBackendService
│   ├── student-video-analytics-service.ts # Student personal analytics
│   └── types.ts               # Rich type definitions
├── auth/
│   └── require-student.ts     # Student auth guard + context
├── email/                     # Email helpers
├── lms/                       # LMS-specific utilities
├── modules/                   # Module utilities
├── payments/                  # Payment processing (Razorpay)
│   ├── coupons.ts             # Coupon validation
│   ├── orders.ts              # Order management
│   ├── payment-entitlements.ts # Payment-based entitlements
│   └── razorpay-webhooks.ts   # Razorpay webhook handler
├── playlist-close-on-narrow.ts # Responsive playlist behavior
├── resolvers/                 # Content resolution (UUID + slug)
│   └── index.ts               # resolvePillarByKey, resolveCourseByKey, etc.
├── security/                  # Security utilities
├── services/
│   ├── assessments.ts         # Assessment queries
│   ├── courses.ts             # Course queries
│   ├── direct-learners.ts      # Direct learner tenant
│   ├── global-courses.ts      # Global catalog (preview/locked)
│   ├── placements.ts          # Placement queries
│   ├── student-content-entitlements.ts
│   ├── student-courses.ts     # Entitled courses + progress
│   ├── student-engagement.ts  # Engagement metrics
│   ├── student-entitlements.ts         # Basic entitlement validation
│   ├── student-entitlements-expanded.ts # Phase 5: variants, bundles
│   ├── student-progress.ts     # Progress tracking
│   └── student-resources.ts    # Resource management
├── streak/
│   └── daily-streak.ts        # Daily visit streak recording
├── supabase/
│   ├── client.ts              # Browser client
│   └── server.ts              # Server client
├── tenant/
│   └── get-tenant.ts          # Tenant resolution
├── tpstreams/                 # TPStreams utilities
└── utils/
    └── slug.ts                # Slug normalization, UUID validation

proxy.ts                       # Auth proxy (sets x-user-* headers)

supabase/migrations/           # SQL migrations
types/
└── database.ts               # Supabase row types
```

## Redesigned Pillar & Course Landing Pages

The pillar landing page (`/pillars/[pillarSlug]`) was fully redesigned with a modern, sleek aesthetic:

### Pillar Page Sections
1. **Dynamic Hero** — Centered headline, badge, stats grid (courses/modules/videos)
2. **Marquee Highlights** — Infinite horizontal scroll with key differentiators (AI-First Engineering, Enterprise Scale, etc.)
3. **Course Grid** — Cards with progress bars, module/video counts, resume/launch logic
4. **Learning Outcomes** — Skill-based outcomes with icons
5. **Mentor Section** — Mentor bio with LinkedIn/YouTube links
6. **Testimonials Marquee** — Dual-direction infinite scroll of student testimonials
7. **Comparison Table** — NextGen CTO vs typical courses comparison
8. **FAQ Accordion** — Expandable FAQ cards
9. **Massive Typography Footer** — Animated "FUTURE CTO" CTA section

### Course Detail Page
- 2-column hero (info left, sticky enroll card right)
- Learning outcomes, curriculum overview, testimonials, instructors, FAQ, CTA

Landing page data is read from `courseRow.metadata.landing_page` (LandingPageData) and `pillarData.metadata.landing_page` (PillarLandingPageData).

## Slug-Based Routing

Courses, pillars, bundles, variants, and lessons can all be resolved by either UUID or human-readable slug. The resolver layer (`lib/resolvers/index.ts`) provides:

```typescript
import { resolvePillarByKey, resolveCourseByKey, resolveBootcampByKey, resolveBundleByKey, resolveVariantByKey } from '@/lib/resolvers'
```

- URLs accept both UUIDs and slugs
- UUIDs are automatically redirected to their slug counterparts (canonical URL)
- Lesson pages at `/learn/[courseId]/lessons/[itemId]` support slug-based navigation

## Rich Video Analytics

The video analytics system tracks detailed student viewing behavior with a rich schema:

### Database Tables
- `video_watch_sessions` — per-session tracking with play/pause/seek counts
- `video_watch_segments` — individual watch segments with deduplication via `client_segment_id`
- `video_watch_events` — granular event log (play, pause, seek, ended, etc.)
- `student_video_progress` — computed per-lesson aggregates

### Key Features
- **Idempotent heartbeats** — segment deduplication prevents duplicate writes
- **Server-side recompute** — watched seconds calculated from historical segments (client scalars not trusted)
- **Feature flag** — `USE_RICH_VIDEO_ANALYTICS` controls read-side selection
- **Admin analytics** — cohort-level analytics for admins

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/video-analytics/session/start` | POST | Start analytics session |
| `/api/video-analytics/session/end` | POST | End/finalize session |
| `/api/video-analytics/heartbeat` | POST | Receive watch segments |
| `/api/video-analytics/progress` | GET | Read current progress |
| `/api/analytics/student/video` | GET | Student personal analytics |
| `/api/analytics/admin/video` | GET | Admin cohort analytics |

## Course Resources

Lessons can have attached `course_resources` of type `pdf`, `markdown`, or `external_link`. Students can view resources via the resources panel and resource player components.

**Server actions:**
```typescript
import { getPdfSignedUrlAction, getMarkdownContentAction, listCourseResourceMetadata } from '@/app/.../learn/course-resources-actions'
```

**Components:**
- `lesson-resources-panel.tsx` — collapsible resource panel
- `resource-item-player.tsx` — renders non-video lesson items
- `markdown-renderer.tsx` — markdown content renderer
- `pdf-resource-viewer.tsx` — embedded PDF viewer with download

## Daily Visit Streak

The streak system tracks daily student visits and maintains streak counts:

- Uses `student_daily_visits` and `student_streaks` tables
- Calendar day boundary uses `Asia/Kolkata` timezone (configurable via `STREAK_TIMEZONE`)
- API route: `POST /api/student/streak`
- Graceful fallback if tables are missing

## Profile Redesign

The profile page is modularized into focused components:

- `identity-header.tsx` — avatar with upload, name, email, membership badge
- `bio-section.tsx` — editable bio (max 200 words) with word count
- `portfolio-links.tsx` — inline-editable GitHub, LinkedIn, Resume links
- `enrolled-courses.tsx` — up to 5 enrolled courses with progress rings
- `profile-stats.tsx` — streak and profile completion percentage cards

**Server actions:**
```typescript
import { updateStudentProfile, uploadStudentAvatar, updateStudentBio } from '@/lib/actions/profile'
```

## Core Concepts

### Content Access Flow

```
Student → requireStudent() → getStudentLearningContext()
                                    ↓
              isGlobal ? global-courses.ts : student-courses.ts
                                    ↓
              getStudentAccessibleCourses() → resolve entitlements
                                    ↓
              filter by publish_status + visibility flags
                                    ↓
              return courses grouped by pillar
```

### Entitlement Validation

```typescript
validateStudentCourseAccess(studentId, courseId, context)
// 1. Checks hierarchy visibility (pillar + course publish/visibility)
// 2. Checks active entitlement (direct, variant, or bundle path)
// 3. Returns entitlement row if valid, null if not
```

### YouTube vs Platform Content

| Route | Source | Access |
|-------|--------|--------|
| `/courses` | YouTube API via `getYouTubeCoursesCatalog()` | Free, no login required |
| `/pillars` | DB pillars + `student_entitlements` | Requires entitlement |

### Student Access Context

```typescript
interface StudentAccessContext {
  isGlobal: boolean        // true = direct learner, false = college student
  collegeId: string | null // null for global students
}
```

### Learning Experience

The `/learn/[courseId]` page provides a full video learning experience:
- TPStreams or YouTube video playback
- Playlist sidebar with module navigation
- Lesson bookmarks, notes, and resources panels
- Engagement tracking per item/module/course

## Key Pages

| Route | Purpose |
|-------|---------|
| `/c/[slug]/student/` | Dashboard with enrolled courses |
| `/c/[slug]/student/courses` | Free YouTube courses |
| `/c/[slug]/student/pillars` | Browse all platform pillars |
| `/c/[slug]/student/pillars/[slug]` | Pillar landing page (redesigned) |
| `/c/[slug]/student/pillars/[slug]/courses/[id]` | Course detail + enrollment |
| `/c/[slug]/student/learn/[courseId]` | Learning experience (video player) |
| `/c/[slug]/student/profile` | Student profile |

## URL Manipulation Prevention

The `/pillars/[pillarSlug]/courses/[courseId]` page validates:

1. Pillar exists with matching slug AND `publish_status = 'published'`
2. Course belongs to that pillar AND `publish_status = 'published'`
3. Visibility flag matches student type (`visible_to_college_students` or `visible_to_global_students`)
4. For college students: entitlement exists
5. For global students: course is visible globally (purchase required to unlock)

If any check fails → `notFound()` is called.

## Notes

- Direct learners (Google auth) go to `direct-learners` tenant, not real colleges
- Progress is tracked per student per course/module/item
- B2B (college) and B2C (direct) entitlements are strictly separated — cross-tenant access is blocked at `isEntitlementActiveForContext`
- EnrollButton component handles purchase flow for global students
- Locked pillar appeal modal lets students request access to locked content
- YouTube subscriber count is fetched dynamically and displayed on pillar pages
- Content resolution supports both UUID and slug URLs with automatic canonical redirects
- Rich video analytics requires migration scripts (run `npm run db:streak` and `npm run db:profile`)
- Daily streak system uses timezone-aware calendar boundaries (default: Asia/Kolkata)
- Course resources support PDF, Markdown, and external link attachments
- Profile page supports avatar upload, bio, and portfolio links
- Auth proxy propagates user identity via headers for fast-path authentication
