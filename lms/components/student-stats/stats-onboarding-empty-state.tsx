'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Code, Edit3, Flame, Github, Globe, Loader2, Sparkles, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityHeatmapGrid } from './activity-heatmap-grid';
import { StatsHeader } from './stats-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStudentProfileHandles, saveStudentPlatformsAndStartImport } from '@/lib/actions/coding-stats-actions';
import { CombinedHeatmapDay, PlatformProfileInputs } from '@/types/student-stats';

const initialHandles: PlatformProfileInputs = {
  bio: '',
  githubUrl: '',
  leetcodeUsername: '',
  codeforcesHandle: '',
  gfgUsername: '',
  linkedinUrl: '',
  portfolioUrl: '',
};

function demoDay(year: number, month: number, day: number, leetcodeCount: number): CombinedHeatmapDay {
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    date,
    formattedDate: date,
    githubCount: Math.max(0, Math.floor(leetcodeCount / 3)),
    leetcodeCount,
    codeforcesCount: Math.max(0, Math.floor(leetcodeCount / 5)),
    gfgCount: Math.max(0, Math.floor(leetcodeCount / 4)),
    totalPoints: leetcodeCount,
  };
}

function buildDemoActivities(year: number): Record<string, CombinedHeatmapDay> {
  const days = [
    demoDay(year, 1, 12, 4),
    demoDay(year, 2, 8, 2),
    demoDay(year, 3, 12, 9),
    demoDay(year, 3, 13, 7),
    demoDay(year, 4, 4, 3),
    demoDay(year, 6, 18, 12),
    demoDay(year, 8, 2, 5),
    demoDay(year, 11, 7, 8),
  ];

  return days.reduce<Record<string, CombinedHeatmapDay>>((acc, day) => {
    acc[day.date] = day;
    return acc;
  }, {});
}

