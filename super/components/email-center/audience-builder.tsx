'use client';

import { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Loader2, Search, Building2, UserCheck, Mail, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import {
  previewAudienceAction,
  listCollegesForAudienceAction,
  searchUsersForAudienceAction,
} from '@/app/(app)/email-center/actions';
import {
  MAX_EXTERNAL_EMAIL_RECIPIENTS,
  parseExternalEmailList,
} from '@/lib/email-center/external-emails';

interface AudienceBuilderProps {
  campaignId: string;
  onConfigChange?: (config: AudienceConfig) => void;
  initialConfig?: AudienceConfig | null;
  /** When true, show Platform vs External tabs (Custom Email / No Template). */
  isCustomComposer?: boolean;
}

export type AudienceType =
  | 'manual_emails'
  | 'all_students'
  | 'all_college_admins'
  | 'specific_college_students'
  | 'specific_college_admins'
  | 'individual_students'
  | 'individual_college_admins';

export type CustomAudienceMode = 'platform' | 'external';

export interface SelectedStudentRef {
  id: string;
  user_id?: string;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  college_id?: string | null;
  college_name?: string | null;
}

export interface SelectedAdminRef {
  id: string;
  user_id?: string;
  email: string;
  full_name?: string | null;
  college_id?: string | null;
  college_name?: string | null;
}

export interface AudienceConfig {
  type: AudienceType;
  college_ids?: string[];
  student_ids?: string[];
  admin_ids?: string[];
  manual_emails?: string;
  custom_audience_mode?: CustomAudienceMode;
  selected_students?: SelectedStudentRef[];
  selected_admins?: SelectedAdminRef[];
}

interface CollegeOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  user_id: string;
  name: string;
  email: string;
  college_id?: string | null;
  college_name?: string | null;
}

interface PreviewData {
  totalRaw: number;
  duplicateCount: number;
  suppressedCount: number;
  validCount: number;
  sampleRecipients: Array<{ email: string; full_name: string | null; recipient_type: 'student' | 'college_admin' | 'super_admin' | 'manual'; college_name: string | null }>;
  warnings: string[];
}

const audienceTypes = [
  { value: 'manual_emails' as AudienceType, label: 'Manual Email List', icon: Mail },
  { value: 'all_students' as AudienceType, label: 'All Students', icon: Users },
  { value: 'all_college_admins' as AudienceType, label: 'All College Admins', icon: Building2 },
  { value: 'specific_college_students' as AudienceType, label: 'Specific College Students', icon: Users },
  { value: 'specific_college_admins' as AudienceType, label: 'Specific College Admins', icon: Building2 },
  { value: 'individual_students' as AudienceType, label: 'Individual Students', icon: UserCheck },
  { value: 'individual_college_admins' as AudienceType, label: 'Individual College Admins', icon: UserCheck },
];

/** Platform-only options for Custom Email (external uses its own input). */
const platformAudienceTypes = audienceTypes.filter((t) => t.value !== 'manual_emails');

function isValidAudienceType(type: string): type is AudienceType {
  return audienceTypes.some((t) => t.value === type);
}

function buildIndividualConfig(users: UserOption[], type: AudienceType): Partial<AudienceConfig> {
  if (type === 'individual_students') {
    return {
      student_ids: users.map((u) => u.id),
      selected_students: users.map((u) => ({
        id: u.id,
        user_id: u.user_id,
        email: u.email,
        full_name: u.name,
        college_id: u.college_id ?? null,
        college_name: u.college_name ?? null,
      })),
      admin_ids: undefined,
      selected_admins: undefined,
    };
  }
  if (type === 'individual_college_admins') {
    return {
      admin_ids: users.map((u) => u.user_id),
      selected_admins: users.map((u) => ({
        id: u.user_id,
        user_id: u.user_id,
        email: u.email,
        full_name: u.name,
        college_id: u.college_id ?? null,
        college_name: u.college_name ?? null,
      })),
      student_ids: undefined,
      selected_students: undefined,
    };
  }
  return {
    student_ids: undefined,
    admin_ids: undefined,
    selected_students: undefined,
    selected_admins: undefined,
  };
}

