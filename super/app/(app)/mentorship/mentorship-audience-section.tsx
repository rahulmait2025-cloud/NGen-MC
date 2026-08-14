'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Loader2, Search, Users, X, ChevronDown, Building2, UserCheck, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const EMPTY_CHIPS: AudienceChip[] = [];
import type { MentorshipAudienceTargetInput } from '@/lib/services/mentorship-audience-types';
import {
  previewMentorshipRecipientsAction,
  searchMentorshipCollegesAction,
  searchMentorshipProductsAction,
  searchMentorshipStudentsAction,
} from './mentorship-audience-actions';

interface AudienceChip {
  key: string;
  targetType: MentorshipAudienceTargetInput['targetType'];
  targetId?: string | null;
  label: string;
}

interface SearchItem {
  id: string;
  label: string;
  sublabel?: string;
  targetType: MentorshipAudienceTargetInput['targetType'];
}

function chipKey(target: MentorshipAudienceTargetInput): string {
  return target.targetId ? `${target.targetType}:${target.targetId}` : target.targetType;
}

function ChipTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'college':
      return <Building2 className="size-3 text-muted-foreground" />;
    case 'student':
      return <UserCheck className="size-3 text-muted-foreground" />;
    default:
      return <BookOpen className="size-3 text-muted-foreground" />;
  }
}

