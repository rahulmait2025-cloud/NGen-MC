import { ArrowUpRight } from 'lucide-react';
import type { PublicTeamMember } from '@/lib/data/team-members';
import { getTeamCardVariant, type TeamCardVariant } from './team-utils';
import { TeamPortrait } from './team-portrait';
import { TeamSocialLinks } from './team-social-links';

function gridSpanClass(variant: TeamCardVariant): string {
  switch (variant) {
    case 'wide':
      return 'md:col-span-2';
    case 'tall':
    case 'portrait':
    case 'circle':
    default:
      return 'md:col-span-1';
  }
}

function TeamMemberCard({
  member,
  index,
  variant,
}: {
  member: PublicTeamMember;
  index: number;
  variant: TeamCardVariant;
}) {
  const alt = member.photoAltText ?? `Portrait of ${member.name}`;
  const bio = member.shortBio ?? member.fullBio;
  const sequence = String(index + 2).padStart(2, '0');
  const isWide = variant === 'wide';
  const isCircle = variant === 'circle';

  return (
    <article
      className={`group relative border-b border-r border-[#111111] bg-white p-5 transition-colors hover:bg-[#f7f6f2] md:p-6 ${gridSpanClass(variant)}`}
    >
      <p
        className="absolute right-4 top-4 font-display text-2xl font-bold text-[#ff5f36]/60 md:right-6 md:top-6"
        aria-hidden="true"
      >
        {sequence}
      </p>

      <div
        className={
          isWide
            ? 'flex flex-col gap-6 md:flex-row md:items-start'
            : isCircle
              ? 'flex flex-col items-start gap-4 sm:flex-row sm:items-center'
              : 'flex flex-col'
        }
      >
        <TeamPortrait
          photoUrl={member.photoUrl}
          alt={alt}
          name={member.name}
          className={`relative shrink-0 overflow-hidden border border-[#111111] bg-[#ebe9e3] ${
            isWide
              ? 'aspect-square w-full md:w-1/2'
              : isCircle
                ? 'size-28 rounded-full md:size-32'
                : 'aspect-[4/5] w-full'
          }`}
          imageClassName="object-cover object-[center_20%] transition-transform duration-300 group-hover:scale-[1.01] motion-reduce:transition-none"
          sizes={isWide ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
        />

        <div className={isWide || isCircle ? 'min-w-0 flex-1' : 'mt-5'}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {member.shortRole ? (
              <span className="border border-[#111111] bg-[#111111] px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                {member.shortRole}
              </span>
            ) : null}
            {member.isFeatured ? (
              <span className="border border-[#ff5f36] bg-[#ff5f36]/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff5f36]">
                Featured
              </span>
            ) : null}
            {member.location ? (
              <span className="border border-[#111111] px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[#111111]">
                {member.location}
              </span>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#111111] md:text-2xl">
                {member.name}
              </h3>
              <p className="mt-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#ff5f36]">
                {member.role}
              </p>
            </div>
            <ArrowUpRight
              className="size-5 shrink-0 text-[#737373] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#ff5f36] motion-reduce:transition-none max-md:hidden"
              aria-hidden="true"
            />
          </div>

          {bio ? (
            <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-[#555555] md:text-base">
              {bio}
            </p>
          ) : null}

          <div className="mt-5">
            <TeamSocialLinks member={member} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function TeamMemberGrid({ members }: { members: PublicTeamMember[] }) {
  if (!members.length) return null;

  return (
    <section className="border-b border-[#111111] bg-[#f7f6f2] px-5 py-16 md:px-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="border-b border-[#111111] pb-5">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111] md:text-5xl">
            The people keeping the tabs open
          </h2>
          <p className="mt-3 text-base text-[#555555] md:text-lg">
            Different roles. Same mission. Too many browser tabs.
          </p>
        </div>

        <div className="grid grid-cols-1 border-l border-t border-[#111111] md:grid-cols-3">
          {members.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              index={index}
              variant={getTeamCardVariant(index, member)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
