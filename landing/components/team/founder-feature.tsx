import type { PublicTeamMember } from '@/lib/data/team-members';
import { FOUNDER_ANNOTATIONS } from './team-utils';
import { TeamPortrait } from './team-portrait';
import { TeamSocialLinks } from './team-social-links';

function FounderAnnotation({ children, className }: { children: string; className: string }) {
  return (
    <div
      className={`absolute z-10 border border-[#111111] bg-[#f7f6f2] px-3 py-1 text-[11px] font-semibold italic text-[#111111] ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export function FounderFeature({ founders }: { founders: PublicTeamMember[] }) {
  if (!founders.length) return null;

  return (
    <section className="border-b border-[#111111] bg-white">
      {founders.map((founder, index) => {
        const alt = founder.photoAltText ?? `Portrait of ${founder.name}`;
        const bio = founder.fullBio ?? founder.shortBio;
        const isPrimary = index === 0;
        const sectionNumber = String(index + 1).padStart(2, '0');
        const annotations = FOUNDER_ANNOTATIONS[index % FOUNDER_ANNOTATIONS.length];
        const reversed = index % 2 === 1;

        return (
          <article
            key={founder.id}
            className="relative border-b border-[#111111] px-5 py-16 last:border-b-0 md:px-16 md:py-20"
          >
            <p
              className="pointer-events-none absolute left-5 top-6 font-display text-5xl font-bold text-[#ff5f36]/50 md:left-16 md:text-6xl"
              aria-hidden="true"
            >
              {sectionNumber}
            </p>
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 md:grid-cols-12 md:gap-12">
              <div className={`md:col-span-5 ${reversed ? 'md:order-2' : ''}`}>
                <div className="relative">
                  {annotations[0] ? (
                    <FounderAnnotation className="-right-4 top-1/4 rotate-6 max-md:hidden">
                      {annotations[0]}
                    </FounderAnnotation>
                  ) : null}
                  {annotations[1] ? (
                    <FounderAnnotation className="-left-3 bottom-1/4 -rotate-3 max-md:hidden">
                      {annotations[1]}
                    </FounderAnnotation>
                  ) : null}
                  <TeamPortrait
                    photoUrl={founder.photoUrl}
                    alt={alt}
                    name={founder.name}
                    priority={isPrimary}
                    className={`relative overflow-hidden border-2 border-[#111111] bg-[#ebe9e3] ${
                      isPrimary ? 'aspect-[3/4]' : 'aspect-[4/5]'
                    }`}
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                </div>
              </div>

              <div className={`md:col-span-7 md:pt-10 ${reversed ? 'md:order-1' : ''}`}>
                {isPrimary ? (
                  <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-[#111111] md:text-4xl">
                    The person who said, &ldquo;Let&apos;s build our own platform.&rdquo;
                  </h2>
                ) : (
                  <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] md:text-3xl">
                    Another founder keeping the mission honest.
                  </h2>
                )}

                <div className="mt-8 border-t border-[#111111] pt-6">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#ff5f36]">
                    {founder.shortRole ?? 'Founder'}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-bold text-[#111111] md:text-3xl">
                    {founder.name}
                  </h3>
                  <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.12em] text-[#ff5f36]">
                    {founder.role}
                  </p>
                  {founder.location ? (
                    <p className="mt-2 text-sm text-[#666666]">{founder.location}</p>
                  ) : null}
                </div>

                {bio ? (
                  <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed text-[#555555] md:text-lg">
                    {bio}
                  </p>
                ) : null}

                {isPrimary ? (
                  <blockquote className="my-6 border-l-4 border-[#ff5f36] py-1 pl-5">
                    <p className="font-display text-lg italic text-[#111111] md:text-xl">
                      The idea: build something students can actually use.
                    </p>
                  </blockquote>
                ) : null}

                <div className="mt-6">
                  <TeamSocialLinks member={founder} variant="text" />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
