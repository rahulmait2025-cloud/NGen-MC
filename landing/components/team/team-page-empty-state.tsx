import Link from 'next/link';

export type TeamCtaLinks = {
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  emptyExplore: { href: string; label: string };
};

export function TeamClosingCta({ links }: { links: TeamCtaLinks }) {
  return (
    <section className="border-b-4 border-[#111111] bg-[#ff5f36] px-5 py-16 text-center text-white md:px-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          Small team. Big mission.
          <span className="mt-3 block text-2xl font-semibold italic opacity-95 md:text-3xl">
            An unreasonable number of open tabs.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed opacity-95 md:text-lg">
          We are building the learning and career-readiness experience we wish more students had access to.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={links.primary.href}
            className="inline-flex min-h-11 min-w-[12rem] items-center justify-center border-2 border-[#111111] bg-[#111111] px-8 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-white hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {links.primary.label}
          </Link>
          <Link
            href={links.secondary.href}
            className="inline-flex min-h-11 min-w-[12rem] items-center justify-center border-2 border-white px-8 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {links.secondary.label}
          </Link>
        </div>
        <p className="mt-8 text-sm italic opacity-90" aria-hidden="true">
          Good ideas and good chai are always welcome.
        </p>
      </div>
    </section>
  );
}

export function CompactTeamEmptyState() {
  return (
    <section className="border-b border-[#111111] bg-[#f7f6f2] px-5 py-14 md:px-16 md:py-16">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 border border-[#111111] bg-white p-8 md:flex-row md:items-center md:gap-10 md:p-10">
        <p className="font-display text-5xl font-bold text-[#ff5f36]/60 md:text-6xl" aria-hidden="true">
          00
        </p>
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] md:text-3xl">
            The team is currently camera shy.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#555555] md:text-base">
            Our humans are preparing their best profile photos. Please check again soon.
          </p>
          <p
            className="mt-5 inline-block -rotate-1 border border-[#111111] bg-[#f7f6f2] px-3 py-1 text-[11px] font-semibold italic text-[#ff5f36]"
            aria-hidden="true"
          >
            Camera shy mode: active
          </p>
        </div>
        <div className="flex shrink-0 gap-2" aria-hidden="true">
          {['NG', 'CTO'].map((label) => (
            <div
              key={label}
              className="flex size-16 items-center justify-center rounded-full border border-[#111111] bg-[#ebe9e3] font-display text-sm font-bold text-[#737373] md:size-20"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TeamPageErrorState() {
  return (
    <section className="border-b border-[#111111] bg-[#f7f6f2] px-5 py-24 md:px-16">
      <div className="mx-auto max-w-2xl border border-[#111111] bg-white p-10 text-center">
        <h1 className="font-display text-2xl font-bold text-[#111111] md:text-3xl">Meet the Team</h1>
        <p className="mt-4 text-sm text-[#555555] md:text-base">
          We could not load the team right now. Please try again shortly.
        </p>
      </div>
    </section>
  );
}
