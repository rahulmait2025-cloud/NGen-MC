import type { ReactNode, MouseEvent } from 'react';
import { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentLandingNavbar } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/student-landing-navbar';
import { StudentLandingHero } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/student-landing-hero';
import { CoursesHubStaticShell } from '@/app/c/[collegeSlug]/student/(authenticated)/courses/_components/courses-hub-static-shell';
import { authenticatedRahulAuth, UiProviders } from '@/tests/utils/render-ui';
import {
  getMockPathname,
  MOCK_COURSES_PATH,
  MOCK_EXPLORE_PATH,
  resetMockPathname,
  setMockPathname,
  subscribeMockPathname,
} from '@/tests/utils/mock-next-navigation';

vi.mock('next/navigation', () => ({
  usePathname: () =>
    useSyncExternalStore(subscribeMockPathname, getMockPathname, getMockPathname),
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
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    className?: string;
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
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
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

vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => false,
}));

function applyGsapStyle(
  targets: unknown,
  vars: { opacity?: number; autoAlpha?: number; visibility?: string },
) {
  const list = Array.isArray(targets)
    ? targets
    : targets instanceof NodeList
      ? Array.from(targets)
      : [targets];
  for (const target of list) {
    if (!(target instanceof HTMLElement)) continue;
    if (vars.opacity != null) target.style.opacity = String(vars.opacity);
    if (vars.autoAlpha != null) {
      target.style.opacity = String(vars.autoAlpha);
      target.style.visibility = vars.autoAlpha === 0 ? 'hidden' : 'visible';
    }
    if (vars.visibility != null) target.style.visibility = vars.visibility;
  }
}

/** jsdom lacks GSAP ScrollTrigger/Observer browser APIs — apply end-state styles immediately. */
vi.mock('gsap', () => {
  const timeline = () => {
    const api = {
      to(targets: unknown, vars: { opacity?: number; autoAlpha?: number }) {
        applyGsapStyle(targets, vars);
        return api;
      },
      fromTo(
        targets: unknown,
        _from: unknown,
        vars: { opacity?: number; autoAlpha?: number },
      ) {
        applyGsapStyle(targets, vars);
        return api;
      },
      set(targets: unknown, vars: { opacity?: number; autoAlpha?: number }) {
        applyGsapStyle(targets, vars);
        return api;
      },
      defaults() {
        return api;
      },
    };
    return api;
  };

  return {
    gsap: {
      registerPlugin() {},
      context(fn: () => void) {
        fn();
        return { revert() {} };
      },
      timeline,
      to(targets: unknown, vars: { opacity?: number; autoAlpha?: number }) {
        applyGsapStyle(targets, vars);
      },
      fromTo(
        targets: unknown,
        _from: unknown,
        vars: { opacity?: number; autoAlpha?: number },
      ) {
        applyGsapStyle(targets, vars);
      },
      set(targets: unknown, vars: { opacity?: number; autoAlpha?: number }) {
        applyGsapStyle(targets, vars);
      },
      utils: {
        toArray() {
          return [];
        },
      },
      ticker: {
        add() {},
        remove() {},
        lagSmoothing() {},
      },
    },
  };
});

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    update() {},
    refresh() {},
    getAll() {
      return [];
    },
  },
}));

/**
 * Mirrors ExploreStyleShell's real connection:
 * persistent StudentLandingNavbar + route-driven page children
 * (Explore home hero vs Courses hub shell).
 */
function StudentLandingExploreCoursesHarness() {
  const pathname = useSyncExternalStore(
    subscribeMockPathname,
    getMockPathname,
    getMockPathname,
  );
  const isCoursesHub =
    pathname === MOCK_COURSES_PATH || pathname.startsWith(`${MOCK_COURSES_PATH}/`);

  return (
    <UiProviders auth={authenticatedRahulAuth()}>
      <div className="landing-shell">
        <StudentLandingNavbar collegeSlug="nextgen" showMenuButton={false} />
        <main aria-label="Landing content">
          {isCoursesHub ? (
            // Match product Courses hub with Job Ready Bootcamp enabled (3 paths).
            <CoursesHubStaticShell collegeSlug="nextgen" showBootcamp />
          ) : (
            <StudentLandingHero collegeSlug="nextgen" />
          )}
        </main>
      </div>
    </UiProviders>
  );
}

function landingMain() {
  return screen.getByRole('main', { name: 'Landing content' });
}

async function expectExploreHeroVisible() {
  const main = landingMain();
  const heading = await within(main).findByRole('heading', { level: 1 });
  // Word spans omit literal spaces in textContent (margin provides visual gaps).
  await waitFor(() => {
    expect(heading).toHaveTextContent(/FromCollegeBeginnerto/i);
    expect(heading).toHaveTextContent(/Industry Ready/i);
  });
  expect(
    await within(main).findByRole('link', { name: /Start Your Journey/i }),
  ).toBeVisible();
  expect(
    await within(main).findByRole('link', { name: /Explore Curriculum/i }),
  ).toBeVisible();
}

