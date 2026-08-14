import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentLandingNavbar } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/student-landing-navbar';
import {
  anonymousAuth,
  authenticatedRahulAuth,
  UiProviders,
  type RenderUiAuth,
} from '@/tests/utils/render-ui';

vi.mock('next/navigation', () => ({
  usePathname: () => '/c/nextgen/student',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    className?: string;
  }) {
    return (
      <a href={typeof href === 'string' ? href : '#'} {...rest}>
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

/**
 * ThemeToggle depends on next-themes + matchMedia.
 * Stub preserves the visible theme-control contract (aria-label) without
 * pulling theme-system browser APIs into auth-state UI tests.
 */
vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: function ThemeToggleStub({ className }: { className?: string }) {
    return (
      <button type="button" aria-label="Toggle theme" className={className}>
        Theme
      </button>
    );
  },
}));

function ExploreHeader({ auth }: { auth: RenderUiAuth }) {
  return (
    <UiProviders auth={auth}>
      <StudentLandingNavbar collegeSlug="nextgen" showMenuButton={false} />
    </UiProviders>
  );
}

describe('StudentLandingNavbar (Explore header) auth UI states', () => {
  it('renders the anonymous Explore header', () => {
    // Arrange
    render(<ExploreHeader auth={anonymousAuth()} />);

    // Assert — anonymous UI contract
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeVisible();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeVisible();
    expect(screen.queryByText('Rahul')).not.toBeInTheDocument();
    expect(screen.queryByText('RK')).not.toBeInTheDocument();
  });

  it('renders the authenticated Explore header', () => {
    // Arrange
    render(<ExploreHeader auth={authenticatedRahulAuth()} />);

    // Assert — authenticated UI contract
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.getByText('Rahul')).toBeVisible();
    expect(screen.getByText('RK')).toBeVisible();
    expect(screen.getByRole('button', { name: /rahul/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeVisible();
    expect(screen.queryByText(/authentication error|login failed/i)).not.toBeInTheDocument();
  });

  it('changes the Explore header from anonymous to authenticated state', () => {
    // Arrange — pre-state: anonymous
    const { rerender } = render(<ExploreHeader auth={anonymousAuth()} />);

    // Assert — pre-state UI
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeVisible();
    expect(screen.queryByText('Rahul')).not.toBeInTheDocument();
    expect(screen.queryByText('RK')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rahul/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeVisible();

    // Act — change controlled auth to Rahul / RK / nextgen
    rerender(<ExploreHeader auth={authenticatedRahulAuth()} />);

    // Assert — post-state UI
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.getByText('Rahul')).toBeVisible();
    expect(screen.getByText('RK')).toBeVisible();
    expect(screen.getByRole('button', { name: /rahul/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeVisible();
    expect(screen.queryByText(/authentication error|login failed/i)).not.toBeInTheDocument();
  });

  it('opens the Sign In action when an anonymous user clicks Sign In', async () => {
    const user = userEvent.setup();

    // Arrange
    render(<ExploreHeader auth={anonymousAuth()} />);
    const signIn = screen.getByRole('link', { name: 'Sign In' });

    // Assert — pre-state action target
    expect(signIn).toHaveAttribute('href', '/login');

    // Act — prevent jsdom document navigation while still exercising the click
    signIn.addEventListener('click', (event) => event.preventDefault());
    await user.click(signIn);

    // Assert — Sign In remains the login action (jsdom does not run Next navigation)
    expect(signIn).toBeVisible();
    expect(signIn).toHaveAttribute('href', '/login');
    expect(screen.queryByText('Rahul')).not.toBeInTheDocument();
  });

  /*
   * The landing profile control (UserProfileDropdown triggerVariant="landing")
   * is hover-driven: pointer enter opens the menu and a subsequent click
   * toggles it closed again. Hover is therefore the real open interaction.
   */
  it('opens the profile menu when an authenticated user hovers the profile control', async () => {
    const user = userEvent.setup();

    // Arrange
    render(<ExploreHeader auth={authenticatedRahulAuth()} />);
    const profileControl = screen.getByRole('button', { name: /rahul/i });

    // Assert — pre-state: menu closed
    expect(screen.queryByRole('menuitem', { name: /profile/i })).not.toBeInTheDocument();

    // Act
    await user.hover(profileControl);

    // Assert — post-state: profile menu visible
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /^profile$/i })).toBeVisible();
    expect(within(menu).getByRole('menuitem', { name: /coding stats/i })).toBeVisible();
    expect(within(menu).getByRole('menuitem', { name: /log out/i })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
  });
});
