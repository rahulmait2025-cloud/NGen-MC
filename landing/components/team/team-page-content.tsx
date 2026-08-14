import type { PublicTeamMember } from '@/lib/data/team-members';
import type { PublicTeamPageSettings } from '@/lib/data/team-page-settings';
import { FounderFeature } from './founder-feature';
import { TeamMemberGrid } from './team-member-grid';
import { TeamBehindTheScenes, TeamWorkSection } from './team-work-section';
import { UnofficialTeamStats } from './unofficial-team-stats';
import { TeamPageHero } from './team-page-hero';
import {
  CompactTeamEmptyState,
  TeamClosingCta,
  type TeamCtaLinks,
} from './team-page-empty-state';

export function TeamPageContent({
  members,
  settings,
  links,
}: {
  members: PublicTeamMember[];
  settings: PublicTeamPageSettings;
  links: TeamCtaLinks;
}) {
  const founders = members.filter((member) => member.isFounder);
  const regularMembers = members.filter((member) => !member.isFounder);
  const hasMembers = members.length > 0;

  return (
    <main className="bg-[#f7f6f2] text-[#111111]">
      <TeamPageHero members={members} settings={settings} />
      <UnofficialTeamStats />

      {founders.length > 0 ? <FounderFeature founders={founders} /> : null}

      {regularMembers.length > 0 ? (
        <TeamMemberGrid members={regularMembers} />
      ) : hasMembers ? null : (
        <CompactTeamEmptyState />
      )}

      <TeamWorkSection />
      <TeamBehindTheScenes />
      <TeamClosingCta links={links} />
    </main>
  );
}