function AudienceCombobox({
  label,
  icon: Icon,
  placeholder,
  query,
  onQueryChange,
  results,
  loading,
  onSelect,
  disabled,
  minChars = 1,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchItem[];
  loading: boolean;
  onSelect: (item: SearchItem) => void;
  disabled?: boolean;
  minChars?: number;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasQuery = query.trim().length >= minChars;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm',
              'text-muted-foreground hover:bg-muted/50 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <Search className="size-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">{query || placeholder}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="rounded-sm p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Searching…
              </div>
            ) : !hasQuery ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Type at least {minChars} character{minChars > 1 ? 's' : ''} to search
              </p>
            ) : results.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No results found</p>
            ) : (
              results.map((item) => (
                <button
                  key={`${item.targetType}:${item.id}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                    onQueryChange('');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
                >
                  <ChipTypeIcon type={item.targetType} />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium block truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className="text-xs text-muted-foreground block truncate">{item.sublabel}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type PreviewState = {
  count: number | null;
  loading: boolean;
  error: string | null;
};

type PreviewAction =
  | { type: 'START_PREVIEW' }
  | { type: 'PREVIEW_SUCCESS'; count: number; zeroReason?: string }
  | { type: 'PREVIEW_ERROR'; error: string }
  | { type: 'RESET' };

const initialPreviewState: PreviewState = { count: null, loading: false, error: null };

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'START_PREVIEW':
      return { ...state, loading: true, error: null };
    case 'PREVIEW_SUCCESS':
      return { count: action.count, loading: false, error: action.zeroReason ?? null };
    case 'PREVIEW_ERROR':
      return { count: null, loading: false, error: action.error };
    case 'RESET':
      return initialPreviewState;
  }
}

type SearchState = {
  query: string;
  results: SearchItem[];
  loading: boolean;
};

type SearchAction =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_SUCCESS'; results: SearchItem[] };

const initialSearchState: SearchState = { query: '', results: [], loading: false };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.query };
    case 'CLEAR_RESULTS':
      return { ...state, results: [] };
    case 'SEARCH_START':
      return { ...state, loading: true };
    case 'SEARCH_SUCCESS':
      return { ...state, results: action.results, loading: false };
  }
}

export function MentorshipAudienceSection({
  onTargetsChange,
  disabled = false,
  initialChips = EMPTY_CHIPS,
  emailsLocked = false,
  lockedMessage,
  onPreviewCountChange,
}: {
  onTargetsChange?: (targets: MentorshipAudienceTargetInput[]) => void;
  disabled?: boolean;
  initialChips?: AudienceChip[];
  emailsLocked?: boolean;
  lockedMessage?: string;
  onPreviewCountChange?: (count: number | null) => void;
}) {
  const [chips, setChips] = useState<AudienceChip[]>(initialChips);
  const [collegeSearch, collegeDispatch] = useReducer(searchReducer, initialSearchState);
  const [studentSearch, studentDispatch] = useReducer(searchReducer, initialSearchState);
  const [productSearch, productDispatch] = useReducer(searchReducer, initialSearchState);
  const [preview, previewDispatch] = useReducer(previewReducer, initialPreviewState);

  const targets = useMemo(
    () =>
      chips.map((chip) => ({
        targetType: chip.targetType,
        targetId: chip.targetId ?? null,
      })),
    [chips],
  );

  const onTargetsChangeRef = useRef(onTargetsChange);
  useEffect(() => {
    onTargetsChangeRef.current = onTargetsChange;
  }, [onTargetsChange]);

  const targetsStr = JSON.stringify(targets);
  useEffect(() => {
    onTargetsChangeRef.current?.(JSON.parse(targetsStr));
  }, [targetsStr]);

  const addChip = useCallback((item: SearchItem) => {
    const target: MentorshipAudienceTargetInput = {
      targetType: item.targetType,
      targetId: item.targetType === 'all_bootcamp_enrolled' ? null : item.id,
    };
    const key = chipKey(target);
    setChips((prev) => {
      if (prev.some((c) => c.key === key)) return prev;
      return [
        ...prev,
        {
          key,
          targetType: target.targetType,
          targetId: target.targetId,
          label: item.label,
        },
      ];
    });
    previewDispatch({ type: 'RESET' });
    onPreviewCountChange?.(null);
  }, [onPreviewCountChange]);

  const removeChip = useCallback((key: string) => {
    setChips((prev) => prev.filter((c) => c.key !== key));
    previewDispatch({ type: 'RESET' });
    onPreviewCountChange?.(null);
  }, [onPreviewCountChange]);

  const clearAllChips = useCallback(() => {
    setChips([]);
    previewDispatch({ type: 'RESET' });
    onPreviewCountChange?.(null);
  }, [onPreviewCountChange]);

  useEffect(() => {
    if (!collegeSearch.query.trim()) return;
    const timer = setTimeout(async () => {
      collegeDispatch({ type: 'SEARCH_START' });
      const result = await searchMentorshipCollegesAction(collegeSearch.query);
      if (result.ok) {
        collegeDispatch({
          type: 'SEARCH_SUCCESS',
          results: result.items.map((item) => ({
            ...item,
            targetType: 'college' as const,
          })),
        });
      } else {
        collegeDispatch({ type: 'SEARCH_SUCCESS', results: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [collegeSearch.query]);

  useEffect(() => {
    if (studentSearch.query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      studentDispatch({ type: 'SEARCH_START' });
      const result = await searchMentorshipStudentsAction(studentSearch.query);
      if (result.ok) {
        studentDispatch({
          type: 'SEARCH_SUCCESS',
          results: result.items.map((item) => ({
            ...item,
            targetType: 'student' as const,
          })),
        });
      } else {
        studentDispatch({ type: 'SEARCH_SUCCESS', results: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch.query]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      productDispatch({ type: 'SEARCH_START' });
      const result = await searchMentorshipProductsAction(productSearch.query);
      if (result.ok) {
        productDispatch({
          type: 'SEARCH_SUCCESS',
          results: result.items.map((item) => ({
            id: item.id,
            label: item.label,
            sublabel: item.sublabel,
            targetType: item.targetType,
          })),
        });
      } else {
        productDispatch({ type: 'SEARCH_SUCCESS', results: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch.query]);

  async function handlePreview() {
    if (targets.length === 0) {
      toast.error('Add at least one audience target.');
      return;
    }
    previewDispatch({ type: 'START_PREVIEW' });
    const result = await previewMentorshipRecipientsAction(targets);
    if (!result.ok) {
      previewDispatch({ type: 'PREVIEW_ERROR', error: result.error });
      onPreviewCountChange?.(null);
      toast.error(result.error);
      return;
    }
    previewDispatch({
      type: 'PREVIEW_SUCCESS',
      count: result.preview.totalCount,
      zeroReason: result.preview.zeroReason,
    });
    onPreviewCountChange?.(result.preview.totalCount);
  }

  const locked = emailsLocked;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="size-4 text-primary" />
          Audience
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selected students receive the mentorship email and see this session on their dashboard.
        </p>
        {locked && lockedMessage ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{lockedMessage}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {locked ? (
          <p className="text-sm text-muted-foreground">
            Audience is locked because invite emails were already sent for this session.
          </p>
        ) : null}

        {/* Selected chips */}
        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1.5 py-1 pl-2 pr-1 text-xs font-medium"
              >
                <ChipTypeIcon type={chip.targetType} />
                {chip.label}
                <button
                  type="button"
                  disabled={disabled || locked}
                  onClick={() => removeChip(chip.key)}
                  className="rounded-full p-0.5 hover:bg-muted transition-colors"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {chips.length > 1 && (
              <button
                type="button"
                disabled={disabled || locked}
                onClick={clearAllChips}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        ) : (
          !locked && (
            <p className="text-sm text-muted-foreground">No audience selected yet.</p>
          )
        )}

        {/* Search fields */}
        {!locked ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <AudienceCombobox
                label="Colleges"
                icon={Building2}
                placeholder="Search colleges…"
                query={collegeSearch.query}
                onQueryChange={(q) => {
                  collegeDispatch({ type: 'SET_QUERY', query: q });
                  if (!q.trim()) collegeDispatch({ type: 'CLEAR_RESULTS' });
                }}
                results={collegeSearch.results}
                loading={collegeSearch.loading}
                onSelect={addChip}
                disabled={disabled || locked}
              />

              <AudienceCombobox
                label="Students"
                icon={UserCheck}
                placeholder="Search by name or email…"
                query={studentSearch.query}
                onQueryChange={(q) => {
                  studentDispatch({ type: 'SET_QUERY', query: q });
                  if (q.trim().length < 2) studentDispatch({ type: 'CLEAR_RESULTS' });
                }}
                results={studentSearch.results}
                loading={studentSearch.loading}
                onSelect={addChip}
                disabled={disabled || locked}
                minChars={2}
              />
            </div>

            <AudienceCombobox
              label="Courses & Bundles"
              icon={BookOpen}
              placeholder="Search courses, bundles, programs…"
              query={productSearch.query}
              onQueryChange={(q) => productDispatch({ type: 'SET_QUERY', query: q })}
              results={productSearch.results}
              loading={productSearch.loading}
              onSelect={addChip}
              disabled={disabled}
            />

            {/* Preview bar */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || preview.loading || targets.length === 0}
                onClick={() => void handlePreview()}
              >
                {preview.loading ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Previewing…
                  </>
                ) : (
                  'Preview recipients'
                )}
              </Button>
              {preview.count != null ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{preview.count}</span>{' '}
                  unique student{preview.count === 1 ? '' : 's'} will receive this email.
                </p>
              ) : null}
              {preview.error ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">{preview.error}</p>
              ) : null}
            </div>
          </>
        ) : null}

        <input
          type="hidden"
          name="audience_targets"
          value={JSON.stringify(targets)}
          readOnly
        />
      </CardContent>
    </Card>
  );
}