interface AudienceSelectionState {
  config: AudienceConfig;
  manualEmails: string;
  selectedColleges: CollegeOption[];
  selectedUsers: UserOption[];
}

type AudienceSelectionAction =
  | { type: 'SET_TYPE'; payload: AudienceType }
  | { type: 'SET_CUSTOM_MODE'; payload: CustomAudienceMode }
  | { type: 'SET_MANUAL_EMAILS'; payload: string }
  | { type: 'TOGGLE_COLLEGE'; payload: CollegeOption }
  | { type: 'TOGGLE_USER'; payload: UserOption };

function audienceSelectionReducer(state: AudienceSelectionState, action: AudienceSelectionAction): AudienceSelectionState {
  switch (action.type) {
    case 'SET_CUSTOM_MODE': {
      const mode = action.payload;
      if (mode === 'external') {
        return {
          ...state,
          config: {
            type: 'manual_emails',
            custom_audience_mode: 'external',
            manual_emails: state.manualEmails,
            college_ids: undefined,
            student_ids: undefined,
            admin_ids: undefined,
            selected_students: undefined,
            selected_admins: undefined,
          },
        };
      }
      const nextType =
        state.config.type === 'manual_emails' ? 'all_students' : state.config.type;
      return {
        ...state,
        config: {
          ...state.config,
          type: nextType,
          custom_audience_mode: 'platform',
          manual_emails: undefined,
          ...buildIndividualConfig(state.selectedUsers, nextType),
          college_ids:
            nextType === 'specific_college_students' || nextType === 'specific_college_admins'
              ? state.selectedColleges.map((c) => c.id)
              : undefined,
        },
      };
    }
    case 'SET_TYPE': {
      const type = action.payload;
      return {
        ...state,
        config: {
          type,
          custom_audience_mode: state.config.custom_audience_mode === 'external' ? 'platform' : state.config.custom_audience_mode,
          college_ids: (type === 'specific_college_students' || type === 'specific_college_admins')
            ? state.selectedColleges.map((c) => c.id)
            : undefined,
          manual_emails: type === 'manual_emails' ? state.manualEmails : undefined,
          ...buildIndividualConfig(state.selectedUsers, type),
        },
      };
    }
    case 'SET_MANUAL_EMAILS':
      return {
        ...state,
        manualEmails: action.payload,
        config: {
          ...state.config,
          type: state.config.custom_audience_mode === 'external' ? 'manual_emails' : state.config.type,
          manual_emails: action.payload,
        },
      };
    case 'TOGGLE_COLLEGE': {
      const college = action.payload;
      const isSelected = state.selectedColleges.some((c) => c.id === college.id);
      const updated = isSelected
        ? state.selectedColleges.filter((c) => c.id !== college.id)
        : [...state.selectedColleges, college];
      return {
        ...state,
        selectedColleges: updated,
        config: { ...state.config, college_ids: updated.map((c) => c.id) },
      };
    }
    case 'TOGGLE_USER': {
      const user = action.payload;
      const isSelected = state.selectedUsers.some((u) => u.id === user.id);
      const updated = isSelected
        ? state.selectedUsers.filter((u) => u.id !== user.id)
        : [...state.selectedUsers, user];
      return {
        ...state,
        selectedUsers: updated,
        config: { ...state.config, ...buildIndividualConfig(updated, state.config.type) },
      };
    }
    default:
      return state;
  }
}

