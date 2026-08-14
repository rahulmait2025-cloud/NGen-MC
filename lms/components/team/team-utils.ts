import type { PublicTeamMember } from '@/lib/data/team-members';

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function pickCollageMembers(members: PublicTeamMember[]): PublicTeamMember[] {
  if (!members.length) return [];

  const founders = members.filter((m) => m.isFounder);
  const others = members.filter((m) => !m.isFounder);

  const primary = founders[0] ?? members[0];
  const rest = [
    ...founders.slice(1),
    ...others.filter((m) => m.id !== primary.id),
  ];

  return [primary, ...rest.slice(0, 2)];
}

export type TeamCardVariant = 'wide' | 'tall' | 'portrait' | 'circle';

export function getTeamCardVariant(index: number, member: PublicTeamMember): TeamCardVariant {
  if (member.isFeatured && index === 0) return 'wide';
  const cycle: TeamCardVariant[] = ['wide', 'tall', 'portrait', 'wide', 'circle'];
  return cycle[index % cycle.length];
}

export const FOUNDER_ANNOTATIONS = [
  ['Started all this', 'Still reviewing every feature'],
  ['Says “one final improvement” frequently', 'Probably in a roadmap doc'],
] as const;