async function expectCoursesHeroVisible() {
  const main = landingMain();
  const heading = await within(main).findByRole(
    'heading',
    { level: 1, name: /Pick the course path that matches your next level/i },
    { timeout: 8_000 },
  );
  await waitFor(() => {
    expect(heading).toBeVisible();
  });
  expect(within(main).getByText('Learning route')).toBeVisible();
  expect(within(main).getByText(/3 paths/i)).toBeVisible();
  // Titles appear in hero cards and again in later hub sections.
  expect(within(main).getAllByText('Free Courses').length).toBeGreaterThanOrEqual(1);
  expect(within(main).getAllByText('Free Courses')[0]).toBeVisible();
  expect(within(main).getAllByText('Paid Courses').length).toBeGreaterThanOrEqual(1);
  expect(within(main).getAllByText('Paid Courses')[0]).toBeVisible();
  expect(within(main).getAllByText('Job Ready Bootcamp').length).toBeGreaterThanOrEqual(1);
  expect(within(main).getAllByText('Job Ready Bootcamp')[0]).toBeVisible();
  expect(within(main).getByRole('link', { name: /Compare Levels/i })).toBeVisible();
  expect(within(main).getByRole('link', { name: /View Free Courses/i })).toBeVisible();
  expect(within(main).getAllByText(/LEVEL 1/i).length).toBeGreaterThanOrEqual(1);
  expect(within(main).getAllByText(/LEVEL 2/i).length).toBeGreaterThanOrEqual(1);
  expect(within(main).getAllByText(/LEVEL 3/i).length).toBeGreaterThanOrEqual(1);
  expect(within(main).getByText('Free entry')).toBeVisible();
  expect(within(main).getByText('Curated paid tracks')).toBeVisible();
  expect(within(main).getByText('Bootcamp roadmap')).toBeVisible();
}

function expectExploreHeroAbsent() {
  const main = landingMain();
  expect(
    within(main).queryByRole('link', { name: /Start Your Journey/i }),
  ).not.toBeInTheDocument();
  expect(
    within(main).queryByRole('link', { name: /Explore Curriculum/i }),
  ).not.toBeInTheDocument();
  expect(
    within(main).queryByRole('heading', {
      level: 1,
      name: /Industry Ready/i,
    }),
  ).not.toBeInTheDocument();
}

function expectCoursesHeroAbsent() {
  const main = landingMain();
  expect(
    within(main).queryByRole('heading', {
      level: 1,
      name: /Pick the course path that matches your next level/i,
    }),
  ).not.toBeInTheDocument();
  expect(within(main).queryByText('Learning route')).not.toBeInTheDocument();
  expect(within(main).queryByText('Free Courses')).not.toBeInTheDocument();
  expect(within(main).queryByText('Paid Courses')).not.toBeInTheDocument();
  expect(within(main).queryByText('Job Ready Bootcamp')).not.toBeInTheDocument();
  expect(
    within(main).queryByRole('link', { name: /Compare Levels/i }),
  ).not.toBeInTheDocument();
  expect(
    within(main).queryByRole('link', { name: /View Free Courses/i }),
  ).not.toBeInTheDocument();
}

/**
 * Real navbar flow: Courses is a NavigationMenuTrigger (button).
 * Opening it reveals the "All Courses" link to `/courses`, which drives the hub hero.
 */
async function navigateToCoursesHubViaNavbar(
  user: ReturnType<typeof userEvent.setup>,
) {
  const coursesTrigger = screen.getByRole('button', { name: 'Courses' });
  expect(coursesTrigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(coursesTrigger);

  await waitFor(() => {
    expect(coursesTrigger).toHaveAttribute('aria-expanded', 'true');
  });

  const allCourses = await screen.findByRole('link', { name: /All Courses/i });
  expect(allCourses).toHaveAttribute('href', MOCK_COURSES_PATH);
  await user.click(allCourses);

  await waitFor(() => {
    expect(getMockPathname()).toBe(MOCK_COURSES_PATH);
  });
}

describe('Student LMS landing Explore → Courses hero (route-driven)', () => {
  beforeEach(() => {
    resetMockPathname(MOCK_EXPLORE_PATH);
  });

  afterEach(() => {
    resetMockPathname(MOCK_EXPLORE_PATH);
  });

  it('changes the landing hero from Explore to Courses when Courses is clicked', async () => {
    const user = userEvent.setup();

    // Arrange — Explore active, authenticated navbar
    render(<StudentLandingExploreCoursesHarness />);

    expect(screen.getByRole('link', { name: 'Explore' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Courses' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Practice' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Jobs' })).toBeVisible();
    expect(screen.getByText('Rahul')).toBeVisible();
    expect(screen.getByText('RK')).toBeVisible();

    // Assert — Explore pre-state
    await expectExploreHeroVisible();
    expectCoursesHeroAbsent();

    // Act — Courses trigger → All Courses link → pathname → hub shell
    await navigateToCoursesHubViaNavbar(user);

    // Assert — Courses post-state
    await expectCoursesHeroVisible();

    // Assert — Explore-only hero content removed (navbar remains)
    expectExploreHeroAbsent();

    /*
     * Active navigation accessibility limitation:
     * StudentLandingNavbar marks the selected item with CSS classes only.
     * It does not set aria-current / aria-selected on the Courses trigger.
     * Pathname + Courses hub hero content are the verified contracts.
     */
    expect(getMockPathname()).toBe(MOCK_COURSES_PATH);
    expect(screen.getByRole('button', { name: 'Courses' })).toBeVisible();
  });

  it('returns to the Explore hero when Explore is clicked', async () => {
    const user = userEvent.setup();

    // Arrange
    render(<StudentLandingExploreCoursesHarness />);
    await expectExploreHeroVisible();

    // Act — Courses dropdown → All Courses
    await navigateToCoursesHubViaNavbar(user);
    await expectCoursesHeroVisible();

    // Act — Explore
    await user.click(screen.getByRole('link', { name: 'Explore' }));
    await waitFor(() => {
      expect(getMockPathname()).toBe(MOCK_EXPLORE_PATH);
    });

    // Assert — Explore restored; Courses-only content gone
    await expectExploreHeroVisible();
    expectCoursesHeroAbsent();
  });
});
