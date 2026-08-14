'use client';

import { useMemo, useReducer, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Pencil,
  Trash2,
  ExternalLink,
  CalendarIcon,
  Clock,
  MoreHorizontal,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { MentorshipSessionRecord } from '@/lib/services/job-ready-bootcamp-mentorship';
import {
  cancelMentorshipSessionAction,
  deleteMentorshipSessionAction,
  updateMentorshipSessionAction,
} from './actions';
import { TimePicker } from '@/components/ui/time-picker';
import { MentorshipAudienceSection } from './mentorship-audience-section';
import { loadMentorshipSessionAudienceAction } from './mentorship-audience-actions';
import type { MentorshipAudienceTargetInput } from '@/lib/services/mentorship-audience-types';

function formatTimeRange(start: string, end: string): string {
  const trim = (t: string) => String(t).slice(0, 5);
  return `${trim(start)} – ${trim(end)} IST`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toDateString() === new Date().toDateString();
}

function isPast(dateStr: string): boolean {
  return new Date(`${dateStr}T23:59:59`) < new Date();
}

function isLiveNow(session: MentorshipSessionRecord): boolean {
  if (!isToday(session.session_date)) return false;
  const now = new Date();
  const [sh, sm] = String(session.start_time_ist).split(':').map(Number);
  const [eh, em] = String(session.end_time_ist).split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
}

function timeStatusBadge(session: MentorshipSessionRecord) {
  if (session.status === 'cancelled') {
    return (
      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
        Cancelled
      </span>
    );
  }
  if (isLiveNow(session)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        Live Now
      </span>
    );
  }
  if (isPast(session.session_date)) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Past
      </span>
    );
  }
  if (isToday(session.session_date)) {
    return (
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
        Today
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      Upcoming
    </span>
  );
}

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

const STATUS_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'scheduled' as const, label: 'Scheduled' },
  { value: 'cancelled' as const, label: 'Cancelled' },
] as const;

interface MentorshipPageClientProps {
  sessions: MentorshipSessionRecord[];
  recipientCounts: Record<string, number>;
  currentPage: number;
  totalPages: number;
  total: number;
}

interface EditDialogState {
  editingSession: MentorshipSessionRecord | null;
  sessionDay: string;
  editSelectedDate: Date | undefined;
  editDateOpen: boolean;
  startTime: string;
  endTime: string;
  editAudienceChips: Array<{ key: string; targetType: MentorshipAudienceTargetInput['targetType']; targetId?: string | null; label: string }>;
  editAudienceTargets: MentorshipAudienceTargetInput[];
  editEmailsLocked: boolean;
  editRecipientCount: number;
  loadingEditAudience: boolean;
}

type EditDialogAction =
  | { type: 'OPEN_EDIT'; session: MentorshipSessionRecord }
  | { type: 'SET_DATE'; date: Date | undefined; dayName: string }
  | { type: 'SET_DATE_OPEN'; open: boolean }
  | { type: 'SET_START_TIME'; time: string }
  | { type: 'SET_END_TIME'; time: string }
  | { type: 'LOAD_AUDIENCE_START' }
  | { type: 'LOAD_AUDIENCE_DONE'; chips: EditDialogState['editAudienceChips']; targets: MentorshipAudienceTargetInput[]; emailsLocked: boolean; recipientCount: number }
  | { type: 'SET_AUDIENCE_CHIPS'; chips: EditDialogState['editAudienceChips'] }
  | { type: 'SET_AUDIENCE_TARGETS'; targets: MentorshipAudienceTargetInput[] }
  | { type: 'CLOSE_EDIT' };

const initialEditDialogState: EditDialogState = {
  editingSession: null,
  sessionDay: '',
  editSelectedDate: undefined,
  editDateOpen: false,
  startTime: '',
  endTime: '',
  editAudienceChips: [],
  editAudienceTargets: [],
  editEmailsLocked: false,
  editRecipientCount: 0,
  loadingEditAudience: false,
};

