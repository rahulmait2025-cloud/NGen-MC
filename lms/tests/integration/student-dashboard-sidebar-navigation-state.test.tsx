/**
 * Student LMS authenticated sidebar navigation — UI state transitions.
 *
 * Vitest + RTL only: real Sidebar + Header + destination client shells,
 * controlled pathname via shared router harness. Does not verify Next.js
 * server navigation, middleware, cookies, Supabase, or database access.
 *
 * Mentorship page.tsx is an async Server Component (tabs live there). Destination
 * shell uses the same `@/components/ui/tabs` contract as that page (Book a Session /
 * My Sessions, defaultValue="book-session") without inventing booking business logic.
 */

import type { MouseEvent, ReactNode } from 'react';
import React, { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeaderTitleProvider } from '@/contexts/header-title';
import { TenantProvider } from '@/providers/tenant-provider';
import { DashboardGreeting } from '@/app/c/[collegeSlug]/student/(authenticated)/dashboard/_components/dashboard-greeting';
import { DsaSheetsLandingClient } from '@/app/c/[collegeSlug]/student/(authenticated)/sheets/_components/dsa-sheets-landing-client';
import { NotesCatalogView } from '@/app/c/[collegeSlug]/student/(authenticated)/notes/_components/notes-catalog-view';
import MyApplicationsTable from '@/app/c/[collegeSlug]/student/(authenticated)/my-applications/_components/my-applications-table';
import JobsTable from '@/app/c/[collegeSlug]/student/(authenticated)/jobs/_components/jobs-table';
import { UnifiedAnalyticsShell } from '@/app/c/[collegeSlug]/student/(authenticated)/analytics/_components/unified-analytics-shell';
import { StatsHeader } from '@/components/student-stats/stats-header';
import { PaymentHistoryContent } from '@/app/c/[collegeSlug]/student/(authenticated)/payment-history/payment-history-content';
import { CalendarDays, Clock } from 'lucide-react';
import { authenticatedRahulAuth, UiProviders } from '@/tests/utils/render-ui';
import {
  getMockPathname,
  getMockSearchParams,
  MOCK_ANALYTICS_PATH,
  MOCK_CODE_PULSE_PATH,
  MOCK_DASHBOARD_PATH,
  MOCK_JOBS_PATH,
  MOCK_MENTORSHIP_PATH,
  MOCK_MY_APPLICATIONS_PATH,
  MOCK_NOTES_PATH,
  MOCK_PAYMENT_HISTORY_PATH,
  MOCK_SHEETS_PATH,
  MOCK_TENANT_SLUG,
  resetMockPathname,
  setMockPathname,
  subscribeMockPathname,
} from '@/tests/utils/mock-next-navigation';
import type { PlatformConnectionStatus } from '@/types/student-stats';

vi.mock('next/navigation', () => ({
  usePathname: () =>
    useSyncExternalStore(subscribeMockPathname, getMockPathname, getMockPathname),
  useSearchParams: () =>
    useSyncExternalStore(subscribeMockPathname, getMockSearchParams, getMockSearchParams),
  useParams: () => ({ collegeSlug: 'nextgen' }),
  useRouter: () => ({
    push: (href: string) => setMockPathname(href),
    replace: (href: string) => setMockPathname(href),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: function MockLink({
    href,
    children,
    onClick,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    className?: string;
    prefetch?: boolean;
  }) {
    return (
      <a
        href={typeof href === 'string' ? href : '#'}
        {...rest}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && typeof href === 'string') {
            event.preventDefault();
            setMockPathname(href);
          }
        }}
      >
        {children}
      </a>
    );
  },
}));

vi.mock('next/image', () => ({
  default: function MockImage({
    alt,
    ...rest
  }: {
    alt: string;
    src?: string | { src: string };
    className?: string;
  }) {
    const src = typeof rest.src === 'string' ? rest.src : rest.src?.src ?? '';
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={src} className={rest.className} />;
  },
}));

vi.mock('@/lib/auth/logout', () => ({
  logout: vi.fn(async () => undefined),
}));

vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: function ThemeToggleStub({ className }: { className?: string }) {
    return (
      <button type="button" aria-label="Toggle theme" className={className}>
        Theme
      </button>
    );
  },
}));