export function AudienceBuilder({
  campaignId,
  onConfigChange: onConfigChangeProp,
  initialConfig,
  isCustomComposer = false,
}: AudienceBuilderProps) {
  const resolvedInitial: AudienceConfig = initialConfig && isValidAudienceType(initialConfig.type)
    ? {
        ...initialConfig,
        custom_audience_mode:
          initialConfig.custom_audience_mode
          ?? (initialConfig.type === 'manual_emails' && isCustomComposer ? 'external' : undefined),
      }
    : { type: 'all_students', custom_audience_mode: isCustomComposer ? 'platform' : undefined };

  const [{ config, manualEmails, selectedColleges, selectedUsers }, audienceDispatch] = useReducer(audienceSelectionReducer, {
    config: resolvedInitial,
    manualEmails: resolvedInitial.manual_emails ?? '',
    selectedColleges: (resolvedInitial.college_ids ?? []).map((id) => ({ id, name: id })),
    selectedUsers: (() => {
      if (resolvedInitial.selected_students?.length) {
        return resolvedInitial.selected_students.map((s) => ({
          id: s.id,
          user_id: s.user_id ?? s.id,
          name: s.full_name?.trim() || s.email,
          email: s.email,
          college_id: s.college_id,
          college_name: s.college_name,
        }));
      }
      if (resolvedInitial.selected_admins?.length) {
        return resolvedInitial.selected_admins.map((a) => ({
          id: a.id,
          user_id: a.user_id ?? a.id,
          name: a.full_name?.trim() || a.email,
          email: a.email,
          college_id: a.college_id,
          college_name: a.college_name,
        }));
      }
      return [];
    })(),
  });
  const [{ userSearchLoading, previewLoading, error }, uiDispatch] = useReducer(
    (state: { userSearchLoading: boolean; previewLoading: boolean; error: string | null }, action: { type: string; payload?: unknown }) => {
      switch (action.type) {
        case 'USER_SEARCH_START': return { ...state, userSearchLoading: true };
        case 'USER_SEARCH_END': return { ...state, userSearchLoading: false };
        case 'PREVIEW_LOADING': return { ...state, previewLoading: true, error: null };
        case 'PREVIEW_DONE': return { ...state, previewLoading: false };
        case 'SET_ERROR': return { ...state, error: action.payload as string };
        case 'CLEAR_ERROR': return { ...state, error: null };
        default: return state;
      }
    },
    { userSearchLoading: false, previewLoading: false, error: null }
  );
  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const onConfigChange = useCallback((config: AudienceConfig) => {
    onConfigChangeProp?.(config);
  }, [onConfigChangeProp]);

  useEffect(() => {
    if (colleges.length === 0 && (config.type === 'specific_college_students' || config.type === 'specific_college_admins')) {
      listCollegesForAudienceAction().then((r) => {
        if (r.ok && r.colleges) setColleges(r.colleges);
      });
    }
  }, [config.type, colleges.length]);

  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const loadPreview = useCallback(async () => {
    uiDispatch({ type: 'PREVIEW_LOADING' });
    const result = await previewAudienceAction(campaignId, JSON.stringify(config));
    if (result.ok && result.preview) {
      setPreview(result.preview);
    } else {
      uiDispatch({ type: 'SET_ERROR', payload: result.error ?? 'Failed to load preview' });
      setPreview(null);
    }
    uiDispatch({ type: 'PREVIEW_DONE' });
  }, [campaignId, config]);

  const handleTypeChange = useCallback((type: AudienceType) => {
    audienceDispatch({ type: 'SET_TYPE', payload: type });
  }, []);

  const handleCustomModeChange = useCallback((mode: CustomAudienceMode) => {
    audienceDispatch({ type: 'SET_CUSTOM_MODE', payload: mode });
  }, []);

  const handleManualEmailsChange = useCallback((value: string) => {
    audienceDispatch({ type: 'SET_MANUAL_EMAILS', payload: value });
  }, []);

  const customMode: CustomAudienceMode =
    config.custom_audience_mode
    ?? (isCustomComposer && config.type === 'manual_emails' ? 'external' : 'platform');

  const externalParse = useMemo(
    () => parseExternalEmailList(manualEmails),
    [manualEmails],
  );

  const typeOptions = isCustomComposer ? platformAudienceTypes : audienceTypes;

  const toggleCollege = useCallback((college: CollegeOption) => {
    audienceDispatch({ type: 'TOGGLE_COLLEGE', payload: college });
  }, []);

  const toggleUser = useCallback((user: UserOption) => {
    audienceDispatch({ type: 'TOGGLE_USER', payload: user });
  }, []);

  useEffect(() => {
    const role = config.type === 'individual_college_admins' ? 'college_admin' : 'student';
    const timer = setTimeout(() => {
      if (!userSearch.trim() || userSearch.length < 2) {
        setUserResults([]);
        uiDispatch({ type: 'USER_SEARCH_END' });
        return;
      }
      uiDispatch({ type: 'USER_SEARCH_START' });
      searchUsersForAudienceAction(userSearch, role).then((r) => {
        if (r.ok && r.users) setUserResults(r.users);
        uiDispatch({ type: 'USER_SEARCH_END' });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, config.type]);

  const selectedCollegeIdSet = useMemo(() => new Set(selectedColleges.map((c) => c.id)), [selectedColleges]);
  const selectedUserIdSet = useMemo(() => new Set(selectedUsers.map((u) => u.id)), [selectedUsers]);

  const filteredColleges = colleges.filter(
    (c) => c.name.toLowerCase().includes(collegeSearch.toLowerCase()) || !collegeSearch.trim()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" />
          Audience Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isCustomComposer ? (
          <div className="space-y-2">
            <Label>Audience Mode</Label>
            <div
              role="tablist"
              aria-label="Custom Email audience mode"
              className="grid grid-cols-2 gap-2 rounded-lg border p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={customMode === 'platform'}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  customMode === 'platform'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleCustomModeChange('platform')}
              >
                Platform Audience
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={customMode === 'external'}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  customMode === 'external'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleCustomModeChange('external')}
              >
                External Email Addresses
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {customMode === 'external'
                ? 'Send to arbitrary emails. Recipients do not need LMS accounts. Header shows NextGen CTO only.'
                : 'Send to students or college admins from the platform. College branding is preserved when available.'}
            </p>
          </div>
        ) : null}

        {(!isCustomComposer || customMode === 'platform') ? (
        <div className="space-y-2">
          <Label>Audience Type</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  config.type === value
                    ? 'border-primary bg-primary/10'
                    : 'border-input hover:bg-muted'
                }`}
              >
                <input
                  type="radio"
                  name="audience-type"
                  value={value}
                  checked={config.type === value}
                  onChange={() => handleTypeChange(value)}
                  className="sr-only"
                />
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>
        ) : null}

        {(config.type === 'manual_emails' || (isCustomComposer && customMode === 'external')) ? (
          <div className="space-y-2">
            <Label>
              {isCustomComposer && customMode === 'external'
                ? 'External Email Addresses'
                : 'Email Addresses (one per line)'}
            </Label>
            <textarea
              value={manualEmails}
              onChange={(e) => handleManualEmailsChange(e.target.value)}
              placeholder={'person1@example.com\nperson2@example.com, person3@example.com\nperson4@example.com; person5@example.com'}
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label={
                isCustomComposer && customMode === 'external'
                  ? 'External email addresses'
                  : 'Manual email addresses'
              }
            />
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                Valid: <strong className="text-foreground">{externalParse.validCount}</strong>
                {' / '}
                {MAX_EXTERNAL_EMAIL_RECIPIENTS} max
              </span>
              {externalParse.duplicateCount > 0 ? (
                <span>Duplicates removed: {externalParse.duplicateCount}</span>
              ) : null}
            </div>
            {externalParse.invalidEntries.length > 0 ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                <p className="font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3.5" />
                  Invalid addresses (fix before send)
                </p>
                <ul className="mt-1 list-disc pl-4">
                  {externalParse.invalidEntries.slice(0, 8).map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                  {externalParse.invalidEntries.length > 8 ? (
                    <li>+{externalParse.invalidEntries.length - 8} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            {externalParse.overLimit ? (
              <p className="text-xs text-destructive">
                Too many recipients. Maximum is {MAX_EXTERNAL_EMAIL_RECIPIENTS}.
              </p>
            ) : null}
          </div>
        ) : null}

        {(config.type === 'specific_college_students' || config.type === 'specific_college_admins') ? (
          <div className="space-y-2">
            <Label>Select Colleges</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search colleges..."
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {colleges.length === 0 ? (
              <div className="space-y-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : (
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-1 space-y-0.5">
                  {filteredColleges.map((college) => {
                    const isSelected = selectedCollegeIdSet.has(college.id);
                    return (
                      <button
                        key={college.id}
                        type="button"
                        onClick={() => toggleCollege(college)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="size-3.5" /> : <Building2 className="size-3.5 text-muted-foreground" />}
                        {college.name}
                      </button>
                    );
                  })}
                  {filteredColleges.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No colleges found</p>
                  )}
                </div>
              </ScrollArea>
            )}
            {selectedColleges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedColleges.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1">
                    {c.name}
                    <X className="size-3 cursor-pointer" onClick={() => toggleCollege(c)} />
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {(config.type === 'individual_students' || config.type === 'individual_college_admins') ? (
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email (min 2 chars)..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {userSearchLoading && <Skeleton className="h-20 w-full" />}
            {userResults.length > 0 && !userSearchLoading && (
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-1 space-y-0.5">
                  {userResults.map((user) => {
                    const isSelected = selectedUserIdSet.has(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleUser(user)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="size-3.5" /> : <UserCheck className="size-3.5 text-muted-foreground" />}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            {selectedUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1 max-w-full">
                    <span className="truncate">
                      {u.name}
                      {u.email ? ` * ${u.email}` : ''}
                    </span>
                    <X className="size-3 cursor-pointer shrink-0" onClick={() => toggleUser(u)} />
                  </Badge>
                ))}
              </div>
            ) : null}
            {selectedUsers.some((u) => !u.email?.trim()) ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                One or more selected users have no email. They will be excluded from preview and snapshot.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="button" onClick={loadPreview} disabled={previewLoading} className="gap-2">
            {previewLoading && <Loader2 className="size-4 animate-spin" />}
            Preview Audience
          </Button>
        </div>

        {previewLoading && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <Skeleton className="size-40" />
            <Skeleton className="h-8 w-20" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {preview && !previewLoading && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Raw</p>
                <p className="text-lg font-semibold">{preview.totalRaw}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valid</p>
                <p className="text-lg font-semibold text-green-600">{preview.validCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Suppressed</p>
                <p className="text-lg font-semibold text-amber-600">{preview.suppressedCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duplicates</p>
                <p className="text-lg font-semibold text-orange-600">{preview.duplicateCount}</p>
              </div>
            </div>

            {preview.warnings.length > 0 ? (
              <div className="space-y-1">
                {preview.warnings.map((w) => (
                  <div key={w} className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {preview.sampleRecipients.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Sample Recipients (first {preview.sampleRecipients.length})
                </p>
                <div className="space-y-1">
                  {preview.sampleRecipients.map((r) => (
                    <div key={r.email} className="flex items-center gap-2 text-sm">
                      <Mail className="size-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{r.email}</span>
                      {r.full_name && <span className="text-muted-foreground">({r.full_name})</span>}
                      {r.college_name && <Badge variant="outline" className="text-xs">{r.college_name}</Badge>}
                      <Badge variant="secondary" className="text-xs">{r.recipient_type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {preview.validCount === 0 && !previewLoading && (
              <p className="text-sm text-muted-foreground">No recipients to preview. Select an audience above.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
