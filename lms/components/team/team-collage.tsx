import Image from 'next/image';
import type { PublicTeamMember } from '@/lib/data/team-members';
import { cn } from '@/lib/utils';
import { pickCollageMembers } from './team-utils';
import { TeamPortrait } from './team-portrait';

function CollageLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={cn(
        'absolute z-20 border border-[#111111] px-3 py-1.5 text-xs font-semibold leading-snug tracking-wide text-[#111111] dark:border-[#3a3d42] dark:text-[#e8e5df]',
        className
      )}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

function CollageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border border-[#111111] bg-[#f7f6f2] p-3 shadow-[6px_6px_0_0_#ff5f36] md:p-4 dark:border-[#2a2d32] dark:bg-[#14161a] dark:shadow-[6px_6px_0_0_#ff5f36]/50">
      {children}
    </div>
  );
}

export function TeamHeroPhoto({
  imageUrl,
  alt,
}: {
  imageUrl: string;
  alt: string;
}) {
  return (
    <CollageFrame>
      <CollageLabel className="-left-2 -top-3 -rotate-6 bg-[#111111] text-white dark:bg-[#e8e5df] dark:text-[#0e1013]">
        Team status: online-ish
      </CollageLabel>
      <CollageLabel className="-right-3 bottom-8 rotate-3 bg-[#ff5f36] text-white max-md:hidden">
        <span className="mr-2 inline-block size-2 rounded-full bg-white align-middle" />
        Chai status: critical
      </CollageLabel>
      <div className="relative aspect-[5/4] overflow-hidden border border-[#111111] bg-[#ebe9e3] dark:border-[#2a2d32] dark:bg-[#1e2024]">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
      </div>
    </CollageFrame>
  );
}

function SingleCollage({
  member,
  primaryLabel,
}: {
  member: PublicTeamMember;
  primaryLabel: string;
}) {
  return (
    <CollageFrame>
      <CollageLabel className="-left-2 -top-3 -rotate-6 bg-[#ff5f36] text-white">
        {primaryLabel}
      </CollageLabel>
      <TeamPortrait
        photoUrl={member.photoUrl}
        alt={member.photoAltText ?? `Portrait of ${member.name}`}
        name={member.name}
        priority
        className="relative aspect-[4/5] overflow-hidden border border-[#111111] bg-[#ebe9e3] dark:border-[#2a2d32] dark:bg-[#1e2024]"
        sizes="(max-width: 1024px) 100vw, 40vw"
      />
    </CollageFrame>
  );
}

function DualCollage({
  members,
  primaryLabel,
}: {
  members: PublicTeamMember[];
  primaryLabel: string;
}) {
  const [large, small] = members;
  return (
    <CollageFrame>
      <CollageLabel className="-left-2 -top-3 -rotate-6 bg-[#ff5f36] text-white">
        {primaryLabel}
      </CollageLabel>
      <div className="grid grid-cols-2 gap-2">
        <TeamPortrait
          photoUrl={large.photoUrl}
          alt={large.photoAltText ?? `Portrait of ${large.name}`}
          name={large.name}
          priority
          className="relative col-span-1 row-span-2 aspect-[3/4] overflow-hidden border border-[#111111] bg-[#ebe9e3] dark:border-[#2a2d32] dark:bg-[#1e2024]"
        />
        <TeamPortrait
          photoUrl={small.photoUrl}
          alt={small.photoAltText ?? `Portrait of ${small.name}`}
          name={small.name}
          className="relative aspect-square overflow-hidden border border-[#111111] bg-[#ebe9e3] dark:border-[#2a2d32] dark:bg-[#1e2024]"
          sizes="25vw"
        />
        <div
          className="flex aspect-square items-center justify-center border border-dashed border-[#111111] bg-[#efede7] text-center font-display text-[10px] font-bold uppercase tracking-[0.16em] text-[#737373] dark:border-[#3a3d42] dark:bg-[#1e2024] dark:text-[#7a7872]"
          aria-hidden="true"
        >
          NextGen CTO
        </div>
      </div>
    </CollageFrame>
  );
}