export function StatsOnboardingEmptyState({ loginUrl: _loginUrl = '/login' }: { loginUrl?: string }) {
  const router = useRouter();
  const [currentUtcYear, setCurrentUtcYear] = useState(new Date().getUTCFullYear());
  const [demoYear, setDemoYear] = useState(new Date().getUTCFullYear());
  const [showDemo, setShowDemo] = useState(false);
  const [isQuickHandlesOpen, setIsQuickHandlesOpen] = useState(false);
  const [savingProfiles, setSavingProfiles] = useState(false);
  const [quickSaveMsg, setQuickSaveMsg] = useState<string | null>(null);
  const [handles, setHandles] = useState<PlatformProfileInputs>(initialHandles);

  useEffect(() => {
    const year = new Date().getUTCFullYear();
    setCurrentUtcYear(year);
    setDemoYear(year);

    getStudentProfileHandles().then((existing) => {
      if (!existing) return;
      setHandles((prev) => ({
        ...prev,
        bio: existing.bio || prev.bio || '',
        githubUrl: existing.githubUrl || prev.githubUrl || '',
        leetcodeUsername: existing.leetcodeUsername || prev.leetcodeUsername || '',
        codeforcesHandle: existing.codeforcesHandle || prev.codeforcesHandle || '',
        gfgUsername: existing.gfgUsername || prev.gfgUsername || '',
        linkedinUrl: existing.linkedinUrl || prev.linkedinUrl || '',
        portfolioUrl: existing.portfolioUrl || prev.portfolioUrl || '',
      }));
    });
  }, []);

  const updateHandle = (name: keyof PlatformProfileInputs, value: string) => {
    setHandles((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickSave = async () => {
    setSavingProfiles(true);
    setQuickSaveMsg('Validating profiles...');

    try {
      const res = await saveStudentPlatformsAndStartImport(handles);
      if (!res.ok) {
        toast.error(res.error || 'Profile validation failed.');
        setQuickSaveMsg(null);
        return;
      }

      if (res.isComplete) toast.success('Profiles saved and coding history imported.');
      else toast.success('Profiles saved. Coding history import started.');
      setQuickSaveMsg(res.message || 'Profiles saved.');
      setIsQuickHandlesOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to save platform handles.');
      setQuickSaveMsg(null);
    } finally {
      setSavingProfiles(false);
    }
  };

  if (showDemo) {
    const prevUtcYear = currentUtcYear - 1;
    return (
      <div className="space-y-4 font-sans">
        <button
          type="button"
          onClick={() => setShowDemo(false)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <StatsHeader
          studentName="Demo Student"
          bio="Passionately solving DSA problems and building web applications."
          connectionStatus={{
            github: { isConnected: true, username: 'demo-student', profileUrl: 'https://github.com', connectedAt: null, lastSyncedAt: null, accountCreatedAt: null, earliestActivityDate: null, error: null },
            leetcode: { username: 'demo_lc', lastSyncedAt: null, accountCreatedAt: null, earliestActivityDate: null },
            codeforces: { handle: 'demo_cf', lastSyncedAt: null, accountCreatedAt: null, earliestActivityDate: null },
            gfg: { username: 'demo_gfg', lastSyncedAt: null, accountCreatedAt: null, earliestActivityDate: null },
            linkedin: { url: 'https://linkedin.com/in/demo' },
            portfolio: { url: 'https://demostudent.dev' },
          }}
          onRefreshStats={() => { }}
        />

        <ActivityHeatmapGrid
          activitiesMap={buildDemoActivities(demoYear)}
          selectedYear={demoYear}
          availableYears={{
            combined: [currentUtcYear, prevUtcYear],
            github: [currentUtcYear, prevUtcYear],
            leetcode: [currentUtcYear, prevUtcYear],
            codeforces: [currentUtcYear, prevUtcYear],
            gfg: [currentUtcYear, prevUtcYear],
          }}
          syncStatus={{ github: 'success', leetcode: 'success', codeforces: 'success', gfg: 'success' }}
          onYearChange={setDemoYear}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-6 font-sans">
      <div className="py-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Multi-platform activity & profiles</span>
        </div>

        <h1 className="mb-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Showcase your coding consistency across platforms
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Connect GitHub, LeetCode, Codeforces, and GeeksforGeeks to build one 365-day activity heatmap.
        </p>

        <div className="mb-12 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/api/integrations/github/connect"
            className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-2xs transition hover:opacity-90"
          >
            <Github className="h-4 w-4" />
            <span>Connect GitHub account</span>
            <ArrowRight className="ml-1 h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setIsQuickHandlesOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-secondary px-6 py-3.5 text-sm font-bold text-secondary-foreground transition hover:bg-muted"
          >
            <Edit3 className="h-4 w-4 text-emerald-500" />
            <span>Quick add handles</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDemo(true)}
            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border/60 bg-muted px-6 py-3.5 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Explore demo preview</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-border/80 pt-8 text-left md:grid-cols-3">
          <FeatureCard icon={<Github className="h-5 w-5" />} title="GitHub integration" text="Use OAuth for commits and contribution history." />
          <FeatureCard icon={<Code className="h-5 w-5" />} title="Coding platforms" text="Import LeetCode, Codeforces, and GeeksforGeeks submissions." />
          <FeatureCard icon={<Flame className="h-5 w-5" />} title="Unified heatmap" text="Show activity by day, year, and platform from one place." />
        </div>
      </div>

      <Dialog open={isQuickHandlesOpen} onOpenChange={setIsQuickHandlesOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-0 font-sans shadow-2xl sm:max-w-2xl">
          <DialogHeader className="border-b border-border/60 px-6 pb-3.5 pt-6 sm:px-8">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">Quick add coding handles</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Save public handles. Import starts immediately after validation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5 sm:px-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="LeetCode" value={handles.leetcodeUsername || ''} onChange={(v) => updateHandle('leetcodeUsername', v)} placeholder="username" icon={<Code className="h-4 w-4 text-amber-500" />} />
              <TextField label="Codeforces" value={handles.codeforcesHandle || ''} onChange={(v) => updateHandle('codeforcesHandle', v)} placeholder="tourist" icon={<Terminal className="h-4 w-4 text-blue-500" />} />
              <TextField label="GeeksforGeeks" value={handles.gfgUsername || ''} onChange={(v) => updateHandle('gfgUsername', v)} placeholder="gfg_user" icon={<Code className="h-4 w-4 text-emerald-500" />} />
              <TextField label="LinkedIn" value={handles.linkedinUrl || ''} onChange={(v) => updateHandle('linkedinUrl', v)} placeholder="https://linkedin.com/in/name" icon={<Globe className="h-4 w-4 text-sky-500" />} />
              <TextField label="Portfolio" value={handles.portfolioUrl || ''} onChange={(v) => updateHandle('portfolioUrl', v)} placeholder="https://site.com" icon={<Globe className="h-4 w-4 text-primary" />} />
            </div>

            {quickSaveMsg ? <p className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400">{quickSaveMsg}</p> : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4 sm:px-8">
            <Button variant="ghost" size="sm" onClick={() => setIsQuickHandlesOpen(false)} disabled={savingProfiles}>Cancel</Button>
            <Button size="sm" onClick={handleQuickSave} disabled={savingProfiles}>
              {savingProfiles ? <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving</span> : 'Save and import'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mb-1 font-heading text-sm font-bold text-foreground">{title}</h3>
      <p className="text-xs leading-normal text-muted-foreground">{text}</p>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, icon }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; icon: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5">
        {icon}
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
      </span>
    </label>
  );
}
