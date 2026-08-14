import { Github, Code, BarChart2, Terminal, Linkedin, ExternalLink, FileText, Globe } from 'lucide-react';
import { PublicCodingPlatformLinks } from '@/types/student-stats';

interface PublicPlatformLinksProps {
  links: PublicCodingPlatformLinks;
}

export function PublicPlatformLinks({ links }: PublicPlatformLinksProps) {
  const items = [
    {
      key: 'github',
      label: links.github.username ? `GitHub (@${links.github.username})` : 'GitHub',
      url: links.github.profileUrl,
      icon: Github,
      color: 'hover:border-zinc-500 hover:bg-zinc-500/10 hover:text-foreground',
      badgeColor: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    },
    {
      key: 'leetcode',
      label: links.leetcode.username ? `LeetCode (@${links.leetcode.username})` : 'LeetCode',
      url: links.leetcode.profileUrl,
      icon: Code,
      color: 'hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      key: 'codeforces',
      label: links.codeforces.handle ? `Codeforces (@${links.codeforces.handle})` : 'Codeforces',
      url: links.codeforces.profileUrl,
      icon: BarChart2,
      color: 'hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      key: 'gfg',
      label: links.gfg.username ? `GeeksforGeeks (@${links.gfg.username})` : 'GeeksforGeeks',
      url: links.gfg.profileUrl,
      icon: Terminal,
      color: 'hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      key: 'linkedin',
      label: 'LinkedIn Profile',
      url: links.linkedinUrl,
      icon: Linkedin,
      color: 'hover:border-sky-500 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400',
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    },
    {
      key: 'portfolio',
      label: 'Personal Portfolio',
      url: links.portfolioUrl,
      icon: Globe,
      color: 'hover:border-primary hover:bg-primary/10 hover:text-primary',
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      key: 'resume',
      label: 'View Student Résumé',
      url: links.resumeUrl,
      icon: FileText,
      color: 'hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
  ].filter((item) => Boolean(item.url));

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
          Connected Profiles & Links
        </h2>
        <span className="text-[11px] font-semibold text-muted-foreground/80">
          {items.length} {items.length === 1 ? 'Link' : 'Links'} Available
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              href={item.url!}
              target="_blank"
              rel="noopener noreferrer"
              className={`group inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border/80 text-xs font-semibold text-foreground transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 ${item.color}`}
            >
              <span className={`p-1 rounded-lg border transition-colors ${item.badgeColor}`}>
                <Icon className="size-3.5 shrink-0" />
              </span>
              <span className="truncate max-w-[180px] sm:max-w-xs">{item.label}</span>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