vi.mock('@/components/_animations/stagger-reveal', () => ({
  StaggerReveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StaggerChild: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => true,
}));

vi.mock('@/app/c/[collegeSlug]/student/(authenticated)/sheets/actions', () => ({
  enrollStudentInSheet: vi.fn(async () => undefined),
  unenrollStudentFromSheet: vi.fn(async () => undefined),
}));

vi.mock('@/lib/actions/coding-stats-actions', () => ({
  validateAndSaveStudentPlatformProfiles: vi.fn(async () => ({ ok: true })),
  importStudentPlatformBatch: vi.fn(async () => ({
    processedYears: [],
    isComplete: true,
  })),
  syncCurrentStudentCodingStats: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/actions/student-job-applications', () => ({
  withdrawApplicationAction: vi.fn(async () => ({ success: true })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

const FIXTURE_SHEET = {
  id: 'sheet-arrays-1',
  title: 'Arrays & Hashing Patterns',
  slug: 'arrays-hashing-patterns',
  description_md: 'Practice array and hashing patterns for product interviews.',
  is_active: true,
  isPublished: true,
  isEnrolled: false,
  categoriesCount: 4,
  problemsCount: 42,
  completedCount: 0,
};

const FIXTURE_NOTE = {
  id: 'note-dsa-1',
  title: 'DSA Handwritten Pack',
  slug: 'dsa-handwritten-pack',
  short_description: 'Core DSA notes for interview prep.',
  pricing_model: 'free',
  price_minor: 0,
  currency: 'INR',
  cover_image_path: null,
  access: {
    hasAccess: true,
    source: 'free' as const,
    linkedCourseId: null,
    validUntil: null,
  },
};

const FIXTURE_CONNECTION: PlatformConnectionStatus = {
  github: {
    isConnected: true,
    username: 'rahul-dev',
    profileUrl: 'https://github.com/rahul-dev',
    connectedAt: '2026-01-01T00:00:00.000Z',
    lastSyncedAt: '2026-01-02T00:00:00.000Z',
    accountCreatedAt: null,
    earliestActivityDate: null,
    error: null,
  },
  leetcode: {
    username: null,
    lastSyncedAt: null,
    accountCreatedAt: null,
    earliestActivityDate: null,
  },
  codeforces: {
    handle: null,
    lastSyncedAt: null,
    accountCreatedAt: null,
    earliestActivityDate: null,
  },
  gfg: {
    username: null,
    lastSyncedAt: null,
    accountCreatedAt: null,
    earliestActivityDate: null,
  },
};

const FIXTURE_PAYMENT = {
  id: 'pay-1',
  entity_type: 'master_course',
  entity_title: 'Full Stack Bootcamp',
  plan_label: 'One-time',
  amount_minor: 499900,
  currency: 'INR',
  status: 'paid',
  payment_method: 'razorpay',
  coupon_code: null,
  created_at: '2026-01-10T10:00:00.000Z',
  paid_at: '2026-01-10T10:01:00.000Z',
  gateway_payment_id: 'pay_test_1',
};

/**
 * Mentorship destination shell: mirrors mentorship/page.tsx Tabs contract.
 * Full MentorshipPageContent is an async SC (auth + DB) and cannot run in jsdom.
 */
function MentorshipTabsShell() {
  return (
    <div className="min-w-0">
      <Tabs defaultValue="book-session" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="book-session" className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            Book a Session
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="size-4" />
            My Sessions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="book-session">
          <p>Mentorship booking shell</p>
        </TabsContent>
        <TabsContent value="sessions">
          <p>Mentorship sessions shell</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DestinationByPath({ pathname }: { pathname: string }) {
  if (pathname === MOCK_DASHBOARD_PATH) {
    return <DashboardGreeting firstName="Rahul" streak={0} />;
  }
  if (pathname === MOCK_SHEETS_PATH) {
    return (
      <DsaSheetsLandingClient
        sheets={[FIXTURE_SHEET]}
        collegeSlug={MOCK_TENANT_SLUG}
        studentId="student-rahul"
      />
    );
  }
  if (pathname === MOCK_NOTES_PATH) {
    return (
      <NotesCatalogView collections={[FIXTURE_NOTE]} collegeSlug={MOCK_TENANT_SLUG} />
    );
  }
  if (pathname === MOCK_MENTORSHIP_PATH) {
    return <MentorshipTabsShell />;
  }
  if (pathname === MOCK_MY_APPLICATIONS_PATH) {
    return <MyApplicationsTable applications={[]} collegeSlug={MOCK_TENANT_SLUG} />;
  }
  if (pathname === MOCK_JOBS_PATH) {
    return (
      <JobsTable
        jobs={[]}
        total={0}
        currentPage={1}
        pageSize={10}
        collegeSlug={MOCK_TENANT_SLUG}
        applicationStatuses={{}}
      />
    );
  }
  if (pathname === MOCK_ANALYTICS_PATH) {
    return (
      <UnifiedAnalyticsShell
        overviewTab={<p>Analytics overview panel</p>}
        coursesTab={<p>Analytics courses panel</p>}
        videosTab={<p>Analytics videos panel</p>}
        streaksTab={<p>Analytics streaks panel</p>}
        headerBadges={null}
      />
    );
  }
  if (pathname === MOCK_CODE_PULSE_PATH) {
    return (
      <StatsHeader
        studentName="Rahul Kumar"
        connectionStatus={FIXTURE_CONNECTION}
        username="rahul"
        usernameSet
      />
    );
  }
  if (pathname === MOCK_PAYMENT_HISTORY_PATH) {
    return (
      <PaymentHistoryContent
        rows={[FIXTURE_PAYMENT] as React.ComponentProps<typeof PaymentHistoryContent>['rows']}
      />
    );
  }
  return null;
}

function AuthenticatedStudentShell() {
  const pathname = useSyncExternalStore(
    subscribeMockPathname,
    getMockPathname,
    getMockPathname,
  );

  return (
    <UiProviders auth={authenticatedRahulAuth()}>
      <TenantProvider
        slug={MOCK_TENANT_SLUG}
        initialBranding={{
          id: 'tenant-nextgen',
          name: 'NextGen',
          slug: MOCK_TENANT_SLUG,
          shortName: 'NG',
          logoUrl: null,
          primaryColor: null,
          secondaryColor: null,
        }}
      >
        <HeaderTitleProvider>
          <SidebarProvider defaultOpen>
            <div className="flex min-h-svh w-full">
              <Sidebar tenantName="NextGen" studentName="Rahul Kumar" />
              <div className="flex min-w-0 flex-1 flex-col">
                <Header />
                <main>
                  <DestinationByPath pathname={pathname} />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </HeaderTitleProvider>
      </TenantProvider>
    </UiProviders>
  );
}

function renderDashboardShell() {
  resetMockPathname(MOCK_DASHBOARD_PATH);
  return render(<AuthenticatedStudentShell />);
}

function studentNav() {
  return screen.getByRole('navigation', { name: /student navigation/i });
}

function navLink(label: string) {
  return within(studentNav()).getByRole('link', { name: label });
}

function expectNavActive(label: string) {
  expect(navLink(label)).toHaveAttribute('aria-current', 'page');
}

function expectNavInactive(label: string) {
  expect(navLink(label)).not.toHaveAttribute('aria-current');
}

function assertDashboardPreState() {
  // Header title and sidebar nav both render the label "Dashboard".
  expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(2);
  expect(
    screen.getByText('Your learning overview and course activity.'),
  ).toBeInTheDocument();
  expect(screen.getByText('Good morning, Rahul')).toBeInTheDocument();
  expect(navLink('Dashboard')).toBeInTheDocument();
  expectNavActive('Dashboard');
}

describe('Student dashboard sidebar navigation state', () => {
  beforeEach(() => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    resetMockPathname(MOCK_DASHBOARD_PATH);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetMockPathname(MOCK_DASHBOARD_PATH);
  });

  it('changes the Dashboard state to Sheets when Sheets is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByPlaceholderText('Search sheets...')).not.toBeInTheDocument();
    expect(screen.queryByText('Arrays & Hashing Patterns')).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('Sheets'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_SHEETS_PATH);
    });
    expect(screen.getByText('Sheet-Styled Courses')).toBeInTheDocument();
    // Source page-meta subtitle (screenshot phrase "Master with a Guided Learning Sheet" is not in code).
    expect(
      screen.getByText('Practice Structured Patterns to crack product'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search sheets...')).toBeInTheDocument();
    expect(screen.getByText('Arrays & Hashing Patterns')).toBeInTheDocument();
    expectNavActive('Sheets');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });

  it('changes the Dashboard state to Notes when Notes is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByPlaceholderText('Search collections…')).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('Notes'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_NOTES_PATH);
    });
    expect(screen.getByPlaceholderText('Search collections…')).toBeInTheDocument();
    const filterGroup = screen.getByRole('radiogroup', {
      name: /filter notes by access/i,
    });
    expect(within(filterGroup).getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(filterGroup).getByRole('radio', { name: 'Mine' })).toBeInTheDocument();
    expect(within(filterGroup).getByRole('radio', { name: 'Locked' })).toBeInTheDocument();
    expect(screen.getByText('DSA Handwritten Pack')).toBeInTheDocument();
    expectNavActive('Notes');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });

  it('changes the Dashboard state to Mentorship when Mentorship is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByRole('tab', { name: /book a session/i })).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('Mentorship'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_MENTORSHIP_PATH);
    });
    const bookTab = screen.getByRole('tab', { name: /book a session/i });
    const sessionsTab = screen.getByRole('tab', { name: /my sessions/i });
    expect(bookTab).toBeInTheDocument();
    expect(sessionsTab).toBeInTheDocument();
    expect(bookTab).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Mentorship booking shell')).toBeInTheDocument();
    expectNavActive('Mentorship');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });

  it('changes the Dashboard state to My Applications when My Applications is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByText('No active applications yet')).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('My Applications'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_MY_APPLICATIONS_PATH);
    });
    expect(screen.getAllByText('My Applications').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Track the status of your job applications.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No active applications yet')).toBeInTheDocument();
    expectNavActive('My Applications');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });

  it('changes the Dashboard state to Jobs when Jobs is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByText('No job opportunities found')).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('Jobs'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_JOBS_PATH);
    });
    expect(screen.getAllByText('Jobs').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Browse and apply to open job postings.'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('No job opportunities found').length,
    ).toBeGreaterThanOrEqual(1);
    expectNavActive('Jobs');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });

  it('changes the Dashboard state to Analytics when Analytics is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByRole('tab', { name: 'Overview' })).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('Analytics'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_ANALYTICS_PATH);
    });
    const overview = screen.getByRole('tab', { name: 'Overview' });
    expect(overview).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Courses' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Videos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Streaks' })).toBeInTheDocument();
    expect(overview).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Analytics overview panel')).toBeInTheDocument();
    expectNavActive('Analytics');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });

  it('changes the Dashboard state to Code Pulse when Code Pulse is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByText(/connected profiles & links/i)).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('Code Pulse'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_CODE_PULSE_PATH);
    });
    expect(screen.getByText(/connected profiles & links/i)).toBeInTheDocument();
    expect(screen.getByText(/GitHub \(@rahul-dev\)/i)).toBeInTheDocument();
    expectNavActive('Code Pulse');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });

  it('changes the Dashboard state to Payment History when Payment History is clicked', async () => {
    const user = userEvent.setup();
    // Arrange — render Dashboard pre-state
    renderDashboardShell();

    // Assert — verify Dashboard UI
    assertDashboardPreState();
    expect(screen.queryByPlaceholderText('Search transactions...')).not.toBeInTheDocument();

    // Act — click destination navigation item
    await user.click(navLink('Payment History'));

    // Assert — verify destination UI
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_PAYMENT_HISTORY_PATH);
    });
    expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Bootcamp')).toBeInTheDocument();
    expectNavActive('Payment History');
    expectNavInactive('Dashboard');

    // Assert — verify Dashboard-only UI disappears
    expect(screen.queryByText('Good morning, Rahul')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Your learning overview and course activity.'),
    ).not.toBeInTheDocument();
  });
});