function FullCollage({
  members,
  primaryLabel,
}: {
  members: PublicTeamMember[];
  primaryLabel: string;
}) {
  const [primary, second, third] = members;
  return (
    <CollageFrame>
      <CollageLabel className="-left-2 -top-3 -rotate-6 bg-[#ff5f36] text-white">
        {primaryLabel}
      </CollageLabel>
      <CollageLabel className="-right-3 bottom-10 rotate-3 bg-[#f7f6f2] max-md:hidden dark:bg-[#1a1d22]">
        <span className="mr-2 inline-block size-2 rounded-full bg-[#ff5f36] align-middle" />
        Chai status: critical
      </CollageLabel>
      <CollageLabel className="-left-3 top-1/2 -rotate-12 bg-[#f7f6f2] max-md:hidden dark:bg-[#1a1d22]">
        Probably debugging
      </CollageLabel>
      <div className="grid grid-cols-2 grid-rows-2 gap-2 border border-[#111111] bg-[#e2e2e2] p-2 dark:border-[#2a2d32] dark:bg-[#1a1d22]">
        <TeamPortrait
          photoUrl={primary.photoUrl}
          alt={primary.photoAltText ?? `Portrait of ${primary.name}`}
          name={primary.name}
          priority
          className="relative col-span-1 row-span-2 overflow-hidden border border-[#111111] bg-[#ebe9e3]"
          sizes="(max-width: 1024px) 50vw, 25vw"
        />
        <TeamPortrait
          photoUrl={second.photoUrl}
          alt={second.photoAltText ?? `Portrait of ${second.name}`}
          name={second.name}
          className="relative overflow-hidden border border-[#111111] bg-[#ebe9e3]"
          sizes="25vw"
        />
        <TeamPortrait
          photoUrl={third.photoUrl}
          alt={third.photoAltText ?? `Portrait of ${third.name}`}
          name={third.name}
          className="relative overflow-hidden border border-[#111111] bg-[#ebe9e3]"
          sizes="25vw"
        />
      </div>
    </CollageFrame>
  );
}

export function TeamCollageFallback() {
  const placeholders = ['NG', 'CTO', '?', '+'];
  return (
    <CollageFrame>
      <CollageLabel className="-left-2 -top-3 -rotate-6 bg-[#ff5f36] text-white">
        Team photo pending
      </CollageLabel>
      <CollageLabel className="-right-3 bottom-10 rotate-3 bg-[#f7f6f2] max-md:hidden dark:bg-[#1a1d22]">
        <span className="mr-2 inline-block size-2 rounded-full bg-[#ff5f36] align-middle" />
        Camera shy mode: active
      </CollageLabel>
      <div className="border border-[#111111] bg-[#efede7] p-5 md:p-8 dark:border-[#2a2d32] dark:bg-[#1e2024]">
        <p className="font-display text-2xl font-bold tracking-tight text-[#111111] md:text-3xl dark:text-[#e8e5df]">
          NEXTGEN CTO
        </p>
        <p className="mt-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373] dark:text-[#7a7872]">
          Team photo pending
        </p>
        <div className="mt-6 grid grid-cols-4 gap-2" aria-hidden="true">
          {placeholders.map((label, index) => (
            <div
              key={label + index}
              className="flex aspect-square items-center justify-center border border-[#111111] bg-[#e6e4de] font-display text-sm font-bold text-[#737373] dark:border-[#3a3d42] dark:bg-[#252830] dark:text-[#7a7872]"
            >
              {label}
            </div>
          ))}
        </div>
        <p
          className="mt-6 inline-block -rotate-1 border border-[#111111] bg-[#f7f6f2] px-3 py-1 text-[11px] font-semibold italic text-[#ff5f36] dark:border-[#3a3d42] dark:bg-[#1a1d22]"
          aria-hidden="true"
        >
          Our humans are updating their profile photos
        </p>
      </div>
    </CollageFrame>
  );
}

export function TeamCollage({ members }: { members: PublicTeamMember[] }) {
  const collageMembers = pickCollageMembers(members);
  if (!collageMembers.length) return <TeamCollageFallback />;

  if (collageMembers.length === 1) {
    const [only] = collageMembers;
    const primaryLabel = only.isFounder
      ? 'Founder mode: always on'
      : 'The people keeping the tabs open';
    return <SingleCollage member={only} primaryLabel={primaryLabel} />;
  }

  const primaryLabel = 'The people keeping the tabs open';
  if (collageMembers.length === 2) {
    return <DualCollage members={collageMembers} primaryLabel={primaryLabel} />;
  }
  return <FullCollage members={collageMembers} primaryLabel={primaryLabel} />;
}
