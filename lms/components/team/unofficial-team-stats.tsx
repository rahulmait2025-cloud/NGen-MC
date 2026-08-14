const STATS = [
  'OPEN TABS: 46',
  'CHAI CONSUMED: CONFIDENTIAL',
  'BUGS MARKED “CANNOT REPRODUCE”: 12',
  'PRODUCTION CONFIDENCE: OPTIMISTIC',
] as const;

function StatisticsGroup({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      className="team-stats-marquee__group"
      aria-hidden={ariaHidden ? 'true' : undefined}
    >
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff5f36]">
        Unofficial team statistics
      </span>
      {STATS.map((stat) => (
        <span
          key={stat}
          className="flex items-center gap-3 font-display text-xs font-bold uppercase tracking-[0.08em] md:text-sm"
        >
          <span className="text-[#ff5f36]" aria-hidden="true">
            ◆
          </span>
          {stat}
        </span>
      ))}
    </div>
  );
}

export function UnofficialTeamStats() {
  return (
    <section
      className="team-stats-marquee border-y border-[#111111] bg-[#090909] text-white"
      aria-label="Unofficial team statistics"
    >
      <div className="team-stats-marquee__viewport">
        <div className="team-stats-marquee__track">
          <StatisticsGroup />
          <StatisticsGroup ariaHidden />
        </div>
      </div>
    </section>
  );
}
