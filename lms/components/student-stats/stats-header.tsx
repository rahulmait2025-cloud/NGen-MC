'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw,
  Settings,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
  AlertCircle,
  Link2Off,
  Unplug,
  Code,
  BarChart2,
  Terminal,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PlatformConnectionStatus, PlatformProfileInputs } from '@/types/student-stats';
import { CopyPublicProfileLinkButton } from '@/components/public-coding-profile/copy-public-profile-link-button';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'S';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
import {
  validateAndSaveStudentPlatformProfiles,
  syncCurrentStudentCodingStats,
} from '@/lib/actions/coding-stats-actions';

interface StatsHeaderProps {
  studentName: string;
  studentRole?: string;
  bio?: string | null;
  avatarUrl?: string;
  connectionStatus: PlatformConnectionStatus;
  username?: string | null;
  usernameSet?: boolean;
  onRefreshStats?: () => void;
  onManualSyncStart?: () => void;
  onManualSyncEnd?: () => void;
  externalImportProgress?: string | null;
}

export function StatsHeader({
  studentName,
  avatarUrl,
  connectionStatus,
  username,
  usernameSet,
  onRefreshStats,
  onManualSyncStart,
  onManualSyncEnd,
  externalImportProgress,
}: StatsHeaderProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingProfiles, setSavingProfiles] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  useEffect(() => {
    if (isEditOpen || isDisconnectOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isEditOpen, isDisconnectOpen]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const triggerRefresh = () => {
    if (onRefreshStats) {
      onRefreshStats();
    } else {
      router.refresh();
    }
  };

  const [handles, setHandles] = useState<PlatformProfileInputs>({
    bio: '',
    githubUrl: connectionStatus.github.isConnected ? (connectionStatus.github.profileUrl || '') : '',
    leetcodeUsername: connectionStatus.leetcode.username || '',
    codeforcesHandle: connectionStatus.codeforces.handle || '',
    gfgUsername: connectionStatus.gfg.username || '',
    linkedinUrl: connectionStatus.linkedin?.url || '',
    portfolioUrl: connectionStatus.portfolio?.url || '',
  });

  useEffect(() => {
    setHandles({
      bio: '',
      githubUrl: connectionStatus.github.isConnected ? (connectionStatus.github.profileUrl || '') : '',
      leetcodeUsername: connectionStatus.leetcode.username || '',
      codeforcesHandle: connectionStatus.codeforces.handle || '',
      gfgUsername: connectionStatus.gfg.username || '',
      linkedinUrl: connectionStatus.linkedin?.url || '',
      portfolioUrl: connectionStatus.portfolio?.url || '',
    });
  }, [connectionStatus]);

  const validateUsername = (value: string, platform: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const maxLen = platform === 'GeeksforGeeks' ? 150 : 50;
    if (trimmed.length > maxLen) return `${platform} username or URL must be ${maxLen} characters or fewer.`;
    if (/[<>"'`;{}\\]/.test(trimmed)) return `${platform} username contains invalid characters.`;
    return null;
  };

  const validateUrl = (value: string, label: string, expectedHost?: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed);
      if (!['http:', 'https:'].includes(url.protocol)) return `${label} URL must start with http or https.`;
      if (expectedHost && !url.hostname.replace(/^www\./, '').endsWith(expectedHost)) return `${label} URL should be on ${expectedHost}.`;
      return null;
    } catch {
      return `Enter a valid ${label.toLowerCase()} URL.`;
    }
  };

  const validateField = (name: string, value: string): string | null => {
    if (name === 'leetcodeUsername') return validateUsername(value, 'LeetCode');
    if (name === 'codeforcesHandle') return validateUsername(value, 'Codeforces');
    if (name === 'gfgUsername') return validateUsername(value, 'GeeksforGeeks');
    if (name === 'linkedinUrl') return validateUrl(value, 'LinkedIn', 'linkedin.com');
    if (name === 'portfolioUrl') return validateUrl(value, 'Portfolio');
    return null;
  };

  const updateHandle = (name: keyof PlatformProfileInputs, value: string) => {
    setHandles((prev) => ({ ...prev, [name]: value }));
    if (touchedFields[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const clearHandle = (name: keyof PlatformProfileInputs) => {
    setHandles((prev) => ({ ...prev, [name]: '' }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
  };

  const markTouched = (name: keyof PlatformProfileInputs) => {
    const value = handles[name] || '';
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateAllFields = () => {
    const fields: (keyof PlatformProfileInputs)[] = [
      'leetcodeUsername',
      'codeforcesHandle',
      'gfgUsername',
      'linkedinUrl',
      'portfolioUrl',
    ];
    const nextErrors = fields.reduce<Record<string, string | null>>((acc, field) => {
      acc[field] = validateField(field, handles[field] || '');
      return acc;
    }, {});

    setTouchedFields((prev) => ({
      ...prev,
      leetcodeUsername: true,
      codeforcesHandle: true,
      gfgUsername: true,
      linkedinUrl: true,
      portfolioUrl: true,
    }));
    setFieldErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const hasValidationErrors = Object.values(fieldErrors).some(Boolean);

  const unlinkButtonClass = 'inline-flex items-center gap-1.5 rounded-md border border-destructive/25 bg-destructive/8 px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/12 hover:text-destructive cursor-pointer';
  const clearLinkButtonClass = 'inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/25 hover:bg-destructive/8 hover:text-destructive cursor-pointer';

  const handleSyncClick = async () => {
    if (syncing) {
      toast.info('A coding stats sync is already in progress.');
      return;
    }

    setSyncing(true);
    onManualSyncStart?.();
    try {
      const res = await syncCurrentStudentCodingStats();
      if (res.statusSummary === 'sync_cooldown') {
        toast.info('Coding history is already up to date!');
      } else if (res.statusSummary === 'sync_already_running') {
        toast.info('A coding stats sync is already in progress.');
      } else if (res.success && !res.hasErrors) {
        toast.success('Coding stats synced successfully.');
      } else if (res.success && res.hasErrors) {
        toast.warning('Coding stats synced with some platform errors.');
      } else {
        toast.error('Coding stats could not be synced. Please try again.');
      }
      triggerRefresh();
    } catch {
      toast.error('Coding stats could not be synced. Please try again.');
    } finally {
      setSyncing(false);
      onManualSyncEnd?.();
    }
  };

  const handleDisconnectConfirm = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/github/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      setIsDisconnectOpen(false);
      setImportProgress(null);
      toast.success('GitHub account disconnected.');
      triggerRefresh();
    } catch {
      toast.error('Failed to disconnect GitHub account.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveHandles = async () => {
    if (!validateAllFields()) {
      return;
    }

    setSavingProfiles(true);
    setImportProgress('Validating account…');

    try {
      const res = await validateAndSaveStudentPlatformProfiles(handles);

      if (!res.success) {
        toast.error(res.validationError || 'Profile validation failed.');
        setSavingProfiles(false);
        setImportProgress(null);
        return;
      }

      if (res.alreadyLinkedPlatforms && res.alreadyLinkedPlatforms.length > 0 && (!res.changedPlatforms || res.changedPlatforms.length === 0) && (!res.unlinkedPlatforms || res.unlinkedPlatforms.length === 0)) {
        toast.info('This platform profile is already linked.');
      }

      if (res.unlinkedPlatforms && res.unlinkedPlatforms.length > 0) {
        setHandles((prev) => {
          const next = { ...prev };
          for (const plat of res.unlinkedPlatforms!) {
            if (plat === 'leetcode') next.leetcodeUsername = '';
            else if (plat === 'codeforces') next.codeforcesHandle = '';
            else if (plat === 'gfg') next.gfgUsername = '';
            else if (plat === 'github') next.githubUrl = '';
          }
          return next;
        });
      }

      setSavingProfiles(false);

      if (res.changedPlatforms && res.changedPlatforms.length > 0) {
        for (const plat of res.changedPlatforms) {
          if (plat === 'github') toast.success('GitHub account connected successfully. Importing coding history…');
          else if (plat === 'leetcode') toast.success('LeetCode profile linked successfully. Importing coding history…');
          else if (plat === 'codeforces') toast.success('Codeforces profile linked successfully. Importing coding history…');
          else if (plat === 'gfg') toast.success('GeeksforGeeks profile linked successfully. Importing coding history…');
        }
      }

      if (res.unlinkedPlatforms && res.unlinkedPlatforms.length > 0) {
        toast.success('Platform unlinked and coding activity cleared.');
      }

      setImportProgress(null);
      triggerRefresh();
      setIsEditOpen(false);
    } catch {
      toast.error('Failed to save platform handles.');
      setSavingProfiles(false);
      setImportProgress(null);
    }
  };

  const initials = getInitials(studentName);

  const activePlatforms = [
    connectionStatus.github.isConnected ? { name: 'GitHub', icon: Github, color: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30', dot: 'bg-zinc-500 dark:bg-zinc-400' } : null,
    connectionStatus.leetcode.username ? { name: 'LeetCode', icon: Code, color: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30', dot: 'bg-amber-500' } : null,
    connectionStatus.codeforces.handle ? { name: 'Codeforces', icon: BarChart2, color: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30', dot: 'bg-blue-500' } : null,
    connectionStatus.gfg.username ? { name: 'GeeksforGeeks', icon: Terminal, color: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500' } : null,
  ].filter(Boolean) as { name: string; icon: React.ElementType; color: string; dot: string }[];

  const platformLinksList = [
    connectionStatus.github.isConnected && connectionStatus.github.profileUrl ? {
      key: 'github',
      label: connectionStatus.github.username ? `GitHub (@${connectionStatus.github.username})` : 'GitHub',
      url: connectionStatus.github.profileUrl,
      icon: Github,
      color: 'hover:border-zinc-500 hover:bg-zinc-500/10 hover:text-foreground',
      badgeColor: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    } : null,
    connectionStatus.leetcode.username ? {
      key: 'leetcode',
      label: `LeetCode (@${connectionStatus.leetcode.username})`,
      url: `https://leetcode.com/u/${connectionStatus.leetcode.username}`,
      icon: Code,
      color: 'hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    } : null,
    connectionStatus.codeforces.handle ? {
      key: 'codeforces',
      label: `Codeforces (@${connectionStatus.codeforces.handle})`,
      url: `https://codeforces.com/profile/${connectionStatus.codeforces.handle}`,
      icon: BarChart2,
      color: 'hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    } : null,
    connectionStatus.gfg.username ? {
      key: 'gfg',
      label: `GeeksforGeeks (@${connectionStatus.gfg.username})`,
      url: `https://geeksforgeeks.org/user/${connectionStatus.gfg.username}`,
      icon: Terminal,
      color: 'hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    } : null,
    connectionStatus.linkedin?.url ? {
      key: 'linkedin',
      label: 'LinkedIn Profile',
      url: connectionStatus.linkedin.url,
      icon: Linkedin,
      color: 'hover:border-sky-500 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400',
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    } : null,
    connectionStatus.portfolio?.url ? {
      key: 'portfolio',
      label: 'Personal Portfolio',
      url: connectionStatus.portfolio.url,
      icon: Globe,
      color: 'hover:border-primary hover:bg-primary/10 hover:text-primary',
      badgeColor: 'bg-primary/10 text-primary border-primary/20',
    } : null,
  ].filter(Boolean) as { key: string; label: string; url: string; icon: React.ElementType; color: string; badgeColor: string }[];

  return (
    <div className="w-full bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden font-sans mb-4 transition-all hover:shadow-md">
      {/* Decorative ambient background accent */}
      <div className="absolute top-0 right-0 w-64 h-28 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-tr-2xl pointer-events-none -z-0" />

      {/* Row 1: Profile Avatar + Identity + Platform Status Badges + Action Buttons */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 flex-1">
          <div className="relative shrink-0 group/avatar">
            <Avatar className="size-14 sm:size-16 border-2 border-background ring-2 ring-primary/20 shadow-xs transition-transform duration-200 group-hover/avatar:scale-105">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={`${studentName}'s avatar`} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs text-[10px] font-bold ring-2 ring-background">
              ✓
            </div>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
                {studentName}
              </h1>
              <Badge variant="secondary" className="gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Globe className="size-3 text-primary animate-pulse" />
                Verified Student Profile
              </Badge>
            </div>

            {username ? (
              <p className="font-mono text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <span>@{username}</span>
              </p>
            ) : null}

            {/* Connected Platform Status Badges */}
            {activePlatforms.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {activePlatforms.map((plat) => {
                  const Icon = plat.icon;
                  return (
                    <div
                      key={plat.name}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${plat.color} transition-transform hover:scale-105`}
                    >
                      <span className={`size-1.5 rounded-full ${plat.dot} animate-pulse`} />
                      <Icon className="size-3" />
                      <span>{plat.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 sm:pt-0">
          {usernameSet && username ? (
            <CopyPublicProfileLinkButton
              username={username}
              variant="default"
              size="sm"
              showLabel
              className="shadow-xs"
            />
          ) : null}

          <button
            onClick={handleSyncClick}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-xs transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            <div className={syncing ? 'animate-spin' : ''}><RefreshCw className="size-3.5" /></div>
            <span>{syncing ? 'Syncing...' : 'Sync Stats'}</span>
          </button>

          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center justify-center size-9 rounded-xl border border-border/80 bg-card hover:bg-muted/70 text-foreground transition-all duration-200 hover:scale-[1.05] cursor-pointer shadow-2xs"
            title="Edit profile & handles"
          >
            <Settings className="size-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* Progress banner during batch historical import */}
      {(externalImportProgress || importProgress) && (
        <div className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3.5 py-2 rounded-xl border border-blue-500/20 flex items-center gap-2">
          <div className="animate-spin"><RefreshCw className="size-3.5 shrink-0 text-blue-500" /></div>
          <span>{externalImportProgress || importProgress}</span>
        </div>
      )}

      {/* Connected Profiles & Links Section */}
      {platformLinksList.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
            <span>Connected Profiles & Links</span>
            <span className="text-[10px] font-semibold text-muted-foreground/70 lowercase">{platformLinksList.length} links available</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {platformLinksList.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.key}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`group/link inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground shadow-2xs transition-all duration-200 ${item.color} hover:scale-[1.02] cursor-pointer`}
                >
                  <div className={`p-0.5 rounded-md border ${item.badgeColor}`}>
                    <Icon className="size-3" />
                  </div>
                  <span>{item.label}</span>
                  <ExternalLink className="size-3 opacity-50 group-hover/link:opacity-100 transition-opacity" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      <Dialog open={isDisconnectOpen} onOpenChange={setIsDisconnectOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 font-sans">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <Unplug className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">Disconnect GitHub?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Your access token will be removed and activity syncing will pause.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsDisconnectOpen(false)} className="rounded-lg text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnectConfirm}
              disabled={disconnecting}
              className="rounded-lg text-xs font-semibold"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit profile dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="!flex !flex-col max-h-[85vh] overflow-hidden overscroll-contain rounded-2xl border border-border/80 bg-card p-0 font-sans shadow-2xl sm:max-w-2xl [&>button]:right-5 [&>button]:top-5 [&>button]:z-20 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:text-muted-foreground [&>button]:transition-colors [&>button]:hover:bg-muted [&>button]:hover:text-foreground">
          <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-3.5 pt-6 pr-14 sm:px-8">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Edit profile & handles
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update your coding handles and portfolio links.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-6 py-5 pr-5 sm:px-8 sm:pr-6">
            <div className="space-y-5">
              <section className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="leetcode-username" className="text-sm font-medium text-foreground">LeetCode</label>
                      {handles.leetcodeUsername ? (
                        <button type="button" onClick={() => clearHandle('leetcodeUsername')} className={unlinkButtonClass} title="Unlink LeetCode and clear imported activity after saving">
                          <Link2Off className="h-3 w-3" /> Unlink
                        </button>
                      ) : null}
                    </div>
                    <input id="leetcode-username" type="text" maxLength={50} value={handles.leetcodeUsername || ''} onBlur={() => markTouched('leetcodeUsername')} onChange={(e) => updateHandle('leetcodeUsername', e.target.value)} placeholder="anuj070894" className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/20 ${fieldErrors.leetcodeUsername ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/40'}`} />
                    {fieldErrors.leetcodeUsername ? <p className="flex items-center gap-1.5 text-xs font-medium text-destructive"><AlertCircle className="h-3 w-3" />{fieldErrors.leetcodeUsername}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="codeforces-handle" className="text-sm font-medium text-foreground">Codeforces</label>
                      {handles.codeforcesHandle ? (
                        <button type="button" onClick={() => clearHandle('codeforcesHandle')} className={unlinkButtonClass} title="Unlink Codeforces and clear imported activity after saving">
                          <Link2Off className="h-3 w-3" /> Unlink
                        </button>
                      ) : null}
                    </div>
                    <input id="codeforces-handle" type="text" maxLength={50} value={handles.codeforcesHandle || ''} onBlur={() => markTouched('codeforcesHandle')} onChange={(e) => updateHandle('codeforcesHandle', e.target.value)} placeholder="tourist" className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/20 ${fieldErrors.codeforcesHandle ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/40'}`} />
                    {fieldErrors.codeforcesHandle ? <p className="flex items-center gap-1.5 text-xs font-medium text-destructive"><AlertCircle className="h-3 w-3" />{fieldErrors.codeforcesHandle}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="gfg-username" className="text-sm font-medium text-foreground">GeeksforGeeks</label>
                      {handles.gfgUsername ? (
                        <button type="button" onClick={() => clearHandle('gfgUsername')} className={unlinkButtonClass} title="Unlink GeeksforGeeks and clear imported activity after saving">
                          <Link2Off className="h-3 w-3" /> Unlink
                        </button>
                      ) : null}
                    </div>
                    <input id="gfg-username" type="text" maxLength={150} value={handles.gfgUsername || ''} onBlur={() => markTouched('gfgUsername')} onChange={(e) => {
                      const raw = e.target.value;
                      const profileMatch = raw.match(/(?:geeksforgeeks\.org\/(?:profile|user)\/)([A-Za-z0-9_.-]+)/i);
                      const cleaned = profileMatch?.[1] || raw.replace(/^@/, '').split('?')[0].split('/')[0].trim();
                      updateHandle('gfgUsername', cleaned);
                    }} placeholder="e.g. gfg_user" className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/20 ${fieldErrors.gfgUsername ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/40'}`} />
                    {fieldErrors.gfgUsername ? <p className="flex items-center gap-1.5 text-xs font-medium text-destructive"><AlertCircle className="h-3 w-3" />{fieldErrors.gfgUsername}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-foreground">GitHub</label>
                      {connectionStatus.github.isConnected ? (
                        <button type="button" onClick={() => setIsDisconnectOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors cursor-pointer">
                          <Link2Off className="h-3 w-3" /> Unlink
                        </button>
                      ) : null}
                    </div>

                    {connectionStatus.github.isConnected ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
                        <Github className="size-4 text-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {connectionStatus.github.username ? `@${connectionStatus.github.username}` : 'GitHub Account'}
                        </span>
                      </div>
                    ) : (
                      <a
                        href="/api/integrations/github/connect"
                        className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-foreground text-background px-3.5 py-2.5 text-sm font-semibold hover:bg-foreground/90 transition-colors shadow-2xs"
                      >
                        <Github className="size-4" />
                        <span>Connect GitHub</span>
                      </a>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3 border-t border-border/60 pt-5">
                <h3 className="text-sm font-semibold text-foreground">Portfolio links</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="linkedin-url" className="text-sm font-medium text-foreground">LinkedIn URL</label>
                      {handles.linkedinUrl ? (
                        <button type="button" onClick={() => clearHandle('linkedinUrl')} className={clearLinkButtonClass}><Link2Off className="h-3 w-3" /> Clear link</button>
                      ) : <span className="text-xs text-muted-foreground">Not linked</span>}
                    </div>
                    <input id="linkedin-url" type="url" inputMode="url" value={handles.linkedinUrl || ''} onBlur={() => markTouched('linkedinUrl')} onChange={(e) => updateHandle('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/username" className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/20 ${fieldErrors.linkedinUrl ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/40'}`} />
                    {fieldErrors.linkedinUrl ? <p className="flex items-center gap-1.5 text-xs font-medium text-destructive"><AlertCircle className="h-3 w-3" />{fieldErrors.linkedinUrl}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="portfolio-url" className="text-sm font-medium text-foreground">Portfolio URL</label>
                      {handles.portfolioUrl ? (
                        <button type="button" onClick={() => clearHandle('portfolioUrl')} className={clearLinkButtonClass}><Link2Off className="h-3 w-3" /> Clear link</button>
                      ) : <span className="text-xs text-muted-foreground">Not linked</span>}
                    </div>
                    <input id="portfolio-url" type="url" inputMode="url" value={handles.portfolioUrl || ''} onBlur={() => markTouched('portfolioUrl')} onChange={(e) => updateHandle('portfolioUrl', e.target.value)} placeholder="https://yourportfolio.com" className={`w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/20 ${fieldErrors.portfolioUrl ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary/40'}`} />
                    {fieldErrors.portfolioUrl ? <p className="flex items-center gap-1.5 text-xs font-medium text-destructive"><AlertCircle className="h-3 w-3" />{fieldErrors.portfolioUrl}</p> : null}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-border/60 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
            <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)} className="rounded-lg px-4 text-sm font-medium text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveHandles} disabled={savingProfiles || hasValidationErrors} className="rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {savingProfiles ? <span className="inline-flex items-center gap-2"><div className="animate-spin"><RefreshCw className="h-3.5 w-3.5" /></div> Saving</span> : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
