'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Info, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setStudentUsername } from '@/lib/actions/profile';
import { studentUsernameSchema } from '@/lib/profile/student-username';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CopyPublicProfileLinkButton } from '@/components/public-coding-profile/copy-public-profile-link-button';

type UsernameOnboardingProps = {
  username: string | null;
  usernameSet: boolean;
  collegeSlug: string;
};

export function UsernameOnboarding({
  username: initialUsername,
  usernameSet: initialUsernameSet,
  collegeSlug,
}: UsernameOnboardingProps) {
  const router = useRouter();
  const isAlreadyAssigned = Boolean(
    initialUsernameSet || (initialUsername && initialUsername.trim().length > 0)
  );

  const [usernameSet, setUsernameSet] = useState(isAlreadyAssigned);
  const [currentUsername, setCurrentUsername] = useState(initialUsername ?? '');
  const [inputValue, setInputValue] = useState(initialUsername ?? '');
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lower = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setInputValue(lower);
    if (error) setError(null);
  };

  const handleConfirm = async () => {
    setError(null);

    const validated = studentUsernameSchema.safeParse(inputValue);
    if (!validated.success) {
      setError(validated.error.issues[0]?.message ?? 'Invalid username format.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setStudentUsername(validated.data, collegeSlug);
      if (!res.success) {
        if (res.error?.includes('already been confirmed')) {
          setUsernameSet(true);
          toast.info('Public username is already confirmed.');
          router.refresh();
          return;
        }
        setError(res.error ?? 'Failed to update username.');
        setIsSubmitting(false);
        return;
      }

      toast.success('Public username set successfully');
      setCurrentUsername(res.username);
      setUsernameSet(true);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (usernameSet) {
    return (
      <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-muted-foreground mt-1.5">
        <span className="text-muted-foreground/80">Public handle:</span>
        <span className="font-mono text-foreground font-semibold px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60">
          @{currentUsername}
        </span>
        {currentUsername ? (
          <CopyPublicProfileLinkButton
            username={currentUsername}
            variant="ghost"
            size="sm"
            showLabel
            className="h-7 text-xs px-2.5 rounded-lg text-primary hover:text-primary hover:bg-primary/10 border-transparent shadow-none"
          />
        ) : null}
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs font-mono text-muted-foreground">@{currentUsername}</span>
        <span className="text-muted-foreground/40">•</span>
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="text-xs text-primary font-semibold underline-offset-4 hover:underline transition-colors"
        >
          Set username now
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.04] to-primary/[0.01] p-4 sm:p-5 mt-4 space-y-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 shadow-2xs">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
              Set your public username
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              One-time action
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Choose how your shareable coding profile handle will appear across the platform.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="student-username-input" className="sr-only">
          Public Username
        </label>
        
        <div
          className={cn(
            'flex items-center rounded-xl border bg-background px-3.5 py-2 shadow-2xs transition-all',
            error
              ? 'border-destructive ring-1 ring-destructive'
              : 'border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          )}
        >
          <span className="text-muted-foreground font-mono text-sm font-bold select-none pr-1.5 shrink-0">
            @
          </span>
          <input
            id="student-username-input"
            type="text"
            value={inputValue}
            onChange={handleUsernameChange}
            maxLength={20}
            placeholder="username"
            disabled={isSubmitting}
            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            className="w-full min-w-0 bg-transparent p-0 font-mono text-sm font-semibold text-foreground placeholder:text-muted-foreground"
          />
          <span className="text-[11px] font-mono text-muted-foreground/60 select-none pl-2 shrink-0">
            {inputValue.length}/20
          </span>
        </div>

        {error ? (
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium pt-0.5 animate-in fade-in-50 duration-150">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
            <Info className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>You will not be able to change this username later.</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={isSubmitting || inputValue.length < 4}
          className="gap-1.5 font-semibold rounded-xl px-4 h-9 shadow-2xs hover:shadow-xs transition-all"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Confirm username
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          disabled={isSubmitting}
          className="text-muted-foreground hover:text-foreground font-medium rounded-xl h-9 text-xs"
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