function editDialogReducer(state: EditDialogState, action: EditDialogAction): EditDialogState {
  switch (action.type) {
    case 'OPEN_EDIT': {
      const session = action.session;
      let editSelectedDate: Date | undefined;
      const dateParts = session.session_date.split('-');
      if (dateParts.length === 3) {
        const [year, month, day] = dateParts;
        editSelectedDate = new Date(Number(year), Number(month) - 1, Number(day));
      }
      return {
        ...state,
        editingSession: session,
        sessionDay: session.session_day,
        editSelectedDate,
        startTime: String(session.start_time_ist).slice(0, 5),
        endTime: String(session.end_time_ist).slice(0, 5),
        editAudienceChips: [],
        editAudienceTargets: [],
        editEmailsLocked: false,
        editRecipientCount: 0,
        loadingEditAudience: true,
      };
    }
    case 'SET_DATE':
      return { ...state, editSelectedDate: action.date, sessionDay: action.dayName, editDateOpen: false };
    case 'SET_DATE_OPEN':
      return { ...state, editDateOpen: action.open };
    case 'SET_START_TIME':
      return { ...state, startTime: action.time };
    case 'SET_END_TIME':
      return { ...state, endTime: action.time };
    case 'LOAD_AUDIENCE_START':
      return { ...state, loadingEditAudience: true };
    case 'LOAD_AUDIENCE_DONE':
      return {
        ...state,
        loadingEditAudience: false,
        editAudienceChips: action.chips,
        editAudienceTargets: action.targets,
        editEmailsLocked: action.emailsLocked,
        editRecipientCount: action.recipientCount,
      };
    case 'SET_AUDIENCE_CHIPS':
      return { ...state, editAudienceChips: action.chips };
    case 'SET_AUDIENCE_TARGETS':
      return { ...state, editAudienceTargets: action.targets };
    case 'CLOSE_EDIT':
      return initialEditDialogState;
  }
}

