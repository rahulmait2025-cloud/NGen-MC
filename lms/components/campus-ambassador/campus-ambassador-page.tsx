'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CampusAmbassadorPageState } from '@/lib/services/campus-ambassador';
import { ExploreStyleShell } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/explore-style-shell';
import { StudentAuthProvider } from '@/providers/student-auth-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AmbassadorDashboardState } from './ambassador-dashboard-state';
import { PreJoinLandingState } from './pre-join-landing-state';

interface CampusAmbassadorPageProps {
  initialState: CampusAmbassadorPageState;
  userEmail: string | null;
  userId: string | null;
  userFullName: string | null;
  collegeSlug: string;
}

function isAmbassadorReadyState(state: CampusAmbassadorPageState): boolean {
  return Boolean(state.isAmbassador && state.ambassador && state.coupon?.code);
}

function scrollLandingShellToTop() {
  const shell = document.querySelector('.landing-shell');
  if (shell instanceof HTMLElement) {
    shell.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollElementIntoLandingShell(element: HTMLElement) {
  const shell = document.querySelector('.landing-shell');
  if (!(shell instanceof HTMLElement)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const top =
    element.getBoundingClientRect().top -
    shell.getBoundingClientRect().top +
    shell.scrollTop -
    88;

  shell.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

export function CampusAmbassadorPage({
  initialState,
  userEmail,
  userId,
  userFullName,
  collegeSlug,
}: CampusAmbassadorPageProps) {
  const [state, setState] = useState(initialState);
  const [syncedInitialState, setSyncedInitialState] = useState(initialState);
  const [applyOpen, setApplyOpen] = useState(false);
  const couponSectionRef = useRef<HTMLDivElement>(null);

  if (initialState !== syncedInitialState) {
    setSyncedInitialState(initialState);
    const prevReady = isAmbassadorReadyState(state);
    const nextReady = isAmbassadorReadyState(initialState);
    if (!(prevReady && !nextReady)) {
      setState(initialState);
    }
  }

  const handleApplicationSuccess = useCallback((next: CampusAmbassadorPageState) => {
    setApplyOpen(false);
    setState(next);
    scrollLandingShellToTop();
  }, []);

  const scrollToCoupon = useCallback(() => {
    if (couponSectionRef.current) {
      scrollElementIntoLandingShell(couponSectionRef.current);
    }
  }, []);

  const openApply = useCallback(() => {
    if (!state.isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    setApplyOpen(true);
  }, [state.isAuthenticated]);

  const showDashboard = isAmbassadorReadyState(state);

  const studentUser = useMemo(() => {
    if (!state.isAuthenticated || !userId) return null;
    return {
      id: userId,
      email: userEmail,
      fullName: state.application?.full_name ?? userFullName,
      isActive: true,
    };
  }, [state.isAuthenticated, state.application?.full_name, userEmail, userFullName, userId]);

  const navbarCta = useMemo(
    () =>
      showDashboard
        ? { label: 'My Coupon', onClick: scrollToCoupon }
        : { label: 'Apply Now', onClick: openApply },
    [openApply, scrollToCoupon, showDashboard],
  );

  return (
    <TooltipProvider>
      <StudentAuthProvider initialUser={studentUser}>
        <ExploreStyleShell
          collegeSlug={collegeSlug}
          navbarCta={navbarCta}
          shellClassName="campus-campaign"
        >
          <main>
            {showDashboard ? (
              <AmbassadorDashboardState
                state={state}
                onStateChange={setState}
                couponSectionRef={couponSectionRef}
              />
            ) : (
              <PreJoinLandingState
                state={state}
                userEmail={userEmail}
                applyOpen={applyOpen}
                onApplyOpenChange={setApplyOpen}
                onApplicationSuccess={handleApplicationSuccess}
              />
            )}
          </main>
        </ExploreStyleShell>
      </StudentAuthProvider>
    </TooltipProvider>
  );
}
