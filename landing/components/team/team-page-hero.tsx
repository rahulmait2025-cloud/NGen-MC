import type { PublicTeamMember } from '@/lib/data/team-members';
import type { PublicTeamPageSettings } from '@/lib/data/team-page-settings';
import { TeamCollage, TeamHeroPhoto } from './team-collage';

export function TeamPageHero({
  members,
  settings,
}: {
  members: PublicTeamMember[];
  settings: PublicTeamPageSettings;
}) {
  const hasGroupPhoto = Boolean(settings.heroImageUrl);

  return (
    <section className="border-b border-[#111111] bg-[#f7f6f2] px-5 py-16 md:px-16 md:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#737373]">
            The humans behind NextGen CTO
          </p>
          <h1 className="relative mt-5 max-w-2xl text-balance font-display text-[2.625rem] font-bold leading-[1.02] tracking-[-0.035em] text-[#111111] sm:text-[3.25rem] lg:text-6xl">
            {settings.heroTitle}
          </h1>
          {settings.heroAnnotation ? (
            <span
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold italic text-[#ff5f36] md:text-base"
              aria-hidden="true"
            >
              <span className="inline-block size-2 rounded-full bg-[#ff5f36]" />
              {settings.heroAnnotation}
            </span>
          ) : null}
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#555555] md:text-lg">
            {settings.heroDescription}
          </p>
        </div>
        <div className="lg:col-span-5">
          {hasGroupPhoto && settings.heroImageUrl ? (
            <TeamHeroPhoto
              imageUrl={settings.heroImageUrl}
              alt={settings.heroImageAltText ?? 'The NextGen CTO team'}
            />
          ) : (
            <TeamCollage members={members} />
          )}
        </div>
      </div>
    </section>
  );
}