function SessionTableRow({
  session,
  idx,
  recipientCounts,
  isScheduled,
  openEdit,
  setRemovingSession,
  setDeletingSession,
}: {
  session: MentorshipSessionRecord;
  idx: number;
  recipientCounts: Record<string, number>;
  isScheduled: boolean;
  openEdit: (s: MentorshipSessionRecord) => void;
  setRemovingSession: (s: MentorshipSessionRecord) => void;
  setDeletingSession: (s: MentorshipSessionRecord) => void;
}) {
  const relative = formatRelativeDate(session.session_date);
  return (
    <TableRow
      key={session.id}
      className={cn(
        'border-b border-border/30 last:border-b-0 transition-colors',
        'hover:bg-muted/40',
        idx % 2 === 1 && 'bg-muted/15',
      )}
    >
      <TableCell className="pl-5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[280px]">{session.title}</p>
          {session.description ? (
            <p className="text-[11px] text-muted-foreground truncate max-w-[280px] mt-0.5">
              {session.description}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm tabular-nums">{session.session_date}</p>
            <p className="text-[11px] text-muted-foreground">{relative}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm tabular-nums">{formatTimeRange(session.start_time_ist, session.end_time_ist)}</span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <span className="text-sm tabular-nums font-medium">
          {recipientCounts[session.id] ?? 0}
        </span>
      </TableCell>
      <TableCell className="py-3">{timeStatusBadge(session)}</TableCell>
      <TableCell className="pr-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More actions</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => window.open(session.meeting_url, '_blank')}
              >
                <ExternalLink className="size-3.5 mr-2" />
                Open meeting link
              </DropdownMenuItem>
              {isScheduled && (
                <DropdownMenuItem onClick={() => openEdit(session)}>
                  <Pencil className="size-3.5 mr-2" />
                  Edit session
                </DropdownMenuItem>
              )}
              {isScheduled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setRemovingSession(session)}
                  >
                    <Trash2 className="size-3.5 mr-2" />
                    Cancel session
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => setDeletingSession(session)}
            className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete session"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EditSessionDialog({
  editingSession,
  editDefaults,
  sessionDay,
  editSelectedDate,
  editDateOpen,
  startTime,
  endTime,
  editAudienceChips,
  editAudienceTargets: _editAudienceTargets,
  editEmailsLocked,
  editRecipientCount,
  loadingEditAudience,
  isPending,
  editDispatch,
  handleEditDateSelect,
  closeEdit,
  onFormSubmit,
}: {
  editingSession: MentorshipSessionRecord | null;
  editDefaults: { title: string; sessionDate: string; sessionDay: string; startTime: string; endTime: string; meetingUrl: string; description: string } | null;
  sessionDay: string;
  editSelectedDate: Date | undefined;
  editDateOpen: boolean;
  startTime: string;
  endTime: string;
  editAudienceChips: EditDialogState['editAudienceChips'];
  editAudienceTargets: MentorshipAudienceTargetInput[];
  editEmailsLocked: boolean;
  editRecipientCount: number;
  loadingEditAudience: boolean;
  isPending: boolean;
  editDispatch: React.Dispatch<EditDialogAction>;
  handleEditDateSelect: (date: Date | undefined) => void;
  closeEdit: () => void;
  onFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={!!editingSession} onOpenChange={(open) => !open && closeEdit()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit mentorship session</DialogTitle>
        </DialogHeader>
        {editingSession && editDefaults ? (
          <form
            className="space-y-4"
            onSubmit={onFormSubmit}
          >
            <input type="hidden" name="session_id" value={editingSession.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="edit-title">Title</label>
                <Input
                  id="edit-title"
                  name="title"
                  required
                  defaultValue={editDefaults.title}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit-session_date">Date</label>
                <input
                  type="hidden"
                  name="session_date"
                  value={editSelectedDate ? format(editSelectedDate, 'MM/dd/yyyy') : ''}
                  required
                />
                <Popover open={editDateOpen} onOpenChange={(open) => editDispatch({ type: 'SET_DATE_OPEN', open })}>
                  <PopoverTrigger asChild>
                    <Button
                      id="edit-session_date"
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-10',
                        !editSelectedDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {editSelectedDate ? format(editSelectedDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editSelectedDate}
                      onSelect={handleEditDateSelect}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit-session_day">Day</label>
                <Input
                  id="edit-session_day"
                  name="session_day"
                  required
                  value={sessionDay || editDefaults.sessionDay}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit-start_time">Start time (IST)</label>
                <input type="hidden" name="start_time_ist" value={startTime} required />
                <TimePicker value={startTime} onChange={(time) => editDispatch({ type: 'SET_START_TIME', time })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit-end_time">End time (IST)</label>
                <input type="hidden" name="end_time_ist" value={endTime} required />
                <TimePicker value={endTime} onChange={(time) => editDispatch({ type: 'SET_END_TIME', time })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="edit-meeting_url">Zoom / Meet link</label>
                <Input
                  id="edit-meeting_url"
                  name="meeting_url"
                  type="url"
                  required
                  defaultValue={editDefaults.meetingUrl}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="edit-description">Description (optional)</label>
                <Textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  defaultValue={editDefaults.description}
                />
              </div>
            </div>

            {loadingEditAudience ? (
              <p className="text-sm text-muted-foreground">Loading audience…</p>
            ) : (
              <MentorshipAudienceSection
                initialChips={editAudienceChips}
                onTargetsChange={(targets) => editDispatch({ type: 'SET_AUDIENCE_TARGETS', targets })}
                emailsLocked={editEmailsLocked}
                lockedMessage={
                  editEmailsLocked
                    ? editRecipientCount +
                      ' student' +
                      (editRecipientCount === 1 ? '' : 's') +
                      ' already received or queued invite emails. Audience cannot be changed.'
                    : undefined
                }
                disabled={isPending}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving\u2026' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CancelSessionDialog({
  removingSession,
  setRemovingSession,
  isPending,
  onConfirm,
}: {
  removingSession: MentorshipSessionRecord | null;
  setRemovingSession: (s: MentorshipSessionRecord | null) => void;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={!!removingSession}
      onOpenChange={(open) => !open && setRemovingSession(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel mentorship session?</AlertDialogTitle>
          <AlertDialogDescription>
            {removingSession
              ? removingSession.title +
                ' will be cancelled and hidden from selected student dashboards. This does not send a cancellation email.'
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep session</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? 'Cancelling…' : 'Cancel session'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteSessionDialog({
  deletingSession,
  setDeletingSession,
  isPending,
  onConfirm,
}: {
  deletingSession: MentorshipSessionRecord | null;
  setDeletingSession: (s: MentorshipSessionRecord | null) => void;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={!!deletingSession}
      onOpenChange={(open) => !open && setDeletingSession(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete session permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            {deletingSession
              ? deletingSession.title +
                ' will be permanently removed from the database. This action cannot be undone.'
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MentorshipPageClient({
  sessions,
  recipientCounts,
  currentPage,
  totalPages,
  total,
}: MentorshipPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editState, editDispatch] = useReducer(editDialogReducer, initialEditDialogState);
  const {
    editingSession,
    sessionDay,
    editSelectedDate,
    editDateOpen,
    startTime,
    endTime,
    editAudienceChips,
    editAudienceTargets,
    editEmailsLocked,
    editRecipientCount,
    loadingEditAudience,
  } = editState;
  const [removingSession, setRemovingSession] = useState<MentorshipSessionRecord | null>(null);
  const [deletingSession, setDeletingSession] = useState<MentorshipSessionRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const editDefaults = useMemo(() => {
    if (!editingSession) return null;
    return {
      title: editingSession.title,
      sessionDate: editingSession.session_date,
      sessionDay: editingSession.session_day,
      startTime: String(editingSession.start_time_ist).slice(0, 5),
      endTime: String(editingSession.end_time_ist).slice(0, 5),
      meetingUrl: editingSession.meeting_url,
      description: editingSession.description ?? '',
    };
  }, [editingSession]);

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [sessions, statusFilter, searchQuery]);

  function openEdit(session: MentorshipSessionRecord) {
    editDispatch({ type: 'OPEN_EDIT', session });
    void loadMentorshipSessionAudienceAction(session.id).then((result) => {
      if (result.ok) {
        editDispatch({
          type: 'LOAD_AUDIENCE_DONE',
          chips: result.chips,
          targets: result.targets,
          emailsLocked: result.emailsLocked,
          recipientCount: result.recipientCount,
        });
      } else {
        editDispatch({ type: 'LOAD_AUDIENCE_START' });
      }
    });
  }

  function closeEdit() {
    editDispatch({ type: 'CLOSE_EDIT' });
  }

  function handleEditDateSelect(date: Date | undefined) {
    const dayName = date
      ? date.toLocaleDateString('en-IN', { weekday: 'long' })
      : '';
    editDispatch({ type: 'SET_DATE', date, dayName });
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <>
      {/* Sessions Table */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {/* Toolbar: search + filters */}
        <div className="flex flex-col gap-3 px-5 py-3 border-b border-border/40 bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">
              {filteredSessions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions…"
                className="h-8 w-48 pl-8 text-xs"
              />
            </div>
            {/* Status filter */}
            <div className="flex items-center rounded-lg border border-border/60 bg-background p-0.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    statusFilter === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-medium text-foreground">No sessions scheduled yet</p>
            <p className="text-xs text-muted-foreground mt-1">Schedule your first mentorship session above.</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="mx-auto size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No sessions match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  <TableHead className="h-10 pl-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session</TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recipients</TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="h-10 w-24 text-right pr-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session, idx) => (
                  <SessionTableRow
                    key={session.id}
                    session={session}
                    idx={idx}
                    recipientCounts={recipientCounts}
                    isScheduled={session.status === 'scheduled'}
                    openEdit={openEdit}
                    setRemovingSession={setRemovingSession}
                    setDeletingSession={setDeletingSession}
                  />
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * 15 + 1}–{Math.min(currentPage * 15, total)} of {total}
                </span>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      {hasPrev ? (
                        <PaginationPrevious href={`/mentorship?page=${currentPage - 1}`} />
                      ) : (
                        <PaginationPrevious href="#" className="pointer-events-none opacity-50" />
                      )}
                    </PaginationItem>
                    {getPageRange(currentPage, totalPages).map((p) =>
                      p === 'ellipsis' ? (
                        <PaginationItem key="ellipsis">
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href={`/mentorship?page=${p}`}
                            isActive={p === currentPage}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      {hasNext ? (
                        <PaginationNext href={`/mentorship?page=${currentPage + 1}`} />
                      ) : (
                        <PaginationNext href="#" className="pointer-events-none opacity-50" />
                      )}
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <EditSessionDialog
        editingSession={editingSession}
        editDefaults={editDefaults}
        sessionDay={sessionDay}
        editSelectedDate={editSelectedDate}
        editDateOpen={editDateOpen}
        startTime={startTime}
        endTime={endTime}
        editAudienceChips={editAudienceChips}
        editAudienceTargets={editAudienceTargets}
        editEmailsLocked={editEmailsLocked}
        editRecipientCount={editRecipientCount}
        loadingEditAudience={loadingEditAudience}
        isPending={isPending}
        editDispatch={editDispatch}
        handleEditDateSelect={handleEditDateSelect}
        closeEdit={closeEdit}
        onFormSubmit={(event) => {
          event.preventDefault();
          if (!editingSession) return;
          const form = event.currentTarget;
          const formData = new FormData(form);
          formData.set('session_id', editingSession.id);
          formData.set('start_time_ist', startTime);
          formData.set('end_time_ist', endTime);
          if (editAudienceTargets.length > 0) {
            formData.set('audience_targets', JSON.stringify(editAudienceTargets));
          }
          startTransition(async () => {
            const result = await updateMentorshipSessionAction(formData);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success('Session updated. Changes will appear on selected student dashboards.');
            closeEdit();
            router.refresh();
          });
        }}
      />

      {/* Cancel AlertDialog */}
      <CancelSessionDialog
        removingSession={removingSession}
        setRemovingSession={setRemovingSession}
        isPending={isPending}
        onConfirm={() => {
          if (!removingSession) return;
          startTransition(async () => {
            const result = await cancelMentorshipSessionAction(removingSession.id);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success('Session cancelled.');
            setRemovingSession(null);
            router.refresh();
          });
        }}
      />

      {/* Delete permanently AlertDialog */}
      <DeleteSessionDialog
        deletingSession={deletingSession}
        setDeletingSession={setDeletingSession}
        isPending={isPending}
        onConfirm={() => {
          if (!deletingSession) return;
          startTransition(async () => {
            const result = await deleteMentorshipSessionAction(deletingSession.id);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success('Session permanently deleted.');
            setDeletingSession(null);
            router.refresh();
          });
        }}
      />
    </>
  );
}
