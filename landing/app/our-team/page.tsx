import type { Metadata } from 'next';

import { Navbar } from '@/components/landing/layout/Navbar';

import { Footer } from '@/components/landing/layout/Footer';

import { getPublishedTeamMembers } from '@/lib/data/team-members';

import {

  DEFAULT_TEAM_PAGE_SETTINGS,

  getPublicTeamPageSettings,

  type PublicTeamPageSettings,

} from '@/lib/data/team-page-settings';

import { TeamPageContent } from '@/components/team/team-page-content';

import { TeamPageErrorState } from '@/components/team/team-page-empty-state';



const TEAM_LINKS = {

  primary: { href: '/', label: 'Explore NextGen CTO' },

  secondary: { href: '/#program', label: 'See Our Programs' },

  emptyExplore: { href: '/', label: 'Explore NextGen CTO' },

} as const;



export const metadata: Metadata = {

  title: {

    absolute: 'Meet the Team | NextGen CTO',

  },

  description:

    'Meet the people building NextGen CTO’s practical learning, mentorship, and career-readiness platform for students.',

  alternates: {

    canonical: '/our-team',

  },

  openGraph: {

    title: 'Meet the Team | NextGen CTO',

    description:

      'Meet the people building NextGen CTO’s practical learning, mentorship, and career-readiness platform for students.',

    url: '/our-team',

    siteName: 'NextGen CTO',

    type: 'website',

  },

  twitter: {

    card: 'summary_large_image',

    title: 'Meet the Team | NextGen CTO',

    description:

      'Meet the people building NextGen CTO’s practical learning, mentorship, and career-readiness platform for students.',

  },

};



export default async function OurTeamPage() {

  let members: Awaited<ReturnType<typeof getPublishedTeamMembers>> = [];

  let settings: PublicTeamPageSettings = DEFAULT_TEAM_PAGE_SETTINGS;

  let loadError = false;



  try {

    const [membersResult, settingsResult] = await Promise.all([

      getPublishedTeamMembers(),

      getPublicTeamPageSettings(),

    ]);

    members = membersResult;

    settings = settingsResult;

  } catch {

    loadError = true;

  }



  return (

    <div className="relative flex min-h-screen flex-col bg-background font-sans text-foreground">

      <Navbar />

      <div className="flex-grow pt-28">

        {loadError ? (

          <TeamPageErrorState />

        ) : (

          <TeamPageContent members={members} settings={settings} links={TEAM_LINKS} />

        )}

      </div>

      <Footer />

    </div>

  );

}


