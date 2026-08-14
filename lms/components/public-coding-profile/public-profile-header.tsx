import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Globe, Github, Code, BarChart2, Terminal } from 'lucide-react';
import { CopyPublicProfileLinkButton } from './copy-public-profile-link-button';
import { PublicCodingPlatformLinks } from '@/types/student-stats';

interface PublicProfileHeaderProps {
  studentName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  platformLinks?: PublicCodingPlatformLinks;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'S';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PublicProfileHeader({
  studentName,
  username,
  avatarUrl,
  bio,
  platformLinks,
}: PublicProfileHeaderProps) {
  const initials = getInitials(studentName);

  const activePlatforms = [
    platformLinks?.github.username ? { name: 'GitHub', icon: Github, color: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30', dot: 'bg-zinc-500 dark:bg-zinc-400' } : null,
    platformLinks?.leetcode.username ? { name: 'LeetCode', icon: Code, color: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30', dot: 'bg-amber-500' } : null,
    platformLinks?.codeforces.handle ? { name: 'Codeforces', icon: BarChart2, color: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30', dot: 'bg-blue-500' } : null,
    platformLinks?.gfg.username ? { name: 'GeeksforGeeks', icon: Terminal, color: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500' } : null,
  ].filter(Boolean) as { name: string; icon: React.ElementType; color: string; dot: string }[];

  return (
    <div className="relative group p-6 sm:p-8 bg-card border border-border/80 rounded-3xl shadow-xs transition-all hover:shadow-md">
      {/* Decorative ambient background accent */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-tr-3xl pointer-events-none -z-0" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0 flex-1">
          <div className="relative shrink-0 group/avatar">
            <Avatar className="size-20 sm:size-24 border-2 border-background ring-2 ring-primary/20 shadow-sm transition-transform duration-200 group-hover/avatar:scale-105">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={`${studentName}'s avatar`} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xl sm:text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs text-xs font-bold ring-2 ring-background">
              ✓
            </div>
          </div>

          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {studentName}
              </h1>
              <Badge variant="secondary" className="gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Globe className="size-3 text-primary animate-pulse" />
                Verified Student Profile
              </Badge>
            </div>

            <p className="font-mono text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <span>@{username}</span>
            </p>

            {bio ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-w-2xl pt-0.5">
                {bio}
              </p>
            ) : null}

            {/* Connected Platform Status Badges */}
            {activePlatforms.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {activePlatforms.map((plat) => {
                  const Icon = plat.icon;
                  return (
                    <div
                      key={plat.name}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${plat.color} transition-transform hover:scale-105`}
                    >
                      <span className={`size-1.5 rounded-full ${plat.dot} animate-pulse`} />
                      <Icon className="size-3.5" />
                      <span>{plat.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Share Button in Header */}
        <div className="shrink-0 pt-2 sm:pt-0">
          <CopyPublicProfileLinkButton username={username} variant="default" size="default" className="shadow-sm" />
        </div>
      </div>
    </div>
  );
}
